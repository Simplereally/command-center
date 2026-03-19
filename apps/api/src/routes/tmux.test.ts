import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp } from '../app.js';

vi.mock('@command-center/tmux', () => {
  const mockSessions = [
    {
      id: '$0',
      name: 'test-session',
      createdAt: new Date('2024-01-01'),
      attached: false,
      windows: [],
    },
    {
      id: '$1',
      name: 'another-session',
      createdAt: new Date('2024-01-02'),
      attached: true,
      windows: [],
    },
  ];

  return {
    TmuxClient: vi.fn().mockImplementation(() => ({
      listSessions: vi.fn().mockResolvedValue(mockSessions),
      createSession: vi.fn().mockResolvedValue(mockSessions[0]!),
      killSession: vi.fn().mockResolvedValue(undefined),
      sessionExists: vi.fn().mockImplementation((name: string) => {
        return Promise.resolve(name === 'test-session' || name === 'another-session');
      }),
      listWindows: vi
        .fn()
        .mockResolvedValue([{ index: 0, name: 'window-1', active: true, panes: [] }]),
    })),
    TmuxError: class TmuxError extends Error {
      constructor(
        public readonly command: string,
        public readonly exitCode: number,
        public readonly stderr: string,
      ) {
        super(`tmux command failed: ${command} (exit ${exitCode}): ${stderr}`);
        this.name = 'TmuxError';
      }
    },
  };
});

async function parseJson<T>(
  res: Response,
): Promise<{ data: T; error?: { code: string; message: string } }> {
  return (await res.json()) as { data: T; error?: { code: string; message: string } };
}

describe('Tmux API', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/tmux/sessions', () => {
    it('returns list of sessions', async () => {
      const res = await app.request('/api/v1/tmux/sessions');
      expect(res.status).toBe(200);
      const json = await parseJson<Array<{ id: string; name: string }>>(res);
      expect(json.data).toHaveLength(2);
      expect(json.data[0]?.name).toBe('test-session');
    });
  });

  describe('POST /api/v1/tmux/sessions', () => {
    it('creates a new session', async () => {
      const res = await app.request('/api/v1/tmux/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'new-session' }),
      });
      expect(res.status).toBe(201);
      const json = await parseJson<{ id: string; name: string }>(res);
      expect(json.data.name).toBe('test-session');
    });

    it('creates session with custom command', async () => {
      const res = await app.request('/api/v1/tmux/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'custom-session', command: 'htop' }),
      });
      expect(res.status).toBe(201);
    });

    it('rejects missing name', async () => {
      const res = await app.request('/api/v1/tmux/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const json = await parseJson<unknown>(res);
      expect(json.error?.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid name characters', async () => {
      const res = await app.request('/api/v1/tmux/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'invalid name!' }),
      });
      expect(res.status).toBe(400);
      const json = await parseJson<unknown>(res);
      expect(json.error?.code).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate session name', async () => {
      const res = await app.request('/api/v1/tmux/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test-session' }),
      });
      expect(res.status).toBe(409);
      const json = await parseJson<unknown>(res);
      expect(json.error?.code).toBe('SESSION_EXISTS');
    });

    it('rejects name with spaces', async () => {
      const res = await app.request('/api/v1/tmux/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'name with spaces' }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects name with special characters', async () => {
      const res = await app.request('/api/v1/tmux/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'name@#$%' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/tmux/sessions/:name', () => {
    it('deletes an existing session', async () => {
      const res = await app.request('/api/v1/tmux/sessions/test-session', {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const json = await parseJson<{ success: boolean }>(res);
      expect(json.data.success).toBe(true);
    });

    it('returns 404 for non-existent session', async () => {
      const res = await app.request('/api/v1/tmux/sessions/non-existent', {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
      const json = await parseJson<unknown>(res);
      expect(json.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/tmux/sessions/:name', () => {
    it('returns session info by name', async () => {
      const res = await app.request('/api/v1/tmux/sessions/test-session');
      expect(res.status).toBe(200);
      const json = await parseJson<{ id: string; name: string }>(res);
      expect(json.data.name).toBe('test-session');
    });

    it('returns 404 for non-existent session', async () => {
      const res = await app.request('/api/v1/tmux/sessions/non-existent');
      expect(res.status).toBe(404);
      const json = await parseJson<unknown>(res);
      expect(json.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/tmux/sessions/:name/windows', () => {
    it('returns windows for a session', async () => {
      const res = await app.request('/api/v1/tmux/sessions/test-session/windows');
      expect(res.status).toBe(200);
      const json = await parseJson<Array<{ index: number; name: string }>>(res);
      expect(json.data).toHaveLength(1);
      expect(json.data[0]?.name).toBe('window-1');
    });

    it('returns 404 for non-existent session', async () => {
      const res = await app.request('/api/v1/tmux/sessions/non-existent/windows');
      expect(res.status).toBe(404);
      const json = await parseJson<unknown>(res);
      expect(json.error?.code).toBe('NOT_FOUND');
    });
  });
});
