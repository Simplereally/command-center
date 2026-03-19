import { useState, useCallback } from 'react';
import { Play, Square, RotateCcw, Trash2, Loader2, Terminal } from 'lucide-react';
import type { AgentResponse } from '@command-center/shared';
import { canTransition } from '@command-center/shared';
import { toast } from 'sonner';
import { useAgentStore } from '../../stores/agent-store.js';
import { useUiStore } from '../../stores/ui-store.js';
import { cn } from '../../lib/cn.js';

interface AgentActionsProps {
  agent: AgentResponse;
}

export function AgentActions({ agent }: AgentActionsProps) {
  const { startAgent, stopAgent, restartAgent, deleteAgent } = useAgentStore();
  const { openTerminalPanel, closeSidePanel } = useUiStore();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canStart = canTransition(agent.status, 'starting');
  const canStop = canTransition(agent.status, 'stopping');
  const canRestart =
    agent.status === 'running' || agent.status === 'paused' || agent.status === 'error';

  const withLoading = useCallback(
    (action: string, fn: () => Promise<void>) => async () => {
      setLoadingAction(action);
      try {
        await fn();
      } finally {
        setLoadingAction(null);
      }
    },
    [],
  );

  const handleStart = useCallback(async () => {
    try {
      await startAgent(agent.id);
      toast.success(`Agent "${agent.name}" started`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start agent');
    }
  }, [startAgent, agent.id, agent.name]);

  const handleStop = useCallback(async () => {
    try {
      await stopAgent(agent.id);
      toast(`Agent "${agent.name}" stopped`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to stop agent');
    }
  }, [stopAgent, agent.id, agent.name]);

  const handleRestart = useCallback(async () => {
    try {
      await restartAgent(agent.id);
      toast.success(`Agent "${agent.name}" restarted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restart agent');
    }
  }, [restartAgent, agent.id, agent.name]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteAgent(agent.id);
      toast.success(`Agent "${agent.name}" deleted`);
      closeSidePanel();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete agent');
    } finally {
      setConfirmDelete(false);
    }
  }, [deleteAgent, agent.id, agent.name, closeSidePanel]);

  const iconButtonClasses = cn(
    'inline-flex items-center justify-center rounded-lg p-2 text-text-secondary transition-colors',
    'hover:bg-surface-hover hover:text-text-primary',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-secondary',
  );

  const isLoading = (action: string) => loadingAction === action;

  return (
    <div data-testid="agent-actions" className="flex items-center gap-1">
      <button
        type="button"
        onClick={withLoading('start', handleStart)}
        disabled={!canStart || loadingAction !== null}
        className={iconButtonClasses}
        aria-label="Start"
        title="Start"
      >
        {isLoading('start') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      </button>

      <button
        type="button"
        onClick={withLoading('stop', handleStop)}
        disabled={!canStop || loadingAction !== null}
        className={iconButtonClasses}
        aria-label="Stop"
        title="Stop"
      >
        {isLoading('stop') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
      </button>

      <button
        type="button"
        onClick={withLoading('restart', handleRestart)}
        disabled={!canRestart || loadingAction !== null}
        className={iconButtonClasses}
        aria-label="Restart"
        title="Restart"
      >
        {isLoading('restart') ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      </button>

      <button
        type="button"
        onClick={() => openTerminalPanel(agent.id)}
        disabled={loadingAction !== null}
        className={iconButtonClasses}
        aria-label="Terminal"
        title="Terminal"
      >
        <Terminal className="h-4 w-4" />
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      {confirmDelete ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={withLoading('delete', handleDelete)}
            disabled={loadingAction !== null}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
              'disabled:opacity-50',
            )}
          >
            {isLoading('delete') ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            disabled={loadingAction !== null}
            className="inline-flex items-center rounded-lg px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={loadingAction !== null}
          className={cn(iconButtonClasses, 'hover:text-red-400')}
          aria-label="Delete"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
