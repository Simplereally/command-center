import type { SwimlaneResponse, AgentResponse } from '@command-center/shared';
import { customRender as render, screen } from '../../test/render.js';
import { KanbanBoard } from './kanban-board.js';

const mockFetchBoard = vi.fn();
const mockFetchSwimlanes = vi.fn();
const mockFetchAgents = vi.fn();
const mockFetchLatestLogs = vi.fn();

const { mockSwimlanes, mockAgents, mockLoading, mockCollapsedLanes, mockLogs } = vi.hoisted(() => ({
  mockSwimlanes: { value: [] as SwimlaneResponse[] },
  mockAgents: { value: new Map<string, AgentResponse>() },
  mockLoading: { value: false },
  mockCollapsedLanes: { value: new Set<string>() },
  mockLogs: { value: new Map<string, unknown[]>() },
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useParams: () => ({ boardId: 'board-1' }),
  };
});

vi.mock('../../stores/board-store.js', () => ({
  useBoardStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      swimlanes: mockSwimlanes.value,
      loading: mockLoading.value,
      fetchSwimlanes: mockFetchSwimlanes,
      fetchBoard: mockFetchBoard,
    }),
}));

vi.mock('../../stores/agent-store.js', () => ({
  useAgentStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      agents: mockAgents.value,
      logs: mockLogs.value,
      fetchAgents: mockFetchAgents,
      fetchLatestLogs: mockFetchLatestLogs,
    }),
}));

vi.mock('../../stores/ui-store.js', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      collapsedLanes: mockCollapsedLanes.value,
    }),
}));

vi.mock('@command-center/shared', async () => {
  const actual =
    await vi.importActual<typeof import('@command-center/shared')>('@command-center/shared');
  return {
    ...actual,
    SWIMLANE_DEFINITIONS: [
      { slug: 'not-started', name: 'Not Started', position: 0, color: 'hsl(240 3% 46%)' },
      { slug: 'in-progress', name: 'In Progress', position: 1, color: 'hsl(217 91% 60%)' },
      { slug: 'review', name: 'Review', position: 2, color: 'hsl(38 92% 55%)' },
      { slug: 'done', name: 'Done', position: 3, color: 'hsl(152 60% 52%)' },
    ],
  };
});

function makeSwimlane(overrides: Partial<SwimlaneResponse> = {}): SwimlaneResponse {
  return {
    id: 'lane-1',
    boardId: 'board-1',
    slug: 'not-started',
    name: 'Not Started',
    position: 0,
    color: 'hsl(240 3% 46%)',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

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
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('KanbanBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSwimlanes.value = [];
    mockAgents.value = new Map();
    mockLoading.value = false;
    mockCollapsedLanes.value = new Set();
    mockLogs.value = new Map();
  });

  it('renders kanban board container', () => {
    mockSwimlanes.value = [makeSwimlane()];
    mockAgents.value = new Map([['agent-1', makeAgent()]]);

    render(<KanbanBoard />);

    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
  });

  it('shows loading spinner when loading and no swimlanes', () => {
    mockLoading.value = true;
    mockSwimlanes.value = [];

    render(<KanbanBoard />);

    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-board').querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no agents', () => {
    mockSwimlanes.value = [makeSwimlane()];
    mockAgents.value = new Map();
    mockLoading.value = false;

    render(<KanbanBoard />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Create your first agent')).toBeInTheDocument();
  });

  it('renders swimlanes when data loaded', () => {
    const lane1 = makeSwimlane({
      id: 'lane-1',
      slug: 'not-started',
      name: 'Not Started',
      position: 0,
    });
    const lane2 = makeSwimlane({
      id: 'lane-2',
      slug: 'in-progress',
      name: 'In Progress',
      position: 1,
    });
    mockSwimlanes.value = [lane1, lane2];
    mockAgents.value = new Map([
      ['agent-1', makeAgent({ id: 'agent-1', swimlaneId: 'lane-1' })],
      ['agent-2', makeAgent({ id: 'agent-2', swimlaneId: 'lane-2' })],
    ]);
    mockLoading.value = false;

    render(<KanbanBoard />);

    expect(screen.getByTestId('swimlane-not-started')).toBeInTheDocument();
    expect(screen.getByTestId('swimlane-in-progress')).toBeInTheDocument();
  });

  it('calls fetchBoard, fetchSwimlanes, and fetchAgents on mount', () => {
    mockSwimlanes.value = [makeSwimlane()];
    mockAgents.value = new Map([['agent-1', makeAgent()]]);

    render(<KanbanBoard />);

    expect(mockFetchBoard).toHaveBeenCalledWith('board-1');
    expect(mockFetchSwimlanes).toHaveBeenCalledWith('board-1');
    expect(mockFetchAgents).toHaveBeenCalledWith('board-1');
  });
});
