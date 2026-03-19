import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server.js';
import { ApiClient, ApiError } from './api-client.js';
import { buildAgent, buildBoard } from '../test/factories.js';
import { AgentStatus } from '@command-center/shared';

const API = '/api/v1';
const client = new ApiClient(API);

describe('ApiClient', () => {
  describe('boards', () => {
    it('lists boards', async () => {
      const boards = await client.boards.list();
      expect(boards).toHaveLength(1);
      expect(boards[0]?.name).toBe('Default Board');
    });

    it('gets a board by id', async () => {
      const board = await client.boards.get('board-1');
      expect(board.id).toBe('board-1');
    });

    it('creates a board', async () => {
      server.use(
        http.post(`${API}/boards`, () => {
          return HttpResponse.json({ data: buildBoard({ id: 'new-board', name: 'New Board' }) });
        }),
      );
      const board = await client.boards.create({ name: 'New Board' });
      expect(board.id).toBe('new-board');
      expect(board.name).toBe('New Board');
    });
  });

  describe('agents', () => {
    it('lists agents by boardId', async () => {
      const agents = await client.agents.list({ boardId: 'board-1' });
      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0]?.boardId).toBe('board-1');
    });

    it('creates an agent', async () => {
      server.use(
        http.post(`${API}/agents`, () => {
          return HttpResponse.json({
            data: buildAgent({
              id: 'new-agent',
              name: 'Test Agent',
              boardId: 'board-1',
              swimlaneId: 'lane-1',
            }),
          });
        }),
      );
      const agent = await client.agents.create({
        name: 'Test Agent',
        boardId: 'board-1',
        swimlaneId: 'lane-1',
      });
      expect(agent.id).toBe('new-agent');
      expect(agent.name).toBe('Test Agent');
    });

    it('starts an agent', async () => {
      const agent = await client.agents.start('agent-1');
      expect(agent.status).toBe(AgentStatus.RUNNING);
    });

    it('stops an agent', async () => {
      const agent = await client.agents.stop('agent-1');
      expect(agent.status).toBe(AgentStatus.STOPPED);
    });

    it('moves an agent', async () => {
      const result = await client.agents.move('agent-1', { swimlaneId: 'lane-2', position: 0 });
      expect(result).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('throws ApiError on non-ok response', async () => {
      server.use(
        http.get(`${API}/boards`, () => {
          return HttpResponse.json(
            { error: { code: 'NOT_FOUND', message: 'Board not found' } },
            { status: 404 },
          );
        }),
      );
      await expect(client.boards.list()).rejects.toThrow(ApiError);
      await expect(client.boards.list()).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Board not found',
      });
    });

    it('includes details in ApiError when present', async () => {
      server.use(
        http.get(`${API}/boards`, () => {
          return HttpResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid', details: { field: 'name' } } },
            { status: 400 },
          );
        }),
      );
      await expect(client.boards.list()).rejects.toMatchObject({
        status: 400,
        code: 'VALIDATION_ERROR',
        details: { field: 'name' },
      });
    });
  });
});
