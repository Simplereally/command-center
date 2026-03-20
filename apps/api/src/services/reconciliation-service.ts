import { eq, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agents } from '../db/schema.js';
import { TmuxClient } from '@command-center/tmux';
import { logger } from '../lib/logger.js';
import type { AgentStatus } from '@command-center/shared';

const tmuxClient = new TmuxClient();

export async function reconcileAgents(): Promise<void> {
  const staleAgents = await db.query.agents.findMany({
    where: or(
      eq(agents.status, 'running' as AgentStatus),
      eq(agents.status, 'starting' as AgentStatus),
    ),
  });

  if (staleAgents.length === 0) {
    logger.info('Reconciliation complete: no agents in running/starting state');
    return;
  }

  logger.info('Reconciling agents', { count: staleAgents.length });

  for (const agent of staleAgents) {
    const tmuxSession = agent.tmuxSession;

    let sessionAlive = false;
    if (tmuxSession) {
      try {
        sessionAlive = await tmuxClient.sessionExists(tmuxSession);
      } catch {
        sessionAlive = false;
      }
    }

    if (!sessionAlive) {
      const newStatus: AgentStatus = agent.status === 'running' ? 'stopped' : 'error';

      await db
        .update(agents)
        .set({
          status: newStatus,
          stoppedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agent.id));

      logger.info('Reconciled agent', {
        agentId: agent.id,
        name: agent.name,
        previousStatus: agent.status,
        newStatus,
        tmuxSession: tmuxSession ?? 'none',
      });
    } else {
      logger.info('Agent tmux session still alive', {
        agentId: agent.id,
        name: agent.name,
        tmuxSession,
      });
    }
  }

  logger.info('Reconciliation complete');
}
