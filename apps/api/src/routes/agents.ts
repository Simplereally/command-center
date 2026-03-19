import { Hono } from 'hono';
import * as agentService from '../services/agent-service.js';

const agents = new Hono();

agents.get('/agents', async (c) => {
  const boardId = c.req.query('boardId') ?? undefined;
  const status = c.req.query('status') ?? undefined;
  const swimlaneId = c.req.query('swimlaneId') ?? undefined;
  const data = await agentService.listAgents({ boardId, status, swimlaneId });
  return c.json({ data });
});

agents.post('/agents', async (c) => {
  const body = await c.req.json();
  if (!body.name || !body.boardId || !body.swimlaneId) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'name, boardId, and swimlaneId are required' } },
      400,
    );
  }
  const data = await agentService.createAgent({
    name: body.name,
    boardId: body.boardId,
    swimlaneId: body.swimlaneId,
    model: body.model,
    command: body.command,
    workingDir: body.workingDir,
    envVars: body.envVars,
  });
  return c.json({ data }, 201);
});

agents.get('/agents/:agentId', async (c) => {
  const data = await agentService.getAgent(c.req.param('agentId'));
  return c.json({ data });
});

agents.put('/agents/:agentId', async (c) => {
  const body = await c.req.json();
  const data = await agentService.updateAgent(c.req.param('agentId'), {
    name: body.name,
    model: body.model,
    command: body.command,
    workingDir: body.workingDir,
    envVars: body.envVars,
  });
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

agents.post('/agents/:agentId/move', async (c) => {
  const body = await c.req.json();
  if (!body.swimlaneId || typeof body.position !== 'number') {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'swimlaneId and position are required' } },
      400,
    );
  }
  const data = await agentService.moveAgent(c.req.param('agentId'), body.swimlaneId, body.position);
  return c.json({ data });
});

export default agents;
