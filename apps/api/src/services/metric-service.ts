import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { metrics, agents } from '../db/schema.js';
import { NotFoundError } from '../lib/errors.js';

interface CreateMetricInput {
  agentId: string;
  cpu?: number;
  memory?: number;
  tokens?: number;
}

interface MetricHistoryOptions {
  limit?: number;
  offset?: number;
}

async function ensureAgentExists(agentId: string): Promise<void> {
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
  });

  if (!agent) {
    throw new NotFoundError(`Agent not found: ${agentId}`);
  }
}

export async function createMetric(data: CreateMetricInput) {
  await ensureAgentExists(data.agentId);

  const [created] = await db
    .insert(metrics)
    .values({
      id: nanoid(),
      agentId: data.agentId,
      cpu: data.cpu,
      memory: data.memory,
      tokens: data.tokens,
    })
    .returning();

  return created;
}

export async function getLatestMetric(agentId: string) {
  const [latest] = await db
    .select()
    .from(metrics)
    .where(eq(metrics.agentId, agentId))
    .orderBy(desc(metrics.timestamp))
    .limit(1);

  return latest ?? null;
}

export async function getMetricHistory(agentId: string, options?: MetricHistoryOptions) {
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  return db
    .select()
    .from(metrics)
    .where(eq(metrics.agentId, agentId))
    .orderBy(desc(metrics.timestamp))
    .limit(limit)
    .offset(offset);
}
