import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen } from '@testing-library/react';
import { BoardPage } from './board.js';

const {
  mockBoardStoreState,
  mockAgentStoreState,
  mockUiStoreState,
} = vi.hoisted(() => {
  const mockBoardStoreState = {
    boards: [] as unknown[],
    currentBoard: null as Record<string, unknown> | null,
    swimlanes: [] as unknown[],
    loading: false,
    error: null,
    fetchBoards: vi.fn().mockResolvedValue(undefined),
    fetchBoard: vi.fn().mockResolvedValue(undefined),
    fetchSwimlanes: vi.fn().mockResolvedValue(undefined),
    createBoard: vi.fn(),
    setCurrentBoard: vi.fn(),
    getSwimlaneBySlug: vi.fn(),
    getSwimlaneById: vi.fn(),
  };

  const mockAgentStoreState = {
    agents: new Map(),
    logs: new Map(),
    loading: false,
    error: null,
    fetchAgents: vi.fn().mockResolvedValue(undefined),
    fetchLatestLogs: vi.fn().mockResolvedValue(undefined),
    createAgent: vi.fn().mockResolvedValue(undefined),
    deleteAgent: vi.fn().mockResolvedValue(undefined),
    startAgent: vi.fn().mockResolvedValue(undefined),
    stopAgent: vi.fn().mockResolvedValue(undefined),
    restartAgent: vi.fn().mockResolvedValue(undefined),
    optimisticMove: vi.fn(),
    rollbackMove: vi.fn(),
    commitMove: vi.fn().mockResolvedValue(undefined),
    getAgentsByLane: vi.fn(() => []),
    getAgentById: vi.fn(),
  };

  const mockUiStoreState = {
    sidePanelMode: 'closed',
    sidePanelWidth: 40,
    selectedAgentId: null,
    viewMode: 'board',
    commandPaletteOpen: false,
    collapsedLanes: new Set(),
    selectedSwimlaneIndex: 0,
    selectedCardIndexByLane: new Map(),
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
    createAgentDialogOpen: false,
    openCreateAgentDialog: vi.fn(),
    closeCreateAgentDialog: vi.fn(),
    setSelectedSwimlaneIndex: vi.fn(),
    setSelectedCardIndex: vi.fn(),
  };

  return { mockBoardStoreState, mockAgentStoreState, mockUiStoreState };
});

vi.mock('../stores/board-store.js', () => {
  const fn = (selector?: (s: typeof mockBoardStoreState) => unknown) =>
    selector ? selector(mockBoardStoreState) : mockBoardStoreState;
  fn.getState = () => mockBoardStoreState;
  return { useBoardStore: fn, boardStore: fn };
});

vi.mock('../stores/agent-store.js', () => {
  const fn = (selector?: (s: typeof mockAgentStoreState) => unknown) =>
    selector ? selector(mockAgentStoreState) : mockAgentStoreState;
  fn.getState = () => mockAgentStoreState;
  return { useAgentStore: fn, agentStore: fn };
});

vi.mock('../stores/ui-store.js', () => {
  const fn = (selector?: (s: typeof mockUiStoreState) => unknown) =>
    selector ? selector(mockUiStoreState) : mockUiStoreState;
  fn.getState = () => mockUiStoreState;
  return { useUiStore: fn };
});

function renderBoard(boardId = 'test-board-1') {
  mockBoardStoreState.currentBoard = { id: boardId, name: 'Test Board', createdAt: '', updatedAt: '' };

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
