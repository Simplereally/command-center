import type { WebSocket } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import { TmuxClient } from '@command-center/tmux';

interface InputMessage {
  type: 'input';
  data: string;
}

interface ResizeMessage {
  type: 'resize';
  cols: number;
  rows: number;
}

type ClientMessage = InputMessage | ResizeMessage;

interface OutputMessage {
  type: 'output';
  data: string;
}

interface ExitMessage {
  type: 'exit';
  code: number;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

export class TerminalHandler {
  private readonly tmuxClient: TmuxClient;
  private readonly processes: Map<string, ChildProcess> = new Map();

  constructor(tmuxClient?: TmuxClient) {
    this.tmuxClient = tmuxClient ?? new TmuxClient();
  }

  async handleConnection(sessionName: string, ws: WebSocket): Promise<void> {
    const exists = await this.tmuxClient.sessionExists(sessionName);
    if (!exists) {
      const errorMsg: ErrorMessage = {
        type: 'error',
        message: `Session '${sessionName}' not found`,
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
      const errMsg: ErrorMessage = {
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to spawn shell',
      };
      ws.send(JSON.stringify(errMsg));
      ws.close();
      return;
    }

    this.processes.set(sessionName, shell);

    shell.stdout?.on('data', (data: Buffer) => {
      if (ws.readyState === ws.OPEN) {
        const msg: OutputMessage = { type: 'output', data: data.toString() };
        ws.send(JSON.stringify(msg));
      }
    });

    shell.stderr?.on('data', (data: Buffer) => {
      if (ws.readyState === ws.OPEN) {
        const msg: OutputMessage = { type: 'output', data: data.toString() };
        ws.send(JSON.stringify(msg));
      }
    });

    shell.on('exit', (code: number | null) => {
      const exitMsg: ExitMessage = { type: 'exit', code: code ?? 0 };
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(exitMsg));
      }
      this.processes.delete(sessionName);
    });

    shell.on('error', (error: Error) => {
      const errMsg: ErrorMessage = { type: 'error', message: error.message };
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(errMsg));
      }
      this.processes.delete(sessionName);
    });

    ws.on('message', (data: Buffer | string) => {
      let message: ClientMessage;
      try {
        const parsed = JSON.parse(data.toString());
        message = parsed as ClientMessage;
      } catch {
        const errMsg: ErrorMessage = { type: 'error', message: 'Invalid JSON message' };
        ws.send(JSON.stringify(errMsg));
        return;
      }

      if (message.type === 'input' && shell.stdin) {
        shell.stdin.write(message.data);
      } else if (message.type === 'resize') {
        if (typeof message.cols === 'number' && typeof message.rows === 'number') {
          spawn('tmux', [
            'resize-pane',
            '-t',
            sessionName,
            '-x',
            String(message.cols),
            '-y',
            String(message.rows),
          ]);
        }
      }
    });

    ws.on('close', () => {
      this.processes.delete(sessionName);
    });

    ws.on('error', (_error: Error) => {
      this.processes.delete(sessionName);
    });
  }

  sendOutput(ws: WebSocket, data: string): void {
    if (ws.readyState === ws.OPEN) {
      const msg: OutputMessage = { type: 'output', data };
      ws.send(JSON.stringify(msg));
    }
  }

  sendExit(ws: WebSocket, code: number): void {
    if (ws.readyState === ws.OPEN) {
      const msg: ExitMessage = { type: 'exit', code };
      ws.send(JSON.stringify(msg));
    }
  }

  sendError(ws: WebSocket, message: string): void {
    if (ws.readyState === ws.OPEN) {
      const msg: ErrorMessage = { type: 'error', message };
      ws.send(JSON.stringify(msg));
    }
  }

  killSession(sessionName: string): void {
    const process = this.processes.get(sessionName);
    if (process) {
      process.kill();
      this.processes.delete(sessionName);
    }
  }

  getActiveSessions(): string[] {
    return Array.from(this.processes.keys());
  }
}

export function validateClientMessage(data: unknown): data is ClientMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if (obj.type === 'input') {
    return typeof obj.data === 'string';
  }

  if (obj.type === 'resize') {
    return typeof obj.cols === 'number' && typeof obj.rows === 'number';
  }

  return false;
}
