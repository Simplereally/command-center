import { LayoutDashboard, Terminal, Maximize2 } from 'lucide-react';
import { useUiStore, type ViewMode } from '../../stores/ui-store.js';
import { cn } from '../../lib/cn.js';

const modes: { mode: ViewMode; icon: typeof LayoutDashboard; label: string; shortcut: string }[] = [
  { mode: 'board', icon: LayoutDashboard, label: 'Board', shortcut: '⌘1' },
  { mode: 'terminal', icon: Terminal, label: 'Terminal', shortcut: '⌘2' },
  { mode: 'focus', icon: Maximize2, label: 'Focus', shortcut: '⌘3' },
];

export function ViewModeToggle() {
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);

  return (
    <div
      data-testid="view-mode-toggle"
      className="flex items-center rounded-lg border border-border bg-surface p-0.5"
      role="radiogroup"
      aria-label="View mode"
    >
      {modes.map(({ mode, icon: Icon, label, shortcut }) => {
        const active = viewMode === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} view (${shortcut})`}
            title={`${label} (${shortcut})`}
            onClick={() => setViewMode(mode)}
            className={cn(
              'group relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
            <kbd
              className={cn(
                'ml-0.5 hidden rounded px-1 py-0.5 font-mono text-[10px] leading-none group-hover:inline-block',
                active
                  ? 'bg-white/20 text-white/80'
                  : 'bg-surface-hover text-text-tertiary',
              )}
            >
              {shortcut}
            </kbd>
          </button>
        );
      })}
    </div>
  );
}
