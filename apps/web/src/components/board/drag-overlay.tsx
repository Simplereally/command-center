import { motion } from 'framer-motion';
import type { AgentResponse } from '@command-center/shared';
import { StatusDot } from '../ui/status-dot.js';

interface DragOverlayCardProps {
  agent: AgentResponse;
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
};

export function DragOverlayCard({ agent }: DragOverlayCardProps) {
  return (
    <motion.div
      data-testid="drag-overlay"
      className="w-72 rounded-lg border border-accent bg-surface p-3 shadow-lg"
      style={{ scale: 1.03 }}
      layoutId={`agent-${agent.id}`}
      transition={springTransition}
    >
      <div className="flex items-center gap-2">
        <StatusDot status={agent.status} size="sm" />
        <span className="text-sm font-semibold text-text-primary truncate">{agent.name}</span>
      </div>
      {agent.command && (
        <div className="mt-1.5">
          <span className="text-xs font-mono text-text-tertiary truncate block">
            {agent.command}
          </span>
        </div>
      )}
    </motion.div>
  );
}
