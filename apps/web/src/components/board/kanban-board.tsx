import { useEffect, useState, useCallback } from 'react';
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
import { AlertTriangle, Bot } from 'lucide-react';
import { useBoardStore } from '../../stores/board-store.js';
import { useAgentStore } from '../../stores/agent-store.js';
import { useUiStore } from '../../stores/ui-store.js';
import { Swimlane } from './swimlane.js';
import { DragOverlayCard } from './drag-overlay.js';
import { EmptyState } from '../ui/empty-state.js';
import type { AgentResponse } from '@command-center/shared';
import { ApiError } from '../../lib/api-client.js';

const openCreateAgentDialog = () => useUiStore.getState().openCreateAgentDialog();

export function KanbanBoard() {
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();
  const swimlanes = useBoardStore((s) => s.swimlanes);
  const loading = useBoardStore((s) => s.loading);
  const boardError = useBoardStore((s) => s.error);
  const fetchSwimlanes = useBoardStore((s) => s.fetchSwimlanes);
  const fetchBoard = useBoardStore((s) => s.fetchBoard);
  const agents = useAgentStore((s) => s.agents);
  const fetchAgents = useAgentStore((s) => s.fetchAgents);
  const fetchLatestLogs = useAgentStore((s) => s.fetchLatestLogs);
  const optimisticMove = useAgentStore((s) => s.optimisticMove);
  const rollbackMove = useAgentStore((s) => s.rollbackMove);
  const commitMove = useAgentStore((s) => s.commitMove);
  const collapsedLanes = useUiStore((s) => s.collapsedLanes);

  const [activeAgent, setActiveAgent] = useState<AgentResponse | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  useEffect(() => {
    if (boardId) {
      fetchBoard(boardId).catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          navigate('/');
        }
      });
      fetchSwimlanes(boardId);
      fetchAgents(boardId);
    }
  }, [boardId, fetchBoard, fetchSwimlanes, fetchAgents, navigate]);

  useEffect(() => {
    if (boardId) {
      fetchBoard(boardId);
      fetchSwimlanes(boardId);
      fetchAgents(boardId);
    }
  }, [boardId, fetchBoard, fetchSwimlanes, fetchAgents]);

  useEffect(() => {
    const runningAgents = Array.from(agents.values()).filter(
      (a) => a.status === 'running' || a.status === 'error',
    );
    for (const agent of runningAgents) {
      fetchLatestLogs(agent.id);
    }
  }, [agents, fetchLatestLogs]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const agent = agents.get(event.active.id as string);
      if (agent) setActiveAgent(agent);
    },
    [agents],
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
      const targetLane = swimlanes.find((l) => l.id === overId);
      if (!targetLane || targetLane.id === originalSwimlaneId) return;

      const laneAgents = Array.from(agents.values())
        .filter((a) => a.swimlaneId === targetLane.id)
        .sort((a, b) => a.position - b.position);
      const newPosition = laneAgents.length;

      optimisticMove(agentId, targetLane.id, newPosition);

      try {
        await commitMove(agentId, targetLane.id, newPosition);
      } catch {
        rollbackMove(agentId, originalSwimlaneId, originalPosition);
      }
    },
    [agents, swimlanes, optimisticMove, commitMove, rollbackMove],
  );

  const sortedLanes = [...swimlanes].sort((a, b) => a.position - b.position);
  const allAgents = Array.from(agents.values());
  const hasAgents = allAgents.length > 0;

  if (loading && sortedLanes.length === 0) {
    return (
      <div data-testid="kanban-board" className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
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
      <div data-testid="kanban-board" className="flex h-full gap-4 overflow-x-auto p-4">
        {sortedLanes.map((lane) => {
          const laneAgents = allAgents
            .filter((a) => a.swimlaneId === lane.id)
            .sort((a, b) => a.position - b.position);
          const isCollapsed = collapsedLanes.has(lane.id);

          return (
            <Swimlane key={lane.id} lane={lane} agents={laneAgents} isCollapsed={isCollapsed} />
          );
        })}
      </div>
      <DragOverlay>{activeAgent ? <DragOverlayCard agent={activeAgent} /> : null}</DragOverlay>
    </DndContext>
  );
}
