import { AppShell } from '../components/layout/app-shell.js';
import { KanbanBoard } from '../components/board/kanban-board.js';
import { ErrorBoundary } from '../components/error-boundary/index.js';

export function BoardPage() {
  return (
    <ErrorBoundary>
      <AppShell>
        <KanbanBoard />
      </AppShell>
    </ErrorBoundary>
  );
}
