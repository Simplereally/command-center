import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TmuxClient } from './client.js';
import { TmuxError } from './errors.js';

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { exec } from 'child_process';

const mockExec = vi.mocked(exec);

function mockExecSuccess(stdout: string): void {
  mockExec.mockImplementation((_cmd, cb) => {
    const callback = cb as (err: null, result: { stdout: string; stderr: string }) => void;
    callback(null, { stdout, stderr: '' });
    return undefined as unknown as ReturnType<typeof exec>;
  });
}

function mockExecFailure(stderr: string, code = 1): void {
  mockExec.mockImplementation((_cmd, cb) => {
    const callback = cb as (err: { code: number; stderr: string } | null) => void;
    callback({ code, stderr });
    return undefined as unknown as ReturnType<typeof exec>;
  });
}

describe('TmuxClient', () => {
  let client: TmuxClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new TmuxClient();
  });

  describe('listSessions', () => {
    it('parses session output correctly', async () => {
      mockExecSuccess(
        '$0|main|1700000000|1\n$1|dev|1700000100|0\n',
      );

      const sessions = await client.listSessions();

      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toEqual({
        id: '$0',
        name: 'main',
        windows: [],
        createdAt: new Date(1700000000 * 1000),
        attached: true,
      });
      expect(sessions[1]).toEqual({
        id: '$1',
        name: 'dev',
        windows: [],
        createdAt: new Date(1700000100 * 1000),
        attached: false,
      });
    });

    it('returns empty array for no sessions', async () => {
      mockExecSuccess('');

      const sessions = await client.listSessions();

      expect(sessions).toHaveLength(0);
    });

    it('throws TmuxError on failure', async () => {
      mockExecFailure('no server running');

      await expect(client.listSessions()).rejects.toThrow(TmuxError);
    });
  });

  describe('createSession', () => {
    it('creates a session and returns it', async () => {
      mockExec
        .mockImplementationOnce((_cmd, cb) => {
          const callback = cb as (err: null, result: { stdout: string; stderr: string }) => void;
          callback(null, { stdout: '', stderr: '' });
          return undefined as unknown as ReturnType<typeof exec>;
        })
        .mockImplementationOnce((_cmd, cb) => {
          const callback = cb as (err: null, result: { stdout: string; stderr: string }) => void;
          callback(null, { stdout: '$0|my-session|1700000000|0\n', stderr: '' });
          return undefined as unknown as ReturnType<typeof exec>;
        });

      const session = await client.createSession('my-session');

      expect(session.name).toBe('my-session');
      expect(session.id).toBe('$0');
    });

    it('creates a session with a command', async () => {
      mockExec
        .mockImplementationOnce((_cmd, cb) => {
          const callback = cb as (err: null, result: { stdout: string; stderr: string }) => void;
          callback(null, { stdout: '', stderr: '' });
          return undefined as unknown as ReturnType<typeof exec>;
        })
        .mockImplementationOnce((_cmd, cb) => {
          const callback = cb as (err: null, result: { stdout: string; stderr: string }) => void;
          callback(null, { stdout: '$0|work|1700000000|0\n', stderr: '' });
          return undefined as unknown as ReturnType<typeof exec>;
        });

      const session = await client.createSession('work', 'bash');

      expect(session.name).toBe('work');
      expect(mockExec).toHaveBeenCalledTimes(2);
    });
  });

  describe('killSession', () => {
    it('calls kill-session with correct target', async () => {
      mockExecSuccess('');

      await client.killSession('$0');

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('kill-session -t $0'),
        expect.any(Function),
      );
    });

    it('throws TmuxError on failure', async () => {
      mockExecFailure('session not found: $99');

      await expect(client.killSession('$99')).rejects.toThrow(TmuxError);
    });
  });

  describe('sendKeys', () => {
    it('sends keys followed by Enter', async () => {
      mockExecSuccess('');

      await client.sendKeys('$0', 'ls -la');

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("send-keys -t $0 'ls -la' Enter"),
        expect.any(Function),
      );
    });
  });

  describe('capturePane', () => {
    it('captures pane content', async () => {
      mockExecSuccess('hello world\n');

      const content = await client.capturePane('$0');

      expect(content).toBe('hello world\n');
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('capture-pane -t $0 -p'),
        expect.any(Function),
      );
    });

    it('captures specific pane', async () => {
      mockExecSuccess('pane content\n');

      await client.capturePane('$0', '%1');

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('capture-pane -t $0:%1 -p'),
        expect.any(Function),
      );
    });
  });

  describe('listWindows', () => {
    it('parses window output correctly', async () => {
      mockExecSuccess('0|editor|1\n1|terminal|0\n');

      const windows = await client.listWindows('$0');

      expect(windows).toHaveLength(2);
      expect(windows[0]).toEqual({
        index: 0,
        name: 'editor',
        panes: [],
        active: true,
      });
      expect(windows[1]).toEqual({
        index: 1,
        name: 'terminal',
        panes: [],
        active: false,
      });
    });
  });

  describe('listPanes', () => {
    it('parses pane output correctly', async () => {
      mockExecSuccess('%0|0|80|24|1|bash|12345\n%1|1|80|24|0|vim|12346\n');

      const panes = await client.listPanes('$0', '0');

      expect(panes).toHaveLength(2);
      expect(panes[0]).toEqual({
        id: '%0',
        index: 0,
        width: 80,
        height: 24,
        active: true,
        command: 'bash',
        pid: 12345,
      });
      expect(panes[1]).toEqual({
        id: '%1',
        index: 1,
        width: 80,
        height: 24,
        active: false,
        command: 'vim',
        pid: 12346,
      });
    });
  });

  describe('sessionExists', () => {
    it('returns true when session exists', async () => {
      mockExecSuccess('');

      const exists = await client.sessionExists('$0');

      expect(exists).toBe(true);
    });

    it('returns false when session does not exist', async () => {
      mockExecFailure('session not found');

      const exists = await client.sessionExists('$99');

      expect(exists).toBe(false);
    });
  });

  describe('socket options', () => {
    it('includes socket name in commands', async () => {
      const socketClient = new TmuxClient({ socketName: 'my-socket' });
      mockExecSuccess('');

      await socketClient.listSessions();

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('-L my-socket'),
        expect.any(Function),
      );
    });

    it('includes socket path in commands', async () => {
      const socketClient = new TmuxClient({ socketPath: '/tmp/tmux-sock' });
      mockExecSuccess('');

      await socketClient.listSessions();

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('-S /tmp/tmux-sock'),
        expect.any(Function),
      );
    });

    it('includes config path in commands', async () => {
      const configClient = new TmuxClient({ configPath: '/etc/tmux.conf' });
      mockExecSuccess('');

      await configClient.listSessions();

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('-f /etc/tmux.conf'),
        expect.any(Function),
      );
    });
  });
});

describe('TmuxError', () => {
  it('formats error message correctly', () => {
    const error = new TmuxError('tmux list-sessions', 1, 'no server running');

    expect(error.name).toBe('TmuxError');
    expect(error.command).toBe('tmux list-sessions');
    expect(error.exitCode).toBe(1);
    expect(error.stderr).toBe('no server running');
    expect(error.message).toBe(
      'tmux command failed: tmux list-sessions (exit 1): no server running',
    );
  });
});
