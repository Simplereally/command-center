import type { AgentResponse } from '@command-center/shared';
import { Play, Square, RotateCcw, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { useAgentStore } from '../../stores/agent-store.js';
import { useUiStore } from '../../stores/ui-store.js';
import { AgentStatusBadge } from './agent-status-badge.js';
import { ErrorBoundary } from '../error-boundary/index.js';

interface AgentDetailProps {
  agent: AgentResponse;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function AgentDetail({ agent }: AgentDetailProps) {
  const { startAgent, stopAgent, restartAgent } = useAgentStore();
  const { openTerminalPanel } = useUiStore();

  const canStart = agent.status === 'idle' || agent.status === 'stopped';
  const canStop = agent.status === 'running' || agent.status === 'paused';
  const canRestart =
    agent.status === 'running' || agent.status === 'paused' || agent.status === 'error';

  const handleStart = async () => {
    try {
      await startAgent(agent.id);
      toast.success(`Agent "${agent.name}" started`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start agent', {
        action: {
          label: 'View Logs',
          onClick: () => useUiStore.getState().openDetailPanel(agent.id),
        },
      });
    }
  };

  const handleStop = async () => {
    try {
      await stopAgent(agent.id);
      toast(`Agent "${agent.name}" stopped`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to stop agent', {
        action: {
          label: 'View Logs',
          onClick: () => useUiStore.getState().openDetailPanel(agent.id),
        },
      });
    }
  };

  const handleRestart = async () => {
    try {
      await restartAgent(agent.id);
      toast.success(`Agent "${agent.name}" restarted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restart agent', {
        action: {
          label: 'View Logs',
          onClick: () => useUiStore.getState().openDetailPanel(agent.id),
        },
      });
    }
  };

  return (
    <ErrorBoundary>
      <div data-testid="agent-detail" className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-text-primary">{agent.name}</h2>
          <AgentStatusBadge status={agent.status} />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Working Directory
            </dt>
            <dd className="mt-0.5 text-sm text-text-primary">
              {agent.workingDir ?? <span className="text-text-tertiary">Not set</span>}
            </dd>
          </div>
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
            <dd className="mt-0.5 text-sm text-text-primary">{formatDate(agent.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              Updated
            </dt>
            <dd className="mt-0.5 text-sm text-text-primary">{formatDate(agent.updatedAt)}</dd>
          </div>
        </div>

        <div className="flex gap-2">
          {canStart && (
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover"
            >
              <Play className="h-3.5 w-3.5" />
              Start
            </button>
          )}
          {canStop && (
            <button
              onClick={handleStop}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface-hover"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          )}
          {canRestart && (
            <button
              onClick={handleRestart}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface-hover"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restart
            </button>
          )}
          <button
            onClick={() => openTerminalPanel(agent.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface-hover"
          >
            <Terminal className="h-3.5 w-3.5" />
            Terminal
          </button>
        </div>

        {agent.envVars && Object.keys(agent.envVars).length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-secondary">Environment Variables</h3>
            <ul className="mt-2 space-y-1">
              {Object.entries(agent.envVars).map(([key, value]) => (
                <li key={key} className="font-mono text-xs text-text-primary">
                  <span className="text-text-secondary">{key}</span>
                  <span className="text-text-tertiary">=</span>
                  <span>{value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
