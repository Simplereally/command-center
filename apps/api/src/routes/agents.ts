import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createAgentSchema, updateAgentSchema, moveAgentSchema } from '@command-center/shared';
import * as agentService from '../services/agent-service.js';

const agents = new Hono();

agents.get('/agents', async (c) => {
  const boardId = c.req.query('boardId') ?? undefined;
  const status = c.req.query('status') ?? undefined;
  const swimlaneId = c.req.query('swimlaneId') ?? undefined;
  const data = await agentService.listAgents({ boardId, status, swimlaneId });
  return c.json({ data });
});

agents.post('/agents', zValidator('json', createAgentSchema), async (c) => {
  const data = await agentService.createAgent(c.req.valid('json'));
  return c.json({ data }, 201);
});

agents.get('/agents/:agentId', async (c) => {
  const data = await agentService.getAgent(c.req.param('agentId'));
  return c.json({ data });
});

agents.put('/agents/:agentId', zValidator('json', updateAgentSchema), async (c) => {
  const data = await agentService.updateAgent(c.req.param('agentId'), c.req.valid('json'));
  return c.json({ data });
});

agents.delete('/agents/:agentId', async (c) => {
  await agentService.deleteAgent(c.req.param('agentId'));
  return c.json({ data: { success: true } });
});

agents.post('/agents/:agentId/start', async (c) => {
  const data = await agentService.startAgent(c.req.param('agentId'));
  return c.json({ data });
});

agents.post('/agents/:agentId/stop', async (c) => {
  const data = await agentService.stopAgent(c.req.param('agentId'));
  return c.json({ data });
});

agents.post('/agents/:agentId/restart', async (c) => {
  const data = await agentService.restartAgent(c.req.param('agentId'));
  return c.json({ data });
});

agents.post('/agents/:agentId/move', zValidator('json', moveAgentSchema), async (c) => {
  const body = c.req.valid('json');
  const data = await agentService.moveAgent(c.req.param('agentId'), body.swimlaneId, body.position ?? 0);
  return c.json({ data });
});

export default agents;
