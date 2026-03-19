import { motion, useReducedMotion } from 'framer-motion';
import type { AgentStatus } from '@command-center/shared';
import { cn } from '../../lib/cn.js';

const STATUS_COLOR_MAP: Record<AgentStatus, string> = {
  idle: 'bg-status-idle',
  starting: 'bg-status-starting',
  running: 'bg-status-running',
  paused: 'bg-status-paused',
  stopping: 'bg-status-stopping',
  stopped: 'bg-status-idle',
  error: 'bg-status-error',
  completed: 'bg-status-completed',
};

const SIZE_MAP = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
} as const;

export interface StatusDotProps {
  status: AgentStatus;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const pulseAnimation = {
  scale: [1, 1.15, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

export function StatusDot({ status, size = 'md', pulse = false, className }: StatusDotProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldPulse = pulse && status === 'running' && !prefersReducedMotion;

  const dot = (
    <span
      data-testid="status-dot"
      className={cn(
        'inline-block rounded-full',
        SIZE_MAP[size],
        STATUS_COLOR_MAP[status],
        className,
      )}
    />
  );

  if (shouldPulse) {
    return (
      <motion.span
        data-testid="status-dot"
        className={cn(
          'inline-block rounded-full',
          SIZE_MAP[size],
          STATUS_COLOR_MAP[status],
          className,
        )}
        animate={pulseAnimation}
      />
    );
  }

  return dot;
}
