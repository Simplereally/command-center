import type { ReactNode } from 'react';
import { cn } from '../../lib/cn.js';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12',
        className,
      )}
    >
      {icon && (
        <span className="w-12 h-12 text-text-tertiary flex items-center justify-center">
          {icon}
        </span>
      )}
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm text-center">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
