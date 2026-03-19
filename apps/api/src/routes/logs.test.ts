import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { db } from '../db/index.js';
import { boards, swimlanes, agents, logs, metrics } from '../db/schema.js';
import * as logService from '../services/log-service.js';

const app = createApp();

type Json<T> = { data: T; error?: { code: string; message: string } };
async function pj<T>(res: Response): Promise<Json<T>> {
  return (await res.json()) as Json<T>;
}

async function seed() {
  await db.insert(boards).values({ id: 'board-1', name: 'Test Board' });
  await db.insert(swimlanes).values({
    id: 'lane-1',
    boardId: 'board-1',
    name: 'Not Started',
    slug: 'not-started',
    position: 0,
  });
  await db.insert(agents).values({
    id: 'agent-1',
    name: 'Test Agent',
    boardId: 'board-1',
    swimlaneId: 'lane-1',
    status: 'idle',
    position: 0,
  });
}

beforeEach(async () => {
  await db.delete(metrics);
  await db.delete(logs);
  await db.delete(agents);
  await db.delete(swimlanes);
  await db.delete(boards);
});

describe('Logs API', () => {
  it('GET /api/v1/agents/:id/logs/history returns empty for no logs', async () => {
    await seed();
    const res = await app.request('/api/v1/agents/agent-1/logs/history');
    expect(res.status).toBe(200);
    const json = await pj<unknown>(res);
    expect(json.data).toEqual([]);
  });

  it('GET /api/v1/agents/:id/logs/history returns logs', async () => {
    await seed();
    await db.insert(logs).values([
      {
        id: 'log-1',
        agentId: 'agent-1',
        level: 'info',
        content: 'Agent started',
        timestamp: new Date(),
      },
      {
        id: 'log-2',
        agentId: 'agent-1',
        level: 'info',
        content: 'Working...',
        timestamp: new Date(Date.now() + 1000),
      },
    ]);

    const res = await app.request('/api/v1/agents/agent-1/logs/history');
    expect(res.status).toBe(200);
    const json = await pj<Array<{ content: string }>>(res);
    expect(json.data).toHaveLength(2);
    const contents = json.data.map((l) => l.content);
    expect(contents).toContain('Agent started');
    expect(contents).toContain('Working...');
  });

  it('GET /api/v1/agents/:id/logs/history supports limit', async () => {
    await seed();
    for (let i = 0; i < 10; i++) {
      await db.insert(logs).values({
        id: `log-${i}`,
        agentId: 'agent-1',
        level: 'info',
        content: `Log ${i}`,
        timestamp: new Date(Date.now() + i),
      });
    }

    const res = await app.request('/api/v1/agents/agent-1/logs/history?limit=3');
    expect(res.status).toBe(200);
    const json = await pj<unknown>(res);
    expect(json.data).toHaveLength(3);
  });
});

describe('Logs SSE Stream', () => {
  it('GET /api/v1/agents/:id/logs returns SSE stream with correct headers', async () => {
    await seed();
    await db.insert(logs).values([
      {
        id: 'log-1',
        agentId: 'agent-1',
        level: 'info',
        content: 'Agent started',
        timestamp: new Date(),
      },
      {
        id: 'log-2',
        agentId: 'agent-1',
        level: 'info',
        content: 'Output line',
        timestamp: new Date(Date.now() + 1000),
      },
    ]);

    const controller = new AbortController();
    const res = await app.request('/api/v1/agents/agent-1/logs', {
      signal: controller.signal,
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');

    controller.abort();
  });

  it('GET /api/v1/agents/:id/logs pushes new logs in real-time', async () => {
    await seed();
    const controller = new AbortController();

    const res = await app.request('/api/v1/agents/agent-1/logs', {
      signal: controller.signal,
    });
    expect(res.status).toBe(200);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let readDone = false;

    const readTask = (async () => {
      try {
        while (!readDone) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(decoder.decode(value, { stream: true }));
        }
      } catch {
        // Ignore errors during read
      }
    })();

    await logService.createLog({ agentId: 'agent-1', level: 'info', content: 'Real-time log' });

    await new Promise((resolve) => setTimeout(resolve, 200));

    readDone = true;
    controller.abort();

    await reader.cancel();
    await readTask;

    const allData = chunks.join('');
    expect(allData).toContain('"content":"Real-time log"');
  });
});
