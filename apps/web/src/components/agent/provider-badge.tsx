import { Terminal, Code, GitBranch, Settings, type LucideIcon } from 'lucide-react';
import { getProviderForModel } from '@command-center/shared';
import { cn } from '../../lib/cn.js';

const ICON_MAP: Record<string, LucideIcon> = {
  Terminal,
  Code,
  GitBranch,
  Settings,
};

interface ProviderBadgeProps {
  model: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProviderBadge({ model, size = 'sm', className }: ProviderBadgeProps) {
  if (!model) return null;

  const provider = getProviderForModel(model);
  const IconComponent = provider ? (ICON_MAP[provider.icon] ?? Settings) : null;
  const displayName = provider
    ? provider.models.find((m) => m.id === model)?.name ?? model
    : model;

  return (
    <span
      data-testid="provider-badge"
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-accent-muted font-mono text-accent',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className,
      )}
    >
      {IconComponent && (
        <IconComponent
          className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')}
          data-testid="provider-badge-icon"
        />
      )}
      {displayName}
    </span>
  );
}

interface ProviderInfoProps {
  model: string | null;
}

export function ProviderInfo({ model }: ProviderInfoProps) {
  if (!model) return null;

  const provider = getProviderForModel(model);
  if (!provider) {
    return (
      <div data-testid="provider-info" className="flex items-center gap-2">
        <ProviderBadge model={model} size="md" />
      </div>
    );
  }

  const IconComponent = ICON_MAP[provider.icon] ?? Settings;
  const modelName = provider.models.find((m) => m.id === model)?.name ?? model;

  return (
    <div data-testid="provider-info" className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-muted">
          <IconComponent className="h-3.5 w-3.5 text-accent" />
        </div>
        <span className="text-sm font-medium text-text-primary">{provider.name}</span>
        <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs font-mono text-accent">
          {modelName}
        </span>
      </div>
    </div>
  );
}
