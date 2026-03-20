import { X, Plus } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export type TabConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export interface TerminalTab {
  id: string;
  name: string;
  sessionId: string;
  isActive?: boolean;
  status?: TabConnectionStatus;
}

export interface TerminalTabsProps {
  tabs: TerminalTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  className?: string;
}

export function TerminalTabs({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  className,
}: TerminalTabsProps) {
  return (
    <div
      data-testid="terminal-tabs"
      className={cn(
        'flex h-9 items-center gap-1 border-b border-border bg-surface px-2',
        className,
      )}
      role="tablist"
      aria-label="Terminal sessions"
    >
      <div className="flex flex-1 items-center overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTabId}
            data-testid={`terminal-tab-${tab.id}`}
            data-active={tab.id === activeTabId}
            onClick={() => onTabSelect(tab.id)}
            className={cn(
              'group flex h-8 min-w-[120px] max-w-[200px] items-center gap-2 rounded-t-md px-3 text-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              tab.id === activeTabId
                ? 'border-b-2 border-accent bg-surface-hover text-text-primary'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            )}
          >
            {tab.status && (
              <span
                className={cn(
                  'h-2 w-2 flex-shrink-0 rounded-full',
                  tab.status === 'connected' && 'bg-[var(--status-running,hsl(142_71%_45%))]',
                  tab.status === 'disconnected' && 'bg-[var(--status-error,hsl(0_62%_55%))]',
                  tab.status === 'connecting' && 'bg-[var(--status-starting,hsl(217_91%_60%))] animate-pulse',
                )}
                aria-label={`Status: ${tab.status}`}
              />
            )}
            <span className="truncate">{tab.name}</span>
            <span
              data-testid={`terminal-tab-close-${tab.id}`}
              className="ml-auto rounded p-0.5 opacity-0 transition-opacity hover:bg-surface-hover group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }
              }}
              role="button"
              tabIndex={-1}
              aria-label={`Close ${tab.name}`}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onNewTab}
        className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="New terminal"
        data-testid="terminal-new-tab"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
