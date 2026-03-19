import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { db } from '../db/index.js';
import { boards, swimlanes, agents, logs, metrics } from '../db/schema.js';

const app = createApp();

type Json<T> = { data: T; error?: { code: string; message: string } };
async function pj<T>(res: Response): Promise<Json<T>> { return (await res.json()) as Json<T>; }

beforeEach(async () => {
  await db.delete(metrics);
  await db.delete(logs);
  await db.delete(agents);
  await db.delete(swimlanes);
  await db.delete(boards);
});

describe('Boards API', () => {
  it('GET /api/v1/boards returns empty array when no boards', async () => {
    const res = await app.request('/api/v1/boards');
    expect(res.status).toBe(200);
    const json = await pj<unknown>(res);
    expect(json.data).toEqual([]);
  });

  it('POST /api/v1/boards creates board', async () => {
    const res = await app.request('/api/v1/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Board' }),
    });
    expect(res.status).toBe(201);
    const json = await pj<{ name: string; id: string }>(res);
    expect(json.data.name).toBe('Test Board');
    expect(json.data.id).toBeDefined();
  });

  it('POST /api/v1/boards rejects empty name', async () => {
    const res = await app.request('/api/v1/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
    const json = await pj<unknown>(res);
    expect((json as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/boards/:boardId returns board', async () => {
    const create = await app.request('/api/v1/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    const { data } = await pj<{ id: string; name: string }>(create);

    const res = await app.request(`/api/v1/boards/${data.id}`);
    expect(res.status).toBe(200);
    const json = await pj<{ id: string; name: string }>(res);
    expect(json.data.id).toBe(data.id);
  });

  it('GET /api/v1/boards/:boardId returns 404 for missing', async () => {
    const res = await app.request('/api/v1/boards/nonexistent');
    expect(res.status).toBe(404);
  });

  it('PUT /api/v1/boards/:boardId updates board', async () => {
    const create = await app.request('/api/v1/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Original' }),
    });
    const { data } = await pj<{ id: string; name: string }>(create);

    const res = await app.request(`/api/v1/boards/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });
    expect(res.status).toBe(200);
    const json = await pj<{ name: string }>(res);
    expect(json.data.name).toBe('Updated');
  });

  it('DELETE /api/v1/boards/:boardId deletes board', async () => {
    const create = await app.request('/api/v1/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ToDelete' }),
    });
    const { data } = await pj<{ id: string; name: string }>(create);

    const res = await app.request(`/api/v1/boards/${data.id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);

    const get = await app.request(`/api/v1/boards/${data.id}`);
    expect(get.status).toBe(404);
  });
});
