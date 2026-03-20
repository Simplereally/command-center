import { useCallback, memo } from 'react';
import { Search, X } from 'lucide-react';
import { useUiStore } from '../../stores/ui-store.js';
import { cn } from '../../lib/cn.js';

const STATUS_OPTIONS = ['running', 'error', 'idle', 'completed'] as const;

const STATUS_LABELS: Record<string, string> = {
  running: 'Running',
  error: 'Error',
  idle: 'Idle',
  completed: 'Completed',
};

interface BoardFilterBarProps {
  resultCount: number;
  totalCount: number;
}

export const BoardFilterBar = memo(function BoardFilterBar({
  resultCount,
  totalCount,
}: BoardFilterBarProps) {
  const searchQuery = useUiStore((s) => s.searchQuery);
  const statusFilters = useUiStore((s) => s.statusFilters);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const toggleStatusFilter = useUiStore((s) => s.toggleStatusFilter);
  const clearFilters = useUiStore((s) => s.clearFilters);

  const hasActiveFilters = searchQuery.length > 0 || statusFilters.size > 0;
  const isFiltered = hasActiveFilters && resultCount !== totalCount;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery],
  );

  return (
    <div
      data-testid="board-filter-bar"
      className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2"
    >
      <div className="relative flex-shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={handleSearchChange}
          data-testid="filter-search-input"
          className={cn(
            'h-8 w-56 rounded-md border border-border bg-background pl-8 pr-3 text-sm text-text-primary placeholder:text-text-tertiary',
            'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
          )}
        />
      </div>

      <div className="flex items-center gap-1.5">
        {STATUS_OPTIONS.map((status) => {
          const isActive = statusFilters.has(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatusFilter(status)}
              data-testid={`filter-status-${status}`}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                isActive
                  ? 'bg-accent text-white'
                  : 'bg-surface-hover text-text-secondary hover:bg-border hover:text-text-primary',
              )}
            >
              {STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {isFiltered && (
          <span data-testid="filter-result-count" className="text-xs text-text-tertiary">
            {resultCount} of {totalCount}
          </span>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            data-testid="filter-clear-button"
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-secondary',
              'hover:bg-surface-hover hover:text-text-primary transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
});
