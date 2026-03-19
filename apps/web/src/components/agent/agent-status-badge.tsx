import type { AgentStatus } from '@command-center/shared';
import { cn } from '../../lib/cn.js';

interface AgentStatusBadgeProps {
  status: AgentStatus;
  className?: string;
}

const statusConfig: Record<AgentStatus, { bg: string; text: string; label: string }> = {
  idle: { bg: 'bg-status-idle/15', text: 'text-status-idle', label: 'Idle' },
  starting: { bg: 'bg-status-starting/15', text: 'text-status-starting', label: 'In Progress' },
  running: { bg: 'bg-status-running/15', text: 'text-status-running', label: 'Running' },
  paused: { bg: 'bg-status-paused/15', text: 'text-status-paused', label: 'Paused' },
  stopping: { bg: 'bg-status-stopping/15', text: 'text-status-stopping', label: 'Stopping' },
  stopped: { bg: 'bg-status-idle/15', text: 'text-status-idle', label: 'Stopped' },
  error: { bg: 'bg-status-error/15', text: 'text-status-error', label: 'Error' },
  completed: { bg: 'bg-status-completed/15', text: 'text-status-completed', label: 'Completed' },
};

export function AgentStatusBadge({ status, className }: AgentStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      data-testid="agent-status-badge"
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.bg,
        config.text,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
