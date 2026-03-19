import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import * as logService from '../services/log-service.js';

const logs = new Hono();

logs.get('/agents/:agentId/logs/history', async (c) => {
  const agentId = c.req.param('agentId');
  const limit = c.req.query('limit') ? Number(c.req.query('limit')) : undefined;
  const offset = c.req.query('offset') ? Number(c.req.query('offset')) : undefined;
  const before = c.req.query('before') ? Number(c.req.query('before')) : undefined;
  const data = await logService.getLogHistory(agentId, { limit, offset, before });
  return c.json({ data });
});

logs.get('/agents/:agentId/logs', async (c) => {
  const agentId = c.req.param('agentId');

  return streamSSE(c, async (stream) => {
    const unsubscribe = logService.subscribeToAgentLogs(agentId, (event) => {
      stream.writeSSE({
        event: 'log',
        data: JSON.stringify({
          id: event.id,
          level: event.level,
          content: event.content,
          timestamp: event.timestamp.getTime(),
        }),
      });
    });

    let heartbeatInterval: ReturnType<typeof setInterval> | undefined;

    const stopHeartbeat = (): void => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = undefined;
      }
    };

    stream.onAbort(() => {
      unsubscribe();
      stopHeartbeat();
    });

    const historicalLogs = await logService.getLatestLogs(agentId, 100);
    for (const log of historicalLogs) {
      await stream.writeSSE({
        event: 'log',
        data: JSON.stringify({
          id: log.id,
          level: log.level,
          content: log.content,
          timestamp: log.timestamp.getTime(),
        }),
      });
    }

    heartbeatInterval = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: 'heartbeat',
          data: JSON.stringify({ timestamp: Date.now() }),
        });
      } catch {
        stopHeartbeat();
      }
    }, 15000);

    while (true) {
      await stream.sleep(10000);
    }
  });
});

logs.get('/agents/:agentId/logs/:logId', async (c) => {
  const data = await logService.getLog(c.req.param('logId'));
  return c.json({ data });
});

logs.delete('/agents/:agentId/logs/:logId', async (c) => {
  await logService.deleteLog(c.req.param('logId'));
  return c.json({ data: { success: true } });
});

logs.post('/agents/:agentId/logs', async (c) => {
  const agentId = c.req.param('agentId');
  const body = await c.req.json();
  if (!body.level || !body.content) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'level and content are required' } },
      400,
    );
  }
  const data = await logService.createLog({ agentId, level: body.level, content: body.content });
  return c.json({ data }, 201);
});

export default logs;
