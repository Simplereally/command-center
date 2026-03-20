import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Terminal, RotateCcw, Trash2, GripVertical, Copy } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import type { AgentResponse } from '@command-center/shared';
import { useUiStore } from '../../stores/ui-store.js';
import { useAgentStore } from '../../stores/agent-store.js';
import { StatusDot } from '../ui/status-dot.js';
import { LiveTimer } from '../ui/live-timer.js';
import { ProviderBadge } from '../agent/provider-badge.js';
import { cn } from '../../lib/cn.js';

const UNDO_DELAY_MS = 5_000;

interface AgentCardProps {
  agent: AgentResponse;
}

export const AgentCard = memo(function AgentCard({ agent }: AgentCardProps) {
  const openDetailPanel = useUiStore((s) => s.openDetailPanel);
  const openTerminalPanel = useUiStore((s) => s.openTerminalPanel);
  const selectedAgentId = useUiStore((s) => s.selectedAgentId);
  const isSelected = selectedAgentId === agent.id;
  const agentLogs = useAgentStore((s) => s.logs.get(agent.id));
  const lastLogLine =
    agentLogs && agentLogs.length > 0 ? agentLogs[agentLogs.length - 1]?.content : undefined;
  const showLogLine =
    lastLogLine != null && (agent.status === 'running' || agent.status === 'error');
  const prefersReducedMotion = useReducedMotion();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: agent.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 180;
    const menuHeight = 140;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    setContextMenu({ x, y });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu, closeContextMenu]);

  const handleOpenTerminal = useCallback(() => {
    closeContextMenu();
    openTerminalPanel(agent.id);
  }, [closeContextMenu, openTerminalPanel, agent.id]);

  const [isRestarting, setIsRestarting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRestart = useCallback(async () => {
    closeContextMenu();
    setIsRestarting(true);
    try {
      await useAgentStore.getState().restartAgent(agent.id);
      toast.success('Agent started');
    } catch (err) {
      toast.error('Failed to restart agent', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsRestarting(false);
    }
  }, [closeContextMenu, agent.id]);

  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  const handleDeleteClick = useCallback(() => {
    closeContextMenu();

    const store = useAgentStore.getState();
    const agentSnapshot = store.agents.get(agent.id);
    if (!agentSnapshot) return;

    const frozen: AgentResponse = { ...agentSnapshot };

    store.agents.delete(agent.id);
    useAgentStore.setState({ agents: new Map(store.agents) });
    setIsDeleting(true);

    let undone = false;

    deleteTimerRef.current = setTimeout(() => {
      if (!undone) {
        useAgentStore.getState().deleteAgent(agent.id).catch(() => {
          const currentStore = useAgentStore.getState();
          currentStore.agents.set(agent.id, frozen);
          useAgentStore.setState({ agents: new Map(currentStore.agents) });
        });
      }
      setIsDeleting(false);
      deleteTimerRef.current = null;
    }, UNDO_DELAY_MS);

    toast('Agent deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true;
          if (deleteTimerRef.current) {
            clearTimeout(deleteTimerRef.current);
            deleteTimerRef.current = null;
          }
          const currentStore = useAgentStore.getState();
          currentStore.agents.set(agent.id, frozen);
          useAgentStore.setState({ agents: new Map(currentStore.agents) });
          setIsDeleting(false);
        },
      },
      duration: UNDO_DELAY_MS,
    });
  }, [closeContextMenu, agent.id]);

  const handleDuplicate = useCallback(() => {
    closeContextMenu();
    useAgentStore
      .getState()
      .createAgent({
        name: `${agent.name} (copy)`,
        boardId: agent.boardId,
        swimlaneId: agent.swimlaneId,
        workingDir: agent.workingDir ?? undefined,
        envVars: agent.envVars ?? undefined,
        command: agent.command ?? undefined,
      })
      .then(() => {
        toast.success('Agent duplicated');
      })
      .catch((err) => {
        toast.error('Failed to duplicate agent', {
          description: err instanceof Error ? err.message : undefined,
        });
      });
  }, [closeContextMenu, agent]);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...(prefersReducedMotion ? {} : { layout: true })}
      layoutId={prefersReducedMotion ? undefined : `agent-card-${agent.id}`}
      data-testid={`agent-card-${agent.id}`}
      role="article"
      aria-label={`Agent: ${agent.name}, Status: ${agent.status}`}
      onClick={() => openDetailPanel(agent.id)}
      onContextMenu={handleContextMenu}
      className={cn(
        'group relative cursor-pointer rounded-xl border border-border bg-surface p-4',
        'hover:bg-surface-hover hover:shadow-lg hover:-translate-y-0.5 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isSelected && 'shadow-glow ring-1 ring-accent',
        (isRestarting || isDeleting) && 'opacity-60 pointer-events-none',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical
            className="h-3.5 w-3.5 shrink-0 text-text-tertiary opacity-0 group-hover:opacity-50 transition-opacity cursor-grab"
            {...attributes}
            {...listeners}
          />
          <StatusDot status={agent.status} size="sm" pulse />
          <span className="text-sm font-semibold text-text-primary truncate">{agent.name}</span>
        </div>
      </div>

      {agent.model && (
        <div className="mt-2 ml-5.5">
          <ProviderBadge model={agent.model} />
        </div>
      )}

      {agent.status === 'running' && agent.startedAt && (
        <div className="mt-1 ml-5.5">
          <LiveTimer startTime={agent.startedAt} />
        </div>
      )}

      {agent.workingDir && (
        <div className="mt-1.5 ml-5.5">
          <span className="text-xs font-mono text-text-tertiary truncate block">
            {agent.workingDir}
          </span>
        </div>
      )}

      {showLogLine && (
        <div className="mt-1.5 ml-5.5">
          <span
            className="text-xs font-mono text-text-tertiary truncate max-w-full block"
            data-testid={`agent-card-${agent.id}-log-preview`}
          >
            {lastLogLine}
          </span>
        </div>
      )}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          data-testid="agent-card-context-menu"
          className="fixed z-50 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={handleOpenTerminal}
          >
            <Terminal className="h-3.5 w-3.5" />
            Open Terminal
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={handleDuplicate}
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={handleRestart}
            disabled={isRestarting}
          >
            <RotateCcw className={cn('h-3.5 w-3.5', isRestarting && 'animate-spin')} />
            {isRestarting ? 'Restarting\u2026' : 'Restart'}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-surface-hover cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={handleDeleteClick}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? 'Deleting\u2026' : 'Delete'}
          </button>
        </div>
      )}
    </motion.div>
  );
});
