import { eq, desc, lt, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { EventEmitter } from 'events';
import { db } from '../db/index.js';
import { logs, agents } from '../db/schema.js';
import { NotFoundError } from '../lib/errors.js';
import type { LogLevel } from '@command-center/shared';

// ── Log Event Emitter ────────────────────────────────────────────────────────

interface LogCreatedEvent {
  id: string;
  agentId: string;
  level: LogLevel;
  content: string;
  timestamp: Date;
}

class LogEventEmitter extends EventEmitter {
  emitLogCreated(data: LogCreatedEvent): void {
    this.emit('log:created', data);
  }

  onLogCreated(callback: (data: LogCreatedEvent) => void): () => void {
    this.on('log:created', callback);
    return () => this.off('log:created', callback);
  }
}

const logEventEmitter = new LogEventEmitter();

export { logEventEmitter, type LogCreatedEvent };

interface CreateLogInput {
  agentId: string;
  level: LogLevel;
  content: string;
}

interface LogHistoryOptions {
  limit?: number;
  offset?: number;
  before?: number;
}

async function ensureAgentExists(agentId: string): Promise<void> {
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
  });

  if (!agent) {
    throw new NotFoundError(`Agent not found: ${agentId}`);
  }
}

export async function createLog(data: CreateLogInput) {
  await ensureAgentExists(data.agentId);

  const [created] = await db
    .insert(logs)
    .values({
      id: nanoid(),
      agentId: data.agentId,
      level: data.level,
      content: data.content,
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create log');
  }

  logEventEmitter.emitLogCreated({
    id: created.id,
    agentId: created.agentId,
    level: created.level,
    content: created.content,
    timestamp: created.timestamp,
  });

  return created;
}

export async function getLogHistory(agentId: string, options?: LogHistoryOptions) {
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  const conditions = [eq(logs.agentId, agentId)];

  if (options?.before !== undefined) {
    conditions.push(lt(logs.timestamp, new Date(options.before)));
  }

  return db
    .select()
    .from(logs)
    .where(and(...conditions))
    .orderBy(desc(logs.timestamp))
    .limit(limit)
    .offset(offset);
}

export async function getLatestLogs(agentId: string, limit?: number) {
  const count = limit ?? 50;

  return db
    .select()
    .from(logs)
    .where(eq(logs.agentId, agentId))
    .orderBy(desc(logs.timestamp))
    .limit(count);
}

export async function getLog(id: string) {
  const log = await db.select().from(logs).where(eq(logs.id, id)).get();
  if (!log) throw new NotFoundError('Log', id);
  return log;
}

export async function deleteLog(id: string) {
  const existing = await db.select().from(logs).where(eq(logs.id, id)).get();
  if (!existing) throw new NotFoundError('Log', id);
  await db.delete(logs).where(eq(logs.id, id));
  return { success: true };
}

export function subscribeToAgentLogs(
  agentId: string,
  callback: (event: LogCreatedEvent) => void,
): () => void {
  return logEventEmitter.onLogCreated((event) => {
    if (event.agentId === agentId) {
      callback(event);
    }
  });
}
