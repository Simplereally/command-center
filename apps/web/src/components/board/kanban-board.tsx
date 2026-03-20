import { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { AlertTriangle, Bot, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { SWIMLANE_STATUS_MAP } from '@command-center/shared';
import type { AgentResponse } from '@command-center/shared';
import { useBoardStore } from '../../stores/board-store.js';
import { useAgentStore } from '../../stores/agent-store.js';
import { useUiStore } from '../../stores/ui-store.js';
import { Swimlane } from './swimlane.js';
import { DragOverlayCard } from './drag-overlay.js';
import { EmptyState } from '../ui/empty-state.js';
import { BoardFilterBar } from './board-filter-bar.js';
import { ConfirmDialog } from '../ui/confirm-dialog.js';
import { ApiError } from '../../lib/api-client.js';

type SwimlaneSlug = keyof typeof SWIMLANE_STATUS_MAP;

const POLL_INTERVAL_MS = 5_000;

const STOPPING_SLUGS = new Set(['not-started', 'done']);

const LANE_TOAST_MESSAGES: Record<string, string> = {
  'not-started': 'Moved to Not Started',
  'in-progress': 'Moved to In Progress',
  'review': 'Moved to Review',
  'done': 'Moved to Done',
};

const EMPTY_AGENTS: AgentResponse[] = [];

const openCreateAgentDialog = () => useUiStore.getState().openCreateAgentDialog();

function fuzzyMatch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

function agentMatchesFilters(
  agent: AgentResponse,
  searchQuery: string,
  statusFilters: Set<string>,
): boolean {
  if (statusFilters.size > 0 && !statusFilters.has(agent.status)) {
    return false;
  }
  if (searchQuery.length > 0) {
    const fields = [agent.name, agent.model ?? '', agent.command ?? ''];
    if (!fields.some((f) => fuzzyMatch(f, searchQuery))) {
      return false;
    }
  }
  return true;
}

const AgentCardSkeleton = memo(function AgentCardSkeleton() {
  return (
    <div
      data-testid="agent-card-skeleton"
      className="rounded-xl border border-border bg-surface p-4 animate-pulse"
    >
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-border" />
        <div className="h-4 w-32 rounded bg-border" />
      </div>
      <div className="mt-2 ml-5.5">
        <div className="h-3 w-20 rounded-full bg-border" />
      </div>
    </div>
  );
});

export function KanbanBoard() {
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();
  const swimlanes = useBoardStore((s) => s.swimlanes);
  const loading = useBoardStore((s) => s.loading);
  const boardError = useBoardStore((s) => s.error);
  const fetchSwimlanes = useBoardStore((s) => s.fetchSwimlanes);
  const fetchBoard = useBoardStore((s) => s.fetchBoard);
  const agents = useAgentStore((s) => s.agents);
  const agentError = useAgentStore((s) => s.error);
  const fetchAgents = useAgentStore((s) => s.fetchAgents);
  const fetchLatestLogs = useAgentStore((s) => s.fetchLatestLogs);
  const optimisticMove = useAgentStore((s) => s.optimisticMove);
  const rollbackMove = useAgentStore((s) => s.rollbackMove);
  const commitMove = useAgentStore((s) => s.commitMove);
  const collapsedLanes = useUiStore((s) => s.collapsedLanes);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const statusFilters = useUiStore((s) => s.statusFilters);

  const [activeAgent, setActiveAgent] = useState<AgentResponse | null>(null);
  const [dragConfirm, setDragConfirm] = useState<{
    agentId: string;
    agentName: string;
    targetLaneId: string;
    targetLaneName: string;
    targetSlug: string;
    finalPosition: number;
    originalSwimlaneId: string;
    originalPosition: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const prevBoardIdRef = useRef<string | undefined>(boardId);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (boardId) {
      if (prevBoardIdRef.current !== boardId) {
        useBoardStore.getState().clearSwimlanes();
        useAgentStore.getState().clearAgents();
        initialLoadDone.current = false;
      }
      prevBoardIdRef.current = boardId;

      fetchBoard(boardId).catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          navigate('/');
        }
      });
      fetchSwimlanes(boardId);
      fetchAgents(boardId)
        .then(() => {
          initialLoadDone.current = true;
        })
        .catch(() => {});
    }
  }, [boardId, fetchBoard, fetchSwimlanes, fetchAgents, navigate]);

  useEffect(() => {
    if (!boardId) return;

    const poll = () => {
      if (document.visibilityState === 'visible' && initialLoadDone.current) {
        useAgentStore.getState().fetchAgents(boardId).catch(() => {});
      }
    };

    const id = setInterval(poll, POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && initialLoadDone.current) {
        useAgentStore.getState().fetchAgents(boardId).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [boardId]);

  const prevRunningIdsRef = useRef<string>('');
  useEffect(() => {
    const runningIds = Array.from(agents.values())
      .filter((a) => a.status === 'running' || a.status === 'error')
      .map((a) => a.id)
      .sort()
      .join(',');

    if (runningIds === prevRunningIdsRef.current) return;
    prevRunningIdsRef.current = runningIds;

    for (const id of runningIds.split(',')) {
      if (id) fetchLatestLogs(id);
    }
  }, [agents, fetchLatestLogs]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const agent = agents.get(event.active.id as string);
      if (agent) setActiveAgent(agent);
    },
    [agents],
  );

  const executeCrossLaneMove = useCallback(
    async (
      agentId: string,
      targetLaneId: string,
      targetSlug: string,
      finalPosition: number,
      originalSwimlaneId: string,
      originalPosition: number,
    ) => {
      optimisticMove(agentId, targetLaneId, finalPosition);

      try {
        await commitMove(agentId, targetLaneId, finalPosition);

        const slug = targetSlug as SwimlaneSlug;
        const newStatus = SWIMLANE_STATUS_MAP[slug];
        if (newStatus) {
          const targetLane = swimlanes.find((l) => l.id === targetLaneId);
          toast(LANE_TOAST_MESSAGES[slug] ?? `Moved to ${targetLane?.name ?? slug}`);
        }

        if (boardId) {
          useAgentStore.getState().fetchAgents(boardId).catch(() => {});
        }
      } catch {
        rollbackMove(agentId, originalSwimlaneId, originalPosition);
      }
    },
    [optimisticMove, commitMove, rollbackMove, boardId, swimlanes],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveAgent(null);

      if (!over) return;

      const agentId = active.id as string;
      const agent = agents.get(agentId);
      if (!agent) return;

      const originalSwimlaneId = agent.swimlaneId;
      const originalPosition = agent.position;
      const overId = over.id as string;

      let targetLane = swimlanes.find((l) => l.id === overId);
      const overAgent = !targetLane ? agents.get(overId) : undefined;
      if (!targetLane && overAgent) {
        targetLane = swimlanes.find((l) => l.id === overAgent.swimlaneId);
      }
      if (!targetLane) return;

      const laneAgents = Array.from(agents.values())
        .filter((a) => a.swimlaneId === targetLane.id)
        .sort((a, b) => a.position - b.position);

      if (targetLane.id === originalSwimlaneId) {
        if (!overAgent || overAgent.id === agentId) return;

        const oldIndex = laneAgents.findIndex((a) => a.id === agentId);
        const newIndex = laneAgents.findIndex((a) => a.id === overAgent.id);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const reordered = arrayMove(laneAgents, oldIndex, newIndex);
        reordered.forEach((a, idx) => {
          optimisticMove(a.id, targetLane.id, idx);
        });

        try {
          await commitMove(agentId, targetLane.id, newIndex);
        } catch {
          laneAgents.forEach((a) => {
            rollbackMove(a.id, originalSwimlaneId, a.position);
          });
        }
        return;
      }

      const dropIndex = overAgent
        ? laneAgents.findIndex((a) => a.id === overAgent.id)
        : laneAgents.length;
      const finalPosition = dropIndex === -1 ? laneAgents.length : dropIndex;

      if (agent.status === 'running' && STOPPING_SLUGS.has(targetLane.slug)) {
        setDragConfirm({
          agentId,
          agentName: agent.name,
          targetLaneId: targetLane.id,
          targetLaneName: targetLane.name,
          targetSlug: targetLane.slug,
          finalPosition,
          originalSwimlaneId,
          originalPosition,
        });
        return;
      }

      await executeCrossLaneMove(
        agentId,
        targetLane.id,
        targetLane.slug,
        finalPosition,
        originalSwimlaneId,
        originalPosition,
      );
    },
    [agents, swimlanes, optimisticMove, commitMove, rollbackMove, executeCrossLaneMove],
  );

  const handleDragConfirm = useCallback(async () => {
    if (!dragConfirm) return;
    const { agentId, targetLaneId, targetSlug, finalPosition, originalSwimlaneId, originalPosition } =
      dragConfirm;
    setDragConfirm(null);
    await executeCrossLaneMove(
      agentId,
      targetLaneId,
      targetSlug,
      finalPosition,
      originalSwimlaneId,
      originalPosition,
    );
  }, [dragConfirm, executeCrossLaneMove]);

  const handleDragConfirmCancel = useCallback(() => {
    setDragConfirm(null);
  }, []);

  const sortedLanes = useMemo(
    () => [...swimlanes].sort((a, b) => a.position - b.position),
    [swimlanes],
  );

  const allAgents = useMemo(() => Array.from(agents.values()), [agents]);
  const hasAgents = allAgents.length > 0;

  const filteredAgents = useMemo(
    () => allAgents.filter((a) => agentMatchesFilters(a, searchQuery, statusFilters)),
    [allAgents, searchQuery, statusFilters],
  );

  const agentsByLane = useMemo(() => {
    const map = new Map<string, AgentResponse[]>();
    for (const agent of filteredAgents) {
      let list = map.get(agent.swimlaneId);
      if (!list) {
        list = [];
        map.set(agent.swimlaneId, list);
      }
      list.push(agent);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [filteredAgents]);

  const errorMessage = boardError || agentError;

  const handleRetry = useCallback(() => {
    if (boardId) {
      fetchBoard(boardId).catch(() => {});
      fetchSwimlanes(boardId);
      fetchAgents(boardId);
    }
  }, [boardId, fetchBoard, fetchSwimlanes, fetchAgents]);

  if (loading && sortedLanes.length === 0) {
    return (
      <div data-testid="kanban-board" className="flex h-full gap-4 overflow-x-auto p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex w-72 shrink-0 flex-col rounded-lg bg-surface/50">
            <div className="h-1 w-full shrink-0 rounded-t bg-border animate-pulse" />
            <div className="px-3 py-2">
              <div className="h-4 w-24 rounded bg-border animate-pulse" />
            </div>
            <div className="flex flex-col gap-2 p-3 pt-0">
              {Array.from({ length: 2 }, (_, j) => (
                <AgentCardSkeleton key={j} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!hasAgents && !loading) {
    return (
      <div data-testid="kanban-board" className="flex h-full items-center justify-center">
        <EmptyState
          icon={<Bot className="h-12 w-12" />}
          title="Create your first agent"
          description="Start orchestrating your AI agents by creating one. They'll appear here in the kanban board."
          action={{ label: 'New Agent', onClick: openCreateAgentDialog }}
        />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div data-testid="kanban-board" className="flex h-full flex-col">
        {errorMessage && (
          <div
            data-testid="error-banner"
            role="alert"
            className="mx-4 mt-4 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/30 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}
        <BoardFilterBar resultCount={filteredAgents.length} totalCount={allAgents.length} />
        <div className="flex flex-1 gap-4 overflow-x-auto p-4">
          {sortedLanes.map((lane) => (
            <Swimlane
              key={lane.id}
              lane={lane}
              agents={agentsByLane.get(lane.id) ?? EMPTY_AGENTS}
              isCollapsed={collapsedLanes.has(lane.id)}
            />
          ))}
        </div>
      </div>
      <DragOverlay>{activeAgent ? <DragOverlayCard agent={activeAgent} /> : null}</DragOverlay>
      <ConfirmDialog
        open={dragConfirm !== null}
        title="Stop Running Agent?"
        message={
          dragConfirm
            ? `Moving "${dragConfirm.agentName}" to ${dragConfirm.targetLaneName} will stop this running agent. Continue?`
            : ''
        }
        confirmLabel="Continue"
        onConfirm={handleDragConfirm}
        onCancel={handleDragConfirmCancel}
      />
    </DndContext>
  );
}
