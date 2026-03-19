import { Hono } from 'hono';
import type { UpgradeWebSocket } from 'hono/ws';
import type { WebSocket } from 'ws';
import { TmuxClient, TmuxError } from '@command-center/tmux';
import { AppError, ValidationError, NotFoundError } from '../lib/errors.js';
import { TerminalHandler } from '../ws/terminal-handler.js';
import { logger } from '../lib/logger.js';

const tmux = new Hono();
const client = new TmuxClient();

interface CreateSessionBody {
  name: string;
  command?: string;
}

interface SessionInfo {
  id: string;
  name: string;
  createdAt: Date;
  attached: boolean;
}

tmux.get('/sessions', async (c) => {
  try {
    const sessions = await client.listSessions();
    const data: SessionInfo[] = sessions.map((session) => ({
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      attached: session.attached,
    }));
    return c.json({ data });
  } catch (error) {
    if (error instanceof TmuxError) {
      throw new AppError('TMUX_ERROR', error.message, 500);
    }
    throw error;
  }
});

tmux.post('/sessions', async (c) => {
  const body = await c.req.json<CreateSessionBody>();

  if (!body.name || typeof body.name !== 'string') {
    throw new ValidationError('Session name is required and must be a string');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(body.name)) {
    throw new ValidationError(
      'Session name must contain only alphanumeric characters, dashes, and underscores',
    );
  }

  try {
    const exists = await client.sessionExists(body.name);
    if (exists) {
      throw new AppError('SESSION_EXISTS', `Session '${body.name}' already exists`, 409);
    }

    const session = await client.createSession(body.name, body.command);
    const data: SessionInfo = {
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      attached: session.attached,
    };
    return c.json({ data }, 201);
  } catch (error) {
    if (error instanceof TmuxError) {
      throw new AppError('TMUX_ERROR', error.message, 500);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw error;
  }
});

tmux.delete('/sessions/:name', async (c) => {
  const name = c.req.param('name');

  if (!name) {
    throw new ValidationError('Session name is required');
  }

  try {
    const exists = await client.sessionExists(name);
    if (!exists) {
      throw new NotFoundError(`Session '${name}' not found`);
    }

    await client.killSession(name);
    return c.json({ data: { success: true } });
  } catch (error) {
    if (error instanceof TmuxError) {
      throw new AppError('TMUX_ERROR', error.message, 500);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw error;
  }
});

tmux.get('/sessions/:name', async (c) => {
  const name = c.req.param('name');

  if (!name) {
    throw new ValidationError('Session name is required');
  }

  try {
    const sessions = await client.listSessions();
    const session = sessions.find((s) => s.name === name || s.id === name);

    if (!session) {
      throw new NotFoundError(`Session '${name}' not found`);
    }

    const data: SessionInfo = {
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      attached: session.attached,
    };
    return c.json({ data });
  } catch (error) {
    if (error instanceof TmuxError) {
      throw new AppError('TMUX_ERROR', error.message, 500);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw error;
  }
});

tmux.get('/sessions/:name/windows', async (c) => {
  const name = c.req.param('name');

  if (!name) {
    throw new ValidationError('Session name is required');
  }

  try {
    const exists = await client.sessionExists(name);
    if (!exists) {
      throw new NotFoundError(`Session '${name}' not found`);
    }

    const windows = await client.listWindows(name);
    return c.json({ data: windows });
  } catch (error) {
    if (error instanceof TmuxError) {
      throw new AppError('TMUX_ERROR', error.message, 500);
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw error;
  }
});

export function registerTerminalWebSocket(
  upgradeWebSocket: UpgradeWebSocket<WebSocket>,
): void {
  const terminalHandler = new TerminalHandler();

  tmux.get(
    '/sessions/:name/terminal',
    upgradeWebSocket((c) => {
      const sessionName = c.req.param('name') ?? '';

      return {
        onOpen(_evt, ws) {
          if (!ws.raw) {
            logger.error('WebSocket raw connection not available', { sessionName });
            ws.close(1011, 'Internal error');
            return;
          }
          terminalHandler.handleConnection(sessionName, ws.raw).catch((err) => {
            logger.error('Terminal connection error', {
              sessionName,
              error: err instanceof Error ? err.message : String(err),
            });
          });
        },
        onError(evt) {
          logger.error('WebSocket error', {
            sessionName,
            error: String(evt),
          });
        },
      };
    }),
  );
}

export default tmux;
