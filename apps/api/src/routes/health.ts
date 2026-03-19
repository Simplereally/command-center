import { Hono } from 'hono';

const health = new Hono();

health.get('/health', (c) => {
  return c.json({
    data: {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
    },
  });
});

export default health;
