import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Blocks, Plus, Search, Settings } from 'lucide-react';
import { useBoardStore } from '../../stores/board-store.js';
import { useUiStore } from '../../stores/ui-store.js';
import { AgentCreateDialog } from '../agent/agent-create-dialog.js';
import { ViewModeToggle } from './view-mode-toggle.js';
import { cn } from '../../lib/cn.js';

export function TopBar() {
  const currentBoard = useBoardStore((s) => s.currentBoard);
  const boards = useBoardStore((s) => s.boards);
  const fetchBoards = useBoardStore((s) => s.fetchBoards);
  const swimlanes = useBoardStore((s) => s.swimlanes);
  const dialogOpen = useUiStore((s) => s.createAgentDialogOpen);
  const openDialog = useUiStore((s) => s.openCreateAgentDialog);
  const closeDialog = useUiStore((s) => s.closeCreateAgentDialog);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const notStartedSwimlane = swimlanes.find((s) => s.slug === 'not-started');

  return (
    <>
      <header
        data-testid="top-bar"
        className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4"
      >
        {/* Left: App title */}
        <div className="flex items-center gap-2">
          <Blocks className="h-5 w-5 text-accent" />
          <span className="text-lg font-bold text-text-primary">Command Center</span>
        </div>

        {/* Center: Board selector + View mode toggle */}
        <div className="flex items-center gap-3">
          <select
            className={cn(
              'rounded-md border border-border bg-surface px-3 py-1 text-sm text-text-primary',
              'hover:border-border-strong focus:border-accent focus:outline-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
            value={currentBoard?.id ?? ''}
            onChange={(e) => {
              const boardId = e.target.value;
              if (boardId) {
                navigate(`/boards/${boardId}`);
              }
            }}
            aria-label="Select board"
          >
            {!currentBoard && <option value="">No board selected</option>}
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
          <ViewModeToggle />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openDialog}
            className={cn(
              'flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white',
              'hover:bg-accent-hover transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            <Plus className="h-4 w-4" />
            New Agent
          </button>
          <button
            type="button"
            onClick={() => useUiStore.getState().openCommandPalette()}
            className={cn(
              'flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-text-secondary',
              'hover:border-border-strong hover:bg-surface-hover hover:text-text-primary transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
              ⌘K
            </kbd>
          </button>
          <Link
            to="/settings"
            className={cn(
              'rounded-md p-1.5 text-text-secondary',
              'hover:bg-surface-hover hover:text-text-primary transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>
      <AgentCreateDialog
        open={dialogOpen}
        onClose={closeDialog}
        boardId={currentBoard?.id ?? ''}
        swimlaneId={notStartedSwimlane?.id ?? ''}
      />
    </>
  );
}
