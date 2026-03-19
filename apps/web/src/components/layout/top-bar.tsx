import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Blocks, Plus, Settings } from 'lucide-react';
import { useBoardStore } from '../../stores/board-store.js';
import { useUiStore } from '../../stores/ui-store.js';
import { AgentCreateDialog } from '../agent/agent-create-dialog.js';
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
          <span className="text-sm font-semibold text-text-primary">Command Center</span>
        </div>

        {/* Center: Board selector */}
        <div className="flex items-center">
          <select
            className={cn(
              'rounded-md border border-border bg-surface px-3 py-1 text-sm text-text-primary',
              'hover:border-border-strong focus:border-accent focus:outline-none',
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
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openDialog}
            className={cn(
              'flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white',
              'hover:bg-accent-hover transition-colors',
            )}
          >
            <Plus className="h-4 w-4" />
            New Agent
          </button>
          <Link
            to="/settings"
            className={cn(
              'rounded-md p-1.5 text-text-secondary',
              'hover:bg-surface-hover hover:text-text-primary transition-colors',
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
