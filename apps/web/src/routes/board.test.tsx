import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen } from '@testing-library/react';
import { BoardPage } from './board.js';

vi.mock('../stores/board-store.js', () => ({
  useBoardStore: vi.fn(() => null),
  boardStore: {},
}));

vi.mock('../stores/agent-store.js', () => ({
  useAgentStore: vi.fn(() => new Map()),
  agentStore: {},
}));

vi.mock('../stores/ui-store.js', () => ({
  useUiStore: vi.fn(() => 'closed'),
}));

import { useBoardStore } from '../stores/board-store.js';
import { useAgentStore } from '../stores/agent-store.js';
import { useUiStore } from '../stores/ui-store.js';

function renderBoard(boardId = 'test-board-1') {
  const mockUseBoardStore = vi.mocked(useBoardStore);
  const mockUseAgentStore = vi.mocked(useAgentStore);
  const mockUseUiStore = vi.mocked(useUiStore);

  mockUseBoardStore.mockImplementation(((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      boards: [],
      currentBoard: { id: boardId, name: 'Test Board', createdAt: '', updatedAt: '' },
      swimlanes: [],
      loading: false,
      error: null,
      fetchBoards: vi.fn(),
      fetchBoard: vi.fn(),
      fetchSwimlanes: vi.fn(),
      createBoard: vi.fn(),
      setCurrentBoard: vi.fn(),
      getSwimlaneBySlug: vi.fn(),
      getSwimlaneById: vi.fn(),
    })) as never);

  mockUseAgentStore.mockImplementation(((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      agents: new Map(),
      loading: false,
      error: null,
      fetchAgents: vi.fn(),
      createAgent: vi.fn(),
      deleteAgent: vi.fn(),
      startAgent: vi.fn(),
      stopAgent: vi.fn(),
      restartAgent: vi.fn(),
      optimisticMove: vi.fn(),
      rollbackMove: vi.fn(),
      commitMove: vi.fn(),
      getAgentsByLane: vi.fn(() => []),
      getAgentById: vi.fn(),
    })) as never);

  mockUseUiStore.mockImplementation(((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      sidePanelMode: 'closed',
      sidePanelWidth: 40,
      selectedAgentId: null,
      viewMode: 'board',
      commandPaletteOpen: false,
      collapsedLanes: new Set(),
      openDetailPanel: vi.fn(),
      openTerminalPanel: vi.fn(),
      closeSidePanel: vi.fn(),
      setSidePanelWidth: vi.fn(),
      selectAgent: vi.fn(),
      setViewMode: vi.fn(),
      toggleCommandPalette: vi.fn(),
      openCommandPalette: vi.fn(),
      closeCommandPalette: vi.fn(),
      toggleLaneCollapse: vi.fn(),
      isLaneCollapsed: vi.fn(),
    })) as never);

  return render(
    <MemoryRouter initialEntries={[`/boards/${boardId}`]}>
      <Routes>
        <Route path="/boards/:boardId" element={<BoardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BoardPage', () => {
  it('renders within AppShell layout', () => {
    renderBoard();

    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
  });

  it('renders TopBar with Command Center title', () => {
    renderBoard();

    expect(screen.getByText('Command Center')).toBeInTheDocument();
  });

  it('renders StatusBar', () => {
    renderBoard();

    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });

  it('renders KanbanBoard', () => {
    renderBoard();

    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
  });

  it('does not show SidePanel when closed', () => {
    renderBoard();

    expect(screen.queryByTestId('side-panel')).not.toBeInTheDocument();
  });
});
