import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { AgentResponse, SwimlaneResponse } from '@command-center/shared';

const mockAgents = new Map<string, AgentResponse>();
const mockLogs = new Map<string, unknown>();
const mockSwimlanes: SwimlaneResponse[] = [];
const mockOptimisticMove = vi.fn();
const mockRollbackMove = vi.fn();
const mockCommitMove = vi.fn();
const mockFetchBoard = vi.fn().mockResolvedValue(undefined);
const mockFetchSwimlanes = vi.fn().mockResolvedValue(undefined);
const mockFetchAgents = vi.fn().mockResolvedValue(undefined);
const mockFetchLatestLogs = vi.fn().mockResolvedValue(undefined);

vi.mock('../../stores/board-store.js', () => ({
  useBoardStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      swimlanes: mockSwimlanes,
      loading: false,
      fetchSwimlanes: mockFetchSwimlanes,
      fetchBoard: mockFetchBoard,
    };
    return selector(state);
  },
}));

vi.mock('../../stores/agent-store.js', () => ({
  useAgentStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      agents: mockAgents,
      logs: mockLogs,
      fetchAgents: mockFetchAgents,
      fetchLatestLogs: mockFetchLatestLogs,
      optimisticMove: mockOptimisticMove,
      rollbackMove: mockRollbackMove,
      commitMove: mockCommitMove,
    };
    return selector(state);
  },
}));

vi.mock('../../stores/ui-store.js', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      collapsedLanes: new Set<string>(),
    };
    return selector(state);
  },
}));

import { KanbanBoard } from './kanban-board.js';

function makeAgent(overrides: Partial<AgentResponse> = {}): AgentResponse {
  return {
    id: 'agent-1',
    name: 'Test Agent',
    status: 'idle',
    boardId: 'board-1',
    swimlaneId: 'lane-1',
    model: null,
    workingDir: null,
    envVars: null,
    command: null,
    tmuxSession: null,
    tmuxPaneId: null,
    pid: null,
    exitCode: null,
    errorMessage: null,
    startedAt: null,
    stoppedAt: null,
    position: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSwimlane(overrides: Partial<SwimlaneResponse> = {}): SwimlaneResponse {
  return {
    id: 'lane-1',
    boardId: 'board-1',
    slug: 'not-started',
    name: 'Not Started',
    position: 0,
    color: 'hsl(240 3% 46%)',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderBoard() {
  return render(
    <MemoryRouter initialEntries={['/board/board-1']}>
      <Routes>
        <Route path="/board/:boardId" element={<KanbanBoard />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('KanbanBoard DnD Integration', () => {
  beforeEach(() => {
    mockAgents.clear();
    mockSwimlanes.length = 0;
    vi.clearAllMocks();
  });

  it('renders the kanban board with DnD context', () => {
    mockSwimlanes.push(
      makeSwimlane({ id: 'lane-1', slug: 'not-started', name: 'Not Started', position: 0 }),
      makeSwimlane({ id: 'lane-2', slug: 'in-progress', name: 'In Progress', position: 1 }),
    );
    mockAgents.set('agent-1', makeAgent({ id: 'agent-1', name: 'Agent 1', swimlaneId: 'lane-1' }));

    renderBoard();

    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
  });

  it('renders swimlanes with droppable zones', () => {
    mockSwimlanes.push(
      makeSwimlane({ id: 'lane-1', slug: 'not-started', name: 'Not Started', position: 0 }),
      makeSwimlane({ id: 'lane-2', slug: 'in-progress', name: 'In Progress', position: 1 }),
    );
    mockAgents.set('agent-1', makeAgent({ id: 'agent-1', name: 'Agent 1', swimlaneId: 'lane-1' }));

    renderBoard();

    expect(screen.getByTestId('swimlane-not-started')).toBeInTheDocument();
    expect(screen.getByTestId('swimlane-in-progress')).toBeInTheDocument();
  });

  it('renders agent cards within swimlanes', () => {
    mockSwimlanes.push(
      makeSwimlane({ id: 'lane-1', slug: 'not-started', name: 'Not Started', position: 0 }),
    );
    mockAgents.set(
      'agent-1',
      makeAgent({ id: 'agent-1', name: 'Frontend Agent', swimlaneId: 'lane-1' }),
    );
    mockAgents.set(
      'agent-2',
      makeAgent({ id: 'agent-2', name: 'Backend Agent', swimlaneId: 'lane-1', position: 1 }),
    );

    renderBoard();

    expect(screen.getByTestId('agent-card-agent-1')).toBeInTheDocument();
    expect(screen.getByTestId('agent-card-agent-2')).toBeInTheDocument();
  });

  it('shows empty state when no agents exist', () => {
    mockSwimlanes.push(
      makeSwimlane({ id: 'lane-1', slug: 'not-started', name: 'Not Started', position: 0 }),
    );

    renderBoard();

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Create your first agent')).toBeInTheDocument();
  });

  it('renders board when swimlanes exist without agents', () => {
    mockSwimlanes.push(
      makeSwimlane({ id: 'lane-1', slug: 'not-started', name: 'Not Started', position: 0 }),
    );

    renderBoard();

    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
  });

  it('fetches board data on mount', () => {
    mockSwimlanes.push(
      makeSwimlane({ id: 'lane-1', slug: 'not-started', name: 'Not Started', position: 0 }),
    );
    mockAgents.set('agent-1', makeAgent({ id: 'agent-1', swimlaneId: 'lane-1' }));

    renderBoard();

    expect(mockFetchBoard).toHaveBeenCalledWith('board-1');
    expect(mockFetchSwimlanes).toHaveBeenCalledWith('board-1');
    expect(mockFetchAgents).toHaveBeenCalledWith('board-1');
  });

  it('renders swimlanes sorted by position', () => {
    mockSwimlanes.push(
      makeSwimlane({ id: 'lane-3', slug: 'done', name: 'Done', position: 3 }),
      makeSwimlane({ id: 'lane-1', slug: 'not-started', name: 'Not Started', position: 0 }),
      makeSwimlane({ id: 'lane-2', slug: 'in-progress', name: 'In Progress', position: 1 }),
    );
    mockAgents.set('agent-1', makeAgent({ id: 'agent-1', swimlaneId: 'lane-1' }));

    renderBoard();

    const lanes = screen.getAllByTestId(/^swimlane-/);
    expect(lanes[0]).toHaveAttribute('data-testid', 'swimlane-not-started');
    expect(lanes[1]).toHaveAttribute('data-testid', 'swimlane-in-progress');
    expect(lanes[2]).toHaveAttribute('data-testid', 'swimlane-done');
  });

  it('renders agents sorted by position within each lane', () => {
    mockSwimlanes.push(
      makeSwimlane({ id: 'lane-1', slug: 'not-started', name: 'Not Started', position: 0 }),
    );
    mockAgents.set(
      'agent-2',
      makeAgent({ id: 'agent-2', name: 'Second Agent', swimlaneId: 'lane-1', position: 1 }),
    );
    mockAgents.set(
      'agent-1',
      makeAgent({ id: 'agent-1', name: 'First Agent', swimlaneId: 'lane-1', position: 0 }),
    );

    renderBoard();

    const agentCards = screen.getAllByTestId(/^agent-card-/);
    expect(agentCards[0]).toHaveAttribute('data-testid', 'agent-card-agent-1');
    expect(agentCards[1]).toHaveAttribute('data-testid', 'agent-card-agent-2');
  });
});
