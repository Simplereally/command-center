import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createBoardSchema, updateBoardSchema } from '@command-center/shared';
import * as boardService from '../services/board-service.js';

const boards = new Hono();

boards.get('/boards', async (c) => {
  const data = await boardService.listBoards();
  return c.json({ data });
});

boards.post('/boards', zValidator('json', createBoardSchema), async (c) => {
  const body = c.req.valid('json');
  const data = await boardService.createBoard({ name: body.name });
  return c.json({ data }, 201);
});

boards.get('/boards/:boardId', async (c) => {
  const data = await boardService.getBoard(c.req.param('boardId'));
  return c.json({ data });
});

boards.put('/boards/:boardId', zValidator('json', updateBoardSchema), async (c) => {
  const data = await boardService.updateBoard(c.req.param('boardId'), c.req.valid('json'));
  return c.json({ data });
});

boards.delete('/boards/:boardId', async (c) => {
  await boardService.deleteBoard(c.req.param('boardId'));
  return c.json({ data: { success: true } });
});

export default boards;
