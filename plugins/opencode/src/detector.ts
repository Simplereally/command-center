import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

import type { OpencodeInstance, OpencodeConfig } from './types.js';

const DEFAULT_OPENCODE_DIR = '.opencode';

function getOpencodeDir(): string {
  return join(homedir(), DEFAULT_OPENCODE_DIR);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readPidFromFile(pidFilePath: string): Promise<number | null> {
  try {
    const content = await readFile(pidFilePath, 'utf-8');
    const pid = Number.parseInt(content.trim(), 10);
    return Number.isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

async function isProcessRunning(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function getProcessStartTime(pid: number): Promise<Date | null> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';

    let cmd: string;
    if (isMac) {
      cmd = `ps -p ${pid} -o lstart=`;
    } else if (isLinux) {
      cmd = `ps -p ${pid} -o lstart=`;
    } else {
      return null;
    }

    const { stdout } = await execAsync(cmd);
    const dateStr = stdout.trim();
    if (!dateStr) return null;

    const parsedDate = new Date(dateStr);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  } catch {
    return null;
  }
}

function getSocketId(socketPath: string): string {
  const basename = socketPath.split('/').pop();
  return basename ?? socketPath;
}

async function detectSocketInstances(opencodeDir: string): Promise<OpencodeInstance[]> {
  const instances: OpencodeInstance[] = [];

  try {
    const files = await readdir(opencodeDir);

    for (const file of files) {
      if (!file.endsWith('.sock') && !file.endsWith('.socket')) continue;

      const socketPath = join(opencodeDir, file);
      const pidFilePath = join(opencodeDir, `${file}.pid`);

      let pid: number | null = null;
      let startedAt: Date | null = null;

      if (await fileExists(pidFilePath)) {
        pid = await readPidFromFile(pidFilePath);
        if (pid !== null) {
          const running = await isProcessRunning(pid);
          if (!running) {
            instances.push({
              id: getSocketId(socketPath),
              socketPath,
              pid,
              workingDir: null,
              startedAt: null,
              active: false,
            });
            continue;
          }
          startedAt = await getProcessStartTime(pid);
        }
      } else {
        try {
          const stats = await stat(socketPath);
          startedAt = stats.birthtime || stats.mtime;
        } catch {
          continue;
        }
      }

      instances.push({
        id: getSocketId(socketPath),
        socketPath,
        pid,
        workingDir: null,
        startedAt,
        active: pid !== null ? await isProcessRunning(pid) : false,
      });
    }
  } catch {
    // Directory doesn't exist or is not accessible
  }

  return instances;
}

async function detectPidFileInstances(opencodeDir: string): Promise<OpencodeInstance[]> {
  const instances: OpencodeInstance[] = [];

  try {
    const files = await readdir(opencodeDir);

    for (const file of files) {
      if (!file.endsWith('.pid')) continue;

      const pidFilePath = join(opencodeDir, file);
      const pid = await readPidFromFile(pidFilePath);

      if (pid === null) continue;

      const running = await isProcessRunning(pid);
      if (!running) continue;

      const socketFileName = file.replace(/\.pid$/, '.sock');
      const socketPath = join(opencodeDir, socketFileName);
      const socketExists = await fileExists(socketPath);

      const startedAt = await getProcessStartTime(pid);

      instances.push({
        id: String(pid),
        socketPath: socketExists ? socketPath : null,
        pid,
        workingDir: null,
        startedAt,
        active: true,
      });
    }
  } catch {
    // Directory doesn't exist or is not accessible
  }

  return instances;
}

export async function detectRunningInstances(): Promise<OpencodeInstance[]> {
  const opencodeDir = getOpencodeDir();

  if (!(await fileExists(opencodeDir))) {
    return [];
  }

  const [socketInstances, pidInstances] = await Promise.all([
    detectSocketInstances(opencodeDir),
    detectPidFileInstances(opencodeDir),
  ]);

  const instanceMap = new Map<string, OpencodeInstance>();

  for (const instance of socketInstances) {
    instanceMap.set(instance.id, instance);
  }

  for (const instance of pidInstances) {
    const existing = instanceMap.get(instance.id);
    if (existing) {
      if (instance.active && !existing.active) {
        instanceMap.set(instance.id, instance);
      }
    } else {
      instanceMap.set(instance.id, instance);
    }
  }

  return Array.from(instanceMap.values());
}

export async function parseOpencodeConfig(): Promise<OpencodeConfig> {
  const opencodeDir = getOpencodeDir();
  const config: OpencodeConfig = {
    configDir: opencodeDir,
    socketPath: null,
    pidFile: null,
    logFile: null,
    options: {},
  };

  if (!(await fileExists(opencodeDir))) {
    return config;
  }

  try {
    const files = await readdir(opencodeDir);

    for (const file of files) {
      if (file.endsWith('.sock') || file.endsWith('.socket')) {
        config.socketPath = join(opencodeDir, file);
      } else if (file.endsWith('.pid')) {
        config.pidFile = join(opencodeDir, file);
      } else if (file.endsWith('.log')) {
        config.logFile = join(opencodeDir, file);
      }
    }

    const configFilePath = join(opencodeDir, 'config.json');
    if (await fileExists(configFilePath)) {
      try {
        const content = await readFile(configFilePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          for (const [key, value] of Object.entries(parsed)) {
            if (typeof key === 'string' && typeof value === 'string') {
              config.options[key] = value;
            }
          }
        }
      } catch {
        // Invalid JSON config, ignore
      }
    }
  } catch {
    // Directory not accessible
  }

  return config;
}
