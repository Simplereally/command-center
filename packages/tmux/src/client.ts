import { exec } from 'child_process';
import { promisify } from 'util';
import type { TmuxSession, TmuxWindow, TmuxPane, TmuxClientOptions } from './types.js';
import { TmuxError } from './errors.js';
import { parseSessions, parseWindows, parsePanes } from './parser.js';

const execAsync = promisify(exec);

export class TmuxClient {
  private readonly socketName?: string;
  private readonly socketPath?: string;
  private readonly configPath?: string;

  constructor(options: TmuxClientOptions = {}) {
    this.socketName = options.socketName;
    this.socketPath = options.socketPath;
    this.configPath = options.configPath;
  }

  /**
   * Build the base tmux command with optional socket/config flags.
   */
  private buildBaseCommand(): string {
    let cmd = 'tmux';
    if (this.socketPath) {
      cmd += ` -S ${this.socketPath}`;
    } else if (this.socketName) {
      cmd += ` -L ${this.socketName}`;
    }
    if (this.configPath) {
      cmd += ` -f ${this.configPath}`;
    }
    return cmd;
  }

  /**
   * Execute a tmux command and return stdout.
   * Throws TmuxError on failure.
   */
  private async exec(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(command);
      return stdout;
    } catch (error) {
      const err = error as { code?: number; stderr?: string };
      throw new TmuxError(
        command,
        err.code ?? 1,
        err.stderr ?? 'Unknown error',
      );
    }
  }

  /**
   * List all tmux sessions.
   */
  async listSessions(): Promise<TmuxSession[]> {
    const cmd = `${this.buildBaseCommand()} list-sessions -F '#{session_id}|#{session_name}|#{session_created}|#{session_attached}'`;
    const output = await this.exec(cmd);
    return parseSessions(output);
  }

  /**
   * Create a new detached tmux session.
   */
  async createSession(name: string, command?: string, options?: { startDir?: string }): Promise<TmuxSession> {
    const base = this.buildBaseCommand();
    let cmd = `${base} new-session -d -s ${name}`;
    if (options?.startDir) {
      cmd += ` -c ${options.startDir}`;
    }
    if (command) {
      cmd += ` ${command}`;
    }
    await this.exec(cmd);

    // Fetch the created session details
    const sessions = await this.listSessions();
    const session = sessions.find((s) => s.name === name);
    if (!session) {
      throw new TmuxError(cmd, 1, `Session '${name}' was not found after creation`);
    }
    return session;
  }

  /**
   * Kill a tmux session by its ID (e.g., $0) or name.
   */
  async killSession(sessionId: string): Promise<void> {
    const cmd = `${this.buildBaseCommand()} kill-session -t ${sessionId}`;
    await this.exec(cmd);
  }

  /**
   * Send keys to a tmux session, followed by Enter.
   */
  async sendKeys(sessionId: string, keys: string): Promise<void> {
    const escapedKeys = keys.replace(/'/g, "'\\''");
    const cmd = `${this.buildBaseCommand()} send-keys -t ${sessionId} '${escapedKeys}' Enter`;
    await this.exec(cmd);
  }

  /**
   * Capture the content of a pane.
   */
  async capturePane(sessionId: string, paneId?: string): Promise<string> {
    const base = this.buildBaseCommand();
    const target = paneId ? `${sessionId}:${paneId}` : sessionId;
    const cmd = `${base} capture-pane -t ${target} -p`;
    return this.exec(cmd);
  }

  /**
   * List all windows in a session.
   */
  async listWindows(sessionId: string): Promise<TmuxWindow[]> {
    const cmd = `${this.buildBaseCommand()} list-windows -t ${sessionId} -F '#{window_index}|#{window_name}|#{window_active}'`;
    const output = await this.exec(cmd);
    return parseWindows(output);
  }

  /**
   * List all panes in a window.
   */
  async listPanes(sessionId: string, windowId: string): Promise<TmuxPane[]> {
    const cmd = `${this.buildBaseCommand()} list-panes -t ${sessionId}:${windowId} -F '#{pane_id}|#{pane_index}|#{pane_width}|#{pane_height}|#{pane_active}|#{pane_current_command}|#{pane_pid}'`;
    const output = await this.exec(cmd);
    return parsePanes(output);
  }

  /**
   * Check if a session exists.
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    const cmd = `${this.buildBaseCommand()} has-session -t ${sessionId}`;
    try {
      await this.exec(cmd);
      return true;
    } catch {
      return false;
    }
  }
}
