import type { TmuxSession, TmuxWindow, TmuxPane } from './types.js';

/**
 * Parse tmux list-sessions output with pipe-delimited format:
 * session_id|session_name|session_created_timestamp|session_attached
 */
export function parseSessions(output: string): TmuxSession[] {
  const lines = output.trim().split('\n').filter((line) => line.length > 0);
  return lines.map((line) => {
    const parts = line.split('|');
    const id = parts[0] ?? '';
    const name = parts[1] ?? '';
    const createdTimestamp = Number(parts[2] ?? '0');
    const attached = parts[3] === '1';

    return {
      id,
      name,
      windows: [],
      createdAt: new Date(createdTimestamp * 1000),
      attached,
    };
  });
}

/**
 * Parse tmux list-windows output with pipe-delimited format:
 * window_index|window_name|window_active
 */
export function parseWindows(output: string): TmuxWindow[] {
  const lines = output.trim().split('\n').filter((line) => line.length > 0);
  return lines.map((line) => {
    const parts = line.split('|');
    const index = Number(parts[0] ?? '0');
    const name = parts[1] ?? '';
    const active = parts[2] === '1';

    return {
      index,
      name,
      panes: [],
      active,
    };
  });
}

/**
 * Parse tmux list-panes output with pipe-delimited format:
 * pane_id|pane_index|pane_width|pane_height|pane_active|pane_current_command|pane_pid
 */
export function parsePanes(output: string): TmuxPane[] {
  const lines = output.trim().split('\n').filter((line) => line.length > 0);
  return lines.map((line) => {
    const parts = line.split('|');
    const id = parts[0] ?? '';
    const index = Number(parts[1] ?? '0');
    const width = Number(parts[2] ?? '0');
    const height = Number(parts[3] ?? '0');
    const active = parts[4] === '1';
    const command = parts[5] ?? '';
    const pid = Number(parts[6] ?? '0');

    return {
      id,
      index,
      width,
      height,
      active,
      command,
      pid,
    };
  });
}
