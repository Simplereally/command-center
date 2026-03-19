import { axe } from 'vitest-axe';
import type { SwimlaneResponse, AgentResponse } from '@command-center/shared';
import { customRender as render, screen } from '../../test/render.js';
import { Swimlane } from './swimlane.js';

const mockToggleLaneCollapse = vi.fn();

vi.mock('../../stores/ui-store.js', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      toggleLaneCollapse: mockToggleLaneCollapse,
    }),
}));

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

describe('Swimlane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows lane name and agent count badge', () => {
    const lane = makeSwimlane({ name: 'In Progress', slug: 'in-progress' });
    const agents = [makeAgent({ id: 'agent-1' }), makeAgent({ id: 'agent-2' })];

    render(<Swimlane lane={lane} agents={agents} isCollapsed={false} />);

    expect(screen.getByTestId('swimlane-in-progress')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows AgentCards for agents in lane', () => {
    const lane = makeSwimlane();
    const agents = [
      makeAgent({ id: 'agent-1', name: 'Agent Alpha' }),
      makeAgent({ id: 'agent-2', name: 'Agent Beta' }),
    ];

    render(<Swimlane lane={lane} agents={agents} isCollapsed={false} />);

    expect(screen.getByTestId('agent-card-agent-1')).toBeInTheDocument();
    expect(screen.getByTestId('agent-card-agent-2')).toBeInTheDocument();
    expect(screen.getByText('Agent Alpha')).toBeInTheDocument();
    expect(screen.getByText('Agent Beta')).toBeInTheDocument();
  });

  it('shows EmptyLane when no agents', () => {
    const lane = makeSwimlane();

    render(<Swimlane lane={lane} agents={[]} isCollapsed={false} />);

    expect(screen.getByTestId('empty-lane')).toBeInTheDocument();
    expect(screen.getByText('Drag an agent here')).toBeInTheDocument();
  });

  it('toggle collapse works', async () => {
    const lane = makeSwimlane({ id: 'lane-1' });
    const { user } = render(<Swimlane lane={lane} agents={[]} isCollapsed={false} />);

    const header = screen.getByText('Not Started').closest('div')?.parentElement;
    if (header) {
      await user.click(header);
    }

    expect(mockToggleLaneCollapse).toHaveBeenCalledWith('lane-1');
  });

  it('collapsed state hides agent list', () => {
    const lane = makeSwimlane();
    const agents = [makeAgent({ id: 'agent-1', name: 'Hidden Agent' })];

    render(<Swimlane lane={lane} agents={agents} isCollapsed={true} />);

    expect(screen.queryByTestId('agent-card-agent-1')).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden Agent')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-lane')).not.toBeInTheDocument();
  });

  it('shows zero count badge when no agents', () => {
    const lane = makeSwimlane();

    render(<Swimlane lane={lane} agents={[]} isCollapsed={false} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should have no accessibility violations with agents', async () => {
    const lane = makeSwimlane({ name: 'In Progress', slug: 'in-progress' });
    const agents = [
      makeAgent({ id: 'agent-1', name: 'Agent Alpha' }),
      makeAgent({ id: 'agent-2', name: 'Agent Beta' }),
    ];

    const { container } = render(<Swimlane lane={lane} agents={agents} isCollapsed={false} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when collapsed', async () => {
    const lane = makeSwimlane();
    const agents = [makeAgent({ id: 'agent-1', name: 'Hidden Agent' })];

    const { container } = render(<Swimlane lane={lane} agents={agents} isCollapsed={true} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations in empty state', async () => {
    const lane = makeSwimlane();

    const { container } = render(<Swimlane lane={lane} agents={[]} isCollapsed={false} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
