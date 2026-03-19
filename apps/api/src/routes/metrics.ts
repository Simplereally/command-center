import { Hono } from 'hono';
import * as metricService from '../services/metric-service.js';

const metrics = new Hono();

metrics.get('/agents/:agentId/metrics', async (c) => {
  const data = await metricService.getLatestMetric(c.req.param('agentId'));
  return c.json({ data });
});

metrics.get('/agents/:agentId/metrics/history', async (c) => {
  const limit = c.req.query('limit') ? Number(c.req.query('limit')) : undefined;
  const offset = c.req.query('offset') ? Number(c.req.query('offset')) : undefined;
  const data = await metricService.getMetricHistory(c.req.param('agentId'), { limit, offset });
  return c.json({ data });
});

export default metrics;
