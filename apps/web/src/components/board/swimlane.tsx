import { memo, useMemo, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion';
import type { SwimlaneResponse, AgentResponse } from '@command-center/shared';
import { useUiStore } from '../../stores/ui-store.js';
import { AgentCard } from './agent-card.js';
import { EmptyLane } from './empty-lane.js';

interface SwimlaneProps {
  lane: SwimlaneResponse;
  agents: AgentResponse[];
  isCollapsed: boolean;
}

export const Swimlane = memo(function Swimlane({ lane, agents, isCollapsed }: SwimlaneProps) {
  const toggleLaneCollapse = useUiStore((s) => s.toggleLaneCollapse);
  const { setNodeRef, isOver } = useDroppable({ id: lane.id });
  const prefersReducedMotion = useReducedMotion();

  const agentIds = useMemo(() => agents.map((a) => a.id), [agents]);

  const handleToggle = useCallback(() => {
    toggleLaneCollapse(lane.id);
  }, [toggleLaneCollapse, lane.id]);

  return (
    <div
      data-testid={`swimlane-${lane.slug}`}
      className="flex w-72 shrink-0 flex-col rounded-lg bg-surface/50 overflow-hidden"
    >
      <div
        className="h-1 w-full shrink-0"
        style={{ backgroundColor: lane.color }}
      />
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
          )}
          <span className="text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
            {lane.name}
          </span>
        </div>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-text-tertiary">
          {agents.length}
        </span>
      </div>

      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-2 p-3 pt-0 min-h-[100px] rounded-b-lg transition-colors ${
            isOver ? 'bg-accent/5 border-2 border-dashed border-accent' : ''
          }`}
        >
          <SortableContext items={agentIds} strategy={verticalListSortingStrategy}>
            {prefersReducedMotion ? (
              agents.length === 0 ? (
                <EmptyLane />
              ) : (
                <div className="flex flex-col gap-2">
                  {agents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              )
            ) : (
              <LayoutGroup>
                {agents.length === 0 ? (
                  <EmptyLane />
                ) : (
                  <motion.div className="flex flex-col gap-2">
                    {agents.map((agent) => (
                      <AgentCard key={agent.id} agent={agent} />
                    ))}
                  </motion.div>
                )}
              </LayoutGroup>
            )}
          </SortableContext>
        </div>
      )}
    </div>
  );
});
