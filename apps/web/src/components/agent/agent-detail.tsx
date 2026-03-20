import { useCallback } from 'react';
import type { AgentResponse, UpdateAgent } from '@command-center/shared';
import { useAgentStore } from '../../stores/agent-store.js';
import { formatRelativeTime } from '../../lib/format-date.js';
import { AgentStatusBadge } from './agent-status-badge.js';
import { AgentLogViewer } from './agent-log-viewer.js';
import { AgentActions } from './agent-actions.js';
import { AgentMetrics } from './agent-metrics.js';
import { AgentConfigForm } from './agent-config-form.js';
import { ErrorBoundary } from '../error-boundary/index.js';

interface AgentDetailProps {
  agent: AgentResponse;
}

export function AgentDetail({ agent }: AgentDetailProps) {
  const updateAgent = useAgentStore((s) => s.updateAgent);

  const handleSave = useCallback(
    async (data: UpdateAgent) => {
      await updateAgent(agent.id, data);
    },
    [updateAgent, agent.id],
  );

  return (
    <ErrorBoundary>
      <div data-testid="agent-detail" className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-text-primary">{agent.name}</h2>
            <AgentStatusBadge status={agent.status} />
          </div>
          <AgentActions agent={agent} />
        </div>

        <AgentMetrics agentId={agent.id} />

        <AgentConfigForm agent={agent} onSave={handleSave} />

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Command
            </dt>
            <dd className="mt-0.5 text-sm text-text-primary">
              {agent.command ?? <span className="text-text-tertiary">Default</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wide">PID</dt>
            <dd className="mt-0.5 text-sm text-text-primary">{agent.pid ?? '\u2014'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Created
            </dt>
            <dd className="mt-0.5 text-sm text-text-primary">{formatRelativeTime(agent.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Updated
            </dt>
            <dd className="mt-0.5 text-sm text-text-primary">{formatRelativeTime(agent.updatedAt)}</dd>
          </div>
        </div>

        {(agent.status === 'running' || agent.status === 'error') && (
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-2">Logs</h3>
            <AgentLogViewer agentId={agent.id} maxLines={500} maxHeight="320px" />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
