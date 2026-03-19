import { Hono } from 'hono';
import * as swimlaneService from '../services/swimlane-service.js';

const swimlanes = new Hono();

swimlanes.get('/boards/:boardId/swimlanes', async (c) => {
  const data = await swimlaneService.listSwimlanes(c.req.param('boardId'));
  return c.json({ data });
});

swimlanes.post('/boards/:boardId/swimlanes', async (c) => {
  const body = await c.req.json();
  if (!body.name || typeof body.name !== 'string') {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'name is required' } }, 400);
  }
  const data = await swimlaneService.createSwimlane(c.req.param('boardId'), {
    name: body.name,
    position: body.position,
    color: body.color,
  });
  return c.json({ data }, 201);
});

swimlanes.get('/swimlanes/:laneId', async (c) => {
  const data = await swimlaneService.getSwimlane(c.req.param('laneId'));
  return c.json({ data });
});

swimlanes.delete('/swimlanes/:laneId', async (c) => {
  await swimlaneService.deleteSwimlane(c.req.param('laneId'));
  return c.json({ data: { success: true } });
});

swimlanes.put('/swimlanes/:laneId', async (c) => {
  const body = await c.req.json();
  const data = await swimlaneService.updateSwimlane(c.req.param('laneId'), {
    name: body.name,
    position: body.position,
    color: body.color,
  });
  return c.json({ data });
});

export default swimlanes;
