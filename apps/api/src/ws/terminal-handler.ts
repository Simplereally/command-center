import type { WebSocket } from 'ws';
import { spawn, type ChildProcess } from 'child_process';
import { TmuxClient } from '@command-center/tmux';
import type {
  TerminalInputMessage,
  TerminalResizeMessage,
  TerminalOutputMessage,
  TerminalExitMessage,
  TerminalErrorMessage,
} from '@command-center/shared';

type ClientMessage = TerminalInputMessage | TerminalResizeMessage;

const RESIZE_DEBOUNCE_MS = 100;

interface ConnectionEntry {
  shell: ChildProcess;
  ws: WebSocket;
}

export class TerminalHandler {
  private readonly tmuxClient: TmuxClient;
  private readonly connections: Map<string, Set<ConnectionEntry>> = new Map();
  private readonly resizeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(tmuxClient?: TmuxClient) {
    this.tmuxClient = tmuxClient ?? new TmuxClient();
  }

  async handleConnection(sessionName: string, ws: WebSocket): Promise<void> {
    let exists: boolean;
    try {
      exists = await this.tmuxClient.sessionExists(sessionName);
    } catch (error) {
      const errMsg: TerminalErrorMessage = {
        type: 'terminal:error',
        sessionId: sessionName,
        error: `Failed to check session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      ws.send(JSON.stringify(errMsg));
      ws.close();
      return;
    }

    if (!exists) {
      const errorMsg: TerminalErrorMessage = {
        type: 'terminal:error',
        sessionId: sessionName,
        error: `Session '${sessionName}' not found`,
      };
      ws.send(JSON.stringify(errorMsg));
      ws.close();
      return;
    }

    let shell: ChildProcess;

    try {
      shell = spawn('tmux', ['attach', '-t', sessionName], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, TMUX: undefined, TMUX_PANE: undefined },
      });
    } catch (error) {
      const errMsg: TerminalErrorMessage = {
        type: 'terminal:error',
        sessionId: sessionName,
        error: error instanceof Error ? error.message : 'Failed to spawn shell',
      };
      ws.send(JSON.stringify(errMsg));
      ws.close();
      return;
    }

    const entry: ConnectionEntry = { shell, ws };
    if (!this.connections.has(sessionName)) {
      this.connections.set(sessionName, new Set());
    }
    this.connections.get(sessionName)!.add(entry);

    shell.stdout?.on('data', (data: Buffer) => {
      if (ws.readyState === ws.OPEN) {
        const msg: TerminalOutputMessage = { type: 'terminal:output', sessionId: sessionName, data: data.toString() };
        ws.send(JSON.stringify(msg));
      }
    });

    shell.stderr?.on('data', (data: Buffer) => {
      if (ws.readyState === ws.OPEN) {
        const msg: TerminalOutputMessage = { type: 'terminal:output', sessionId: sessionName, data: data.toString() };
        ws.send(JSON.stringify(msg));
      }
    });

    shell.on('exit', (code: number | null, signal: string | null) => {
      const exitMsg: TerminalExitMessage = {
        type: 'terminal:exit',
        sessionId: sessionName,
        exitCode: code ?? 0,
        signal: signal ?? null,
      };
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(exitMsg));
      }
      this.removeConnection(sessionName, entry);
    });

    shell.on('error', (error: Error) => {
      const errMsg: TerminalErrorMessage = { type: 'terminal:error', sessionId: sessionName, error: error.message };
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(errMsg));
      }
      this.removeConnection(sessionName, entry);
    });

    ws.on('message', (data: Buffer | string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        const errMsg: TerminalErrorMessage = { type: 'terminal:error', sessionId: sessionName, error: 'Invalid JSON message' };
        ws.send(JSON.stringify(errMsg));
        return;
      }

      if (!validateClientMessage(parsed)) {
        const errMsg: TerminalErrorMessage = { type: 'terminal:error', sessionId: sessionName, error: 'Invalid message format' };
        ws.send(JSON.stringify(errMsg));
        return;
      }

      const message: ClientMessage = parsed;

      if (message.type === 'terminal:input' && shell.stdin && !shell.killed) {
        try {
          shell.stdin.write(message.data);
        } catch {
          // stdin may have been closed if the process exited
        }
      } else if (message.type === 'terminal:resize') {
        this.debounceResize(sessionName, message.cols, message.rows);
      }
    });

    const cleanup = () => {
      this.clearResizeTimer(sessionName);
      if (!shell.killed) {
        shell.kill('SIGTERM');
        setTimeout(() => {
          if (!shell.killed) {
            shell.kill('SIGKILL');
          }
        }, 2000);
      }
      this.removeConnection(sessionName, entry);
    };

    ws.on('close', cleanup);
    ws.on('error', cleanup);
  }

  private removeConnection(sessionName: string, entry: ConnectionEntry): void {
    const entries = this.connections.get(sessionName);
    if (entries) {
      entries.delete(entry);
      if (entries.size === 0) {
        this.connections.delete(sessionName);
      }
    }
  }

  private debounceResize(sessionName: string, cols: number, rows: number): void {
    if (cols <= 0 || rows <= 0) return;
    this.clearResizeTimer(sessionName);
    const timer = setTimeout(() => {
      this.resizeTimers.delete(sessionName);
      try {
        spawn('tmux', [
          'resize-pane',
          '-t',
          sessionName,
          '-x',
          String(Math.max(1, Math.floor(cols))),
          '-y',
          String(Math.max(1, Math.floor(rows))),
        ]);
      } catch {
        // tmux session may no longer exist
      }
    }, RESIZE_DEBOUNCE_MS);
    this.resizeTimers.set(sessionName, timer);
  }

  private clearResizeTimer(sessionName: string): void {
    const timer = this.resizeTimers.get(sessionName);
    if (timer) {
      clearTimeout(timer);
      this.resizeTimers.delete(sessionName);
    }
  }

  sendOutput(ws: WebSocket, sessionId: string, data: string): void {
    if (ws.readyState === ws.OPEN) {
      const msg: TerminalOutputMessage = { type: 'terminal:output', sessionId, data };
      ws.send(JSON.stringify(msg));
    }
  }

  sendExit(ws: WebSocket, sessionId: string, code: number): void {
    if (ws.readyState === ws.OPEN) {
      const msg: TerminalExitMessage = { type: 'terminal:exit', sessionId, exitCode: code, signal: null };
      ws.send(JSON.stringify(msg));
    }
  }

  sendError(ws: WebSocket, sessionId: string, error: string): void {
    if (ws.readyState === ws.OPEN) {
      const msg: TerminalErrorMessage = { type: 'terminal:error', sessionId, error };
      ws.send(JSON.stringify(msg));
    }
  }

  killSession(sessionName: string): void {
    this.clearResizeTimer(sessionName);
    const entries = this.connections.get(sessionName);
    if (entries) {
      for (const entry of entries) {
        if (!entry.shell.killed) {
          entry.shell.kill('SIGTERM');
        }
      }
      this.connections.delete(sessionName);
    }
  }

  getActiveSessions(): string[] {
    return Array.from(this.connections.keys());
  }
}

export function validateClientMessage(data: unknown): data is ClientMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if (obj.type === 'terminal:input') {
    return typeof obj.sessionId === 'string' && typeof obj.data === 'string';
  }

  if (obj.type === 'terminal:resize') {
    return (
      typeof obj.sessionId === 'string' &&
      typeof obj.cols === 'number' &&
      typeof obj.rows === 'number'
    );
  }

  return false;
}
