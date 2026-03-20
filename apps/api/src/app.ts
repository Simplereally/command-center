import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import { createNodeWebSocket } from '@hono/node-ws';
import { nanoid } from 'nanoid';
import { AppError } from './lib/errors.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import health from './routes/health.js';
import boards from './routes/boards.js';
import swimlanes from './routes/swimlanes.js';
import agents from './routes/agents.js';
import logs from './routes/logs.js';
import metrics from './routes/metrics.js';
import tmux, { registerTerminalWebSocket } from './routes/tmux.js';

type Variables = {
  requestId: string;
};

const requestIdMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const requestId = c.req.header('X-Request-ID') ?? nanoid();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
});

export let injectWebSocket: ReturnType<typeof createNodeWebSocket>['injectWebSocket'];

export function createApp(): Hono<{ Variables: Variables }> {
  const app = new Hono<{ Variables: Variables }>();

  const nodeWs = createNodeWebSocket({ app });
  injectWebSocket = nodeWs.injectWebSocket;

  app.use(
    '*',
    cors({
      origin: env.CORS_ORIGINS?.split(',') ?? ['http://localhost:5173'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }),
  );

  app.use('*', requestIdMiddleware);

  registerTerminalWebSocket(nodeWs.upgradeWebSocket);

  const api = new Hono<{ Variables: Variables }>();
  api.route('/', health);
  api.route('/', boards);
  api.route('/', swimlanes);
  api.route('/', agents);
  api.route('/', logs);
  api.route('/', metrics);
  api.route('/tmux', tmux);
  app.route('/api/v1', api);

  app.notFound((c) => {
    return c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: `Route ${c.req.method} ${c.req.path} not found`,
        },
      },
      404,
    );
  });

  app.onError((err, c) => {
    const requestId = c.get('requestId');

    if (err instanceof AppError) {
      logger.warn('Application error', {
        requestId,
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      });

      return c.json(
        {
          error: {
            code: err.code,
            message: err.message,
            ...(err.details !== undefined && { details: err.details }),
          },
        },
        err.statusCode as 400,
      );
    }

    logger.error('Unhandled error', {
      requestId,
      message: err.message,
      stack: err.stack,
    });

    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      500,
    );
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
