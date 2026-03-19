import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { db } from '../db/index.js';
import { boards, swimlanes, agents, logs, metrics } from '../db/schema.js';

const app = createApp();

type Json<T> = { data: T; error?: { code: string; message: string } };
async function pj<T>(res: Response): Promise<Json<T>> { return (await res.json()) as Json<T>; }

async function seed() {
  await db.insert(boards).values({ id: 'board-1', name: 'Test Board' });
  await db.insert(swimlanes).values({ id: 'lane-1', boardId: 'board-1', name: 'Not Started', slug: 'not-started', position: 0 });
  await db.insert(agents).values({ id: 'agent-1', name: 'Test Agent', boardId: 'board-1', swimlaneId: 'lane-1', status: 'running', position: 0 });
}

beforeEach(async () => {
  await db.delete(metrics);
  await db.delete(logs);
  await db.delete(agents);
  await db.delete(swimlanes);
  await db.delete(boards);
});

describe('Metrics API', () => {
  it('returns 404 when no metrics exist', async () => {
    await seed();
    const res = await app.request('/api/v1/agents/agent-1/metrics');
    expect([404, 200]).toContain(res.status);
  });

  it('GET /api/v1/agents/:id/metrics/history returns empty for no metrics', async () => {
    await seed();
    const res = await app.request('/api/v1/agents/agent-1/metrics/history');
    expect(res.status).toBe(200);
    const json = await pj<unknown>(res);
    expect(json.data).toEqual([]);
  });

  it('GET /api/v1/agents/:id/metrics/history returns metrics', async () => {
    await seed();
    const now = new Date();
    await db.insert(metrics).values([
      { id: 'm-1', agentId: 'agent-1', cpu: 25, memory: 128, timestamp: now },
      { id: 'm-2', agentId: 'agent-1', cpu: 50, memory: 256, timestamp: new Date(now.getTime() + 1000) },
    ]);

    const res = await app.request('/api/v1/agents/agent-1/metrics/history');
    expect(res.status).toBe(200);
    const json = await pj<unknown>(res);
    expect(json.data).toHaveLength(2);
  });
});
