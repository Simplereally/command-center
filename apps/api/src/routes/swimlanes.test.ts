import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { db } from '../db/index.js';
import { boards, swimlanes, agents, logs, metrics } from '../db/schema.js';

const app = createApp();

type Json<T> = { data: T; error?: { code: string; message: string } };
async function pj<T>(res: Response): Promise<Json<T>> { return (await res.json()) as Json<T>; }

async function seedBoard() {
  await db.insert(boards).values({ id: 'board-1', name: 'Test Board' });
}

beforeEach(async () => {
  await db.delete(metrics);
  await db.delete(logs);
  await db.delete(agents);
  await db.delete(swimlanes);
  await db.delete(boards);
});

describe('Swimlanes API', () => {
  it('returns empty for nonexistent board', async () => {
    const res = await app.request('/api/v1/boards/nonexistent/swimlanes');
    expect(res.status).toBe(200);
    const json = await pj<Array<{ slug: string }>>(res);
    expect(json.data).toEqual([]);
  });

  it('GET /api/v1/boards/:boardId/swimlanes returns empty for board with no lanes', async () => {
    await seedBoard();
    const res = await app.request('/api/v1/boards/board-1/swimlanes');
    expect(res.status).toBe(200);
    const json = await pj<Array<{ slug: string }>>(res);
    expect(json.data).toEqual([]);
  });

  it('GET /api/v1/boards/:boardId/swimlanes returns swimlanes', async () => {
    await seedBoard();
    await db.insert(swimlanes).values([
      { id: 'lane-1', boardId: 'board-1', name: 'Not Started', slug: 'not-started', position: 0, color: '#94a3b8' },
      { id: 'lane-2', boardId: 'board-1', name: 'In Progress', slug: 'in-progress', position: 1, color: '#3b82f6' },
    ]);

    const res = await app.request('/api/v1/boards/board-1/swimlanes');
    expect(res.status).toBe(200);
    const json = await pj<Array<{ slug: string }>>(res);
    expect(json.data).toHaveLength(2);
    expect(json.data[0]!.slug).toBe('not-started');
    expect(json.data[1]!.slug).toBe('in-progress');
  });
});
