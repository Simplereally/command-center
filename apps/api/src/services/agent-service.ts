import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { agents, swimlanes } from '../db/schema.js';
import {
  canTransition,
  SWIMLANE_STATUS_MAP,
  type AgentStatus,
} from '@command-center/shared';
import { NotFoundError, ValidationError, ConflictError } from '../lib/errors.js';
import { TmuxClient } from '@command-center/tmux';

const tmuxClient = new TmuxClient();

interface CreateAgentInput {
  name: string;
  boardId: string;
  swimlaneId: string;
  model?: string;
  command?: string;
  workingDir?: string;
  envVars?: Record<string, string>;
}

interface UpdateAgentInput {
  name?: string;
  model?: string;
  command?: string;
  workingDir?: string;
  envVars?: Record<string, string>;
}

interface ListAgentFilters {
  boardId?: string;
  status?: string;
  swimlaneId?: string;
}

async function assertSwimlaneExists(swimlaneId: string): Promise<void> {
  const swimlane = await db.query.swimlanes.findFirst({
    where: eq(swimlanes.id, swimlaneId),
  });
  if (!swimlane) {
    throw new NotFoundError(`Swimlane not found: ${swimlaneId}`);
  }
}

async function getAgentOrThrow(id: string) {
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, id),
  });
  if (!agent) {
    throw new NotFoundError(`Agent not found: ${id}`);
  }
  return agent;
}

function getSwimlaneStatus(slug: string): AgentStatus {
  const status = SWIMLANE_STATUS_MAP[slug as keyof typeof SWIMLANE_STATUS_MAP];
  if (!status) {
    throw new ValidationError(`Unknown swimlane slug: ${slug}`);
  }
  return status;
}

export async function createAgent(data: CreateAgentInput) {
  await assertSwimlaneExists(data.swimlaneId);

  const id = nanoid();
  const now = new Date();

  const [created] = await db
    .insert(agents)
    .values({
      id,
      name: data.name,
      boardId: data.boardId,
      swimlaneId: data.swimlaneId,
      model: data.model ?? null,
      command: data.command ?? null,
      workingDir: data.workingDir ?? null,
      envVars: data.envVars ?? {},
      status: 'idle',
      position: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

export async function getAgent(id: string) {
  return getAgentOrThrow(id);
}

export async function listAgents(filters?: ListAgentFilters) {
  const conditions = [];

  if (filters?.boardId) {
    conditions.push(eq(agents.boardId, filters.boardId));
  }
  if (filters?.status) {
    conditions.push(eq(agents.status, filters.status as AgentStatus));
  }
  if (filters?.swimlaneId) {
    conditions.push(eq(agents.swimlaneId, filters.swimlaneId));
  }

  if (conditions.length === 0) {
    return db.query.agents.findMany();
  }

  return db.query.agents.findMany({
    where: and(...conditions),
  });
}

export async function updateAgent(id: string, data: UpdateAgentInput) {
  await getAgentOrThrow(id);

  const [updated] = await db
    .update(agents)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.model !== undefined && { model: data.model }),
      ...(data.command !== undefined && { command: data.command }),
      ...(data.workingDir !== undefined && { workingDir: data.workingDir }),
      ...(data.envVars !== undefined && { envVars: data.envVars }),
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning();

  return updated;
}

export async function deleteAgent(id: string) {
  const agent = await getAgentOrThrow(id);

  if (agent.status === 'running' || agent.status === 'starting') {
    await db
      .update(agents)
      .set({
        status: 'stopped',
        stoppedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id));
  }

  await db.delete(agents).where(eq(agents.id, id));
}

export async function startAgent(id: string) {
  const agent = await getAgentOrThrow(id);

  if (!canTransition(agent.status, 'starting')) {
    throw new ConflictError(
      `Cannot transition agent from '${agent.status}' to 'starting'`,
    );
  }

  await db
    .update(agents)
    .set({ status: 'starting', updatedAt: new Date() })
    .where(eq(agents.id, id));

  let sessionName: string | null = null;

  if (agent.command) {
    sessionName = `cc-agent-${id}`.slice(0, 128);
    try {
      const createOpts: { startDir?: string } = {};
      if (agent.workingDir) {
        createOpts.startDir = agent.workingDir;
      }
      await tmuxClient.createSession(sessionName, undefined, createOpts);

      const envVars = (agent.envVars ?? {}) as Record<string, string>;
      for (const [key, value] of Object.entries(envVars)) {
        await tmuxClient.sendKeys(sessionName, `export ${key}=${JSON.stringify(value)}`);
      }

      await tmuxClient.sendKeys(sessionName, agent.command);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const [errored] = await db
        .update(agents)
        .set({
          status: 'error',
          errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, id))
        .returning();
      return errored;
    }
  }

  const [updated] = await db
    .update(agents)
    .set({
      status: 'running',
      startedAt: new Date(),
      ...(sessionName && { tmuxSession: sessionName }),
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning();

  return updated;
}

export async function stopAgent(id: string) {
  const agent = await getAgentOrThrow(id);

  if (!canTransition(agent.status, 'stopping')) {
    throw new ConflictError(
      `Cannot transition agent from '${agent.status}' to 'stopping'`,
    );
  }

  await db
    .update(agents)
    .set({ status: 'stopping', updatedAt: new Date() })
    .where(eq(agents.id, id));

  if (agent.tmuxSession) {
    try {
      await tmuxClient.killSession(agent.tmuxSession);
    } catch {
      // Session may already be dead — ignore
    }
  }

  const [updated] = await db
    .update(agents)
    .set({
      status: 'stopped',
      stoppedAt: new Date(),
      tmuxSession: null,
      pid: null,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning();

  return updated;
}

export async function restartAgent(id: string) {
  await stopAgent(id);
  return startAgent(id);
}

export async function moveAgent(id: string, swimlaneId: string, position: number) {
  const agent = await getAgentOrThrow(id);
  await assertSwimlaneExists(swimlaneId);

  const targetSwimlane = await db.query.swimlanes.findFirst({
    where: eq(swimlanes.id, swimlaneId),
  });

  if (!targetSwimlane) {
    throw new NotFoundError(`Swimlane not found: ${swimlaneId}`);
  }

  const targetStatus = getSwimlaneStatus(targetSwimlane.slug);

  if (agent.status !== targetStatus) {
    if (!canTransition(agent.status, targetStatus)) {
      throw new ConflictError(
        `Cannot transition agent from '${agent.status}' to '${targetStatus}'`,
      );
    }
  }

  const [updated] = await db
    .update(agents)
    .set({
      swimlaneId,
      position,
      status: targetStatus,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning();

  return updated;
}
