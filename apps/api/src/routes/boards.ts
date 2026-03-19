import { Hono } from 'hono';
import * as boardService from '../services/board-service.js';

const boards = new Hono();

boards.get('/boards', async (c) => {
  const data = await boardService.listBoards();
  return c.json({ data });
});

boards.post('/boards', async (c) => {
  const body = await c.req.json();
  if (!body.name || typeof body.name !== 'string') {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'name is required' } }, 400);
  }
  const data = await boardService.createBoard({ name: body.name, description: body.description });
  return c.json({ data }, 201);
});

boards.get('/boards/:boardId', async (c) => {
  const data = await boardService.getBoard(c.req.param('boardId'));
  return c.json({ data });
});

boards.put('/boards/:boardId', async (c) => {
  const body = await c.req.json();
  const data = await boardService.updateBoard(c.req.param('boardId'), {
    name: body.name,
    description: body.description,
  });
  return c.json({ data });
});

boards.delete('/boards/:boardId', async (c) => {
  await boardService.deleteBoard(c.req.param('boardId'));
  return c.json({ data: { success: true } });
});

export default boards;
