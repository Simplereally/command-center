import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { db } from '../db/index.js';
import { boards, swimlanes, agents, logs, metrics } from '../db/schema.js';

const app = createApp();

async function parseJson<T>(res: Response): Promise<{ data: T; error?: { code: string; message: string } }> {
  return (await res.json()) as { data: T; error?: { code: string; message: string } };
}

async function seed() {
  await db.insert(boards).values({ id: 'board-1', name: 'Test Board' });
  await db.insert(swimlanes).values([
    { id: 'lane-1', boardId: 'board-1', name: 'Not Started', slug: 'not-started', position: 0, color: '#94a3b8' },
    { id: 'lane-2', boardId: 'board-1', name: 'In Progress', slug: 'in-progress', position: 1, color: '#3b82f6' },
  ]);
}

async function getAgentId(): Promise<string> {
  const res = await app.request('/api/v1/agents?boardId=board-1');
  const json = await parseJson<Array<{ id: string }>>(res);
  return json.data[0]!.id;
}

beforeEach(async () => {
  await db.delete(metrics);
  await db.delete(logs);
  await db.delete(agents);
  await db.delete(swimlanes);
  await db.delete(boards);
});

describe('Agents API', () => {
  it('GET /api/v1/agents returns empty when no agents', async () => {
    const res = await app.request('/api/v1/agents');
    expect(res.status).toBe(200);
    const json = await parseJson<unknown[]>(res);
    expect(json.data).toEqual([]);
  });

  it('POST /api/v1/agents creates agent', async () => {
    await seed();
    const res = await app.request('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Agent', boardId: 'board-1', swimlaneId: 'lane-1' }),
    });
    expect(res.status).toBe(201);
    const json = await parseJson<{ name: string; status: string }>(res);
    expect(json.data.name).toBe('Test Agent');
    expect(json.data.status).toBe('idle');
  });

  it('POST /api/v1/agents rejects missing fields', async () => {
    const res = await app.request('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    expect(res.status).toBe(400);
    const json = await parseJson<unknown>(res);
    expect(json.error?.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/agents/:agentId returns agent', async () => {
    await seed();
    await app.request('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', boardId: 'board-1', swimlaneId: 'lane-1' }),
    });

    const agentId = await getAgentId();
    const res = await app.request(`/api/v1/agents/${agentId}`);
    expect(res.status).toBe(200);
    const json = await parseJson<{ name: string }>(res);
    expect(json.data.name).toBe('Test');
  });

  it('POST /api/v1/agents/:id/start transitions to running', async () => {
    await seed();
    await app.request('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', boardId: 'board-1', swimlaneId: 'lane-1' }),
    });

    const agentId = await getAgentId();
    const res = await app.request(`/api/v1/agents/${agentId}/start`, { method: 'POST' });
    expect(res.status).toBe(200);
    const json = await parseJson<{ status: string }>(res);
    expect(json.data.status).toBe('running');
  });

  it('POST /api/v1/agents/:id/start on running agent returns 409', async () => {
    await seed();
    await app.request('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', boardId: 'board-1', swimlaneId: 'lane-1' }),
    });

    const agentId = await getAgentId();
    await app.request(`/api/v1/agents/${agentId}/start`, { method: 'POST' });
    const res = await app.request(`/api/v1/agents/${agentId}/start`, { method: 'POST' });
    expect(res.status).toBe(409);
  });

  it('POST /api/v1/agents/:id/stop stops running agent', async () => {
    await seed();
    await app.request('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', boardId: 'board-1', swimlaneId: 'lane-1' }),
    });

    const agentId = await getAgentId();
    await app.request(`/api/v1/agents/${agentId}/start`, { method: 'POST' });
    const res = await app.request(`/api/v1/agents/${agentId}/stop`, { method: 'POST' });
    expect(res.status).toBe(200);
    const json = await parseJson<{ status: string }>(res);
    expect(json.data.status).toBe('stopped');
  });

  it('POST /api/v1/agents/:id/move changes swimlane', async () => {
    await seed();
    await app.request('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', boardId: 'board-1', swimlaneId: 'lane-1' }),
    });

    const agentId = await getAgentId();
    await app.request(`/api/v1/agents/${agentId}/start`, { method: 'POST' });

    const res = await app.request(`/api/v1/agents/${agentId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ swimlaneId: 'lane-2', position: 0 }),
    });
    expect(res.status).toBe(200);
    const json = await parseJson<{ swimlaneId: string }>(res);
    expect(json.data.swimlaneId).toBe('lane-2');
  });

  it('GET /api/v1/agents filters by boardId', async () => {
    await seed();
    await db.insert(boards).values({ id: 'board-2', name: 'Board 2' });
    await db.insert(swimlanes).values({ id: 'lane-3', boardId: 'board-2', name: 'Todo', slug: 'todo', position: 0 });

    await app.request('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Agent1', boardId: 'board-1', swimlaneId: 'lane-1' }),
    });
    await app.request('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Agent2', boardId: 'board-2', swimlaneId: 'lane-3' }),
    });

    const res = await app.request('/api/v1/agents?boardId=board-1');
    const json = await parseJson<Array<{ name: string }>>(res);
    expect(json.data).toHaveLength(1);
    expect(json.data[0]!.name).toBe('Agent1');
  });
});
