import { axe } from 'vitest-axe';
import type { AgentResponse } from '@command-center/shared';
import { customRender as render, screen } from '../../test/render.js';
import { SidePanel } from './side-panel.js';
import { useUiStore } from '../../stores/ui-store.js';
import { useAgentStore } from '../../stores/agent-store.js';

const mockCloseSidePanel = vi.fn();

vi.mock('../../stores/ui-store.js', () => ({
  useUiStore: vi.fn(),
}));

vi.mock('../../stores/agent-store.js', () => ({
  useAgentStore: vi.fn(),
}));

vi.mock('../agent/agent-detail.js', () => ({
  AgentDetail: ({ agent }: { agent: AgentResponse }) => (
    <div data-testid="agent-detail">{agent.name}</div>
  ),
}));

vi.mock('../terminal/terminal-panel.js', () => ({
  TerminalPanel: () => <div data-testid="terminal-panel">Terminal Panel Mock</div>,
}));

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

function mockUiState(overrides: Record<string, unknown>) {
  vi.mocked(useUiStore).mockImplementation(((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      sidePanelMode: 'closed',
      selectedAgentId: null,
      closeSidePanel: mockCloseSidePanel,
      ...overrides,
    })) as never);
}

function mockAgentState(agents: Map<string, AgentResponse>) {
  vi.mocked(useAgentStore).mockImplementation(((
    selector: (s: Record<string, unknown>) => unknown,
  ) => selector({ agents })) as never);
}

describe('SidePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when mode is closed', () => {
    mockUiState({ sidePanelMode: 'closed' });
    mockAgentState(new Map());

    const { container } = render(<SidePanel />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "Agent Detail" header in detail mode', () => {
    mockUiState({ sidePanelMode: 'detail', selectedAgentId: null });
    mockAgentState(new Map());

    render(<SidePanel />);

    expect(screen.getByText('Agent Detail')).toBeInTheDocument();
  });

  it('shows "Terminal" header in terminal mode', () => {
    mockUiState({ sidePanelMode: 'terminal', selectedAgentId: null });
    mockAgentState(new Map());

    render(<SidePanel />);

    expect(screen.getByText('Terminal')).toBeInTheDocument();
  });

  it('shows close button', () => {
    mockUiState({ sidePanelMode: 'detail' });
    mockAgentState(new Map());

    render(<SidePanel />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders AgentDetail when agent selected in detail mode', () => {
    const agent = makeAgent({ id: 'agent-1', name: 'Selected Agent' });

    mockUiState({ sidePanelMode: 'detail', selectedAgentId: 'agent-1' });
    mockAgentState(new Map([['agent-1', agent]]));

    render(<SidePanel />);

    expect(screen.getByTestId('agent-detail')).toBeInTheDocument();
    expect(screen.getByText('Selected Agent')).toBeInTheDocument();
  });

  it('shows placeholder text when no agent selected in detail mode', () => {
    mockUiState({ sidePanelMode: 'detail', selectedAgentId: null });
    mockAgentState(new Map());

    render(<SidePanel />);

    expect(screen.getByText('Select an agent to view details')).toBeInTheDocument();
  });

  it('shows "No agent selected" in terminal mode without agent', () => {
    mockUiState({ sidePanelMode: 'terminal', selectedAgentId: null });
    mockAgentState(new Map());

    render(<SidePanel />);

    expect(screen.getByText('No agent selected')).toBeInTheDocument();
  });

  it('renders TerminalPanel in terminal mode with selected agent', () => {
    const agent = makeAgent({ id: 'agent-1', name: 'Test Agent', tmuxSession: 'test-tmux-session' });
    mockUiState({ sidePanelMode: 'terminal', selectedAgentId: 'agent-1' });
    mockAgentState(new Map([['agent-1', agent]]));

    render(<SidePanel />);

    expect(screen.getByTestId('terminal-panel')).toBeInTheDocument();
  });

  it('close button calls closeSidePanel', async () => {
    mockUiState({ sidePanelMode: 'detail' });
    mockAgentState(new Map());

    const { user } = render(<SidePanel />);

    await user.click(screen.getByRole('button'));
    expect(mockCloseSidePanel).toHaveBeenCalledOnce();
  });

  it('should have no accessibility violations in detail mode', async () => {
    mockUiState({ sidePanelMode: 'detail' });
    mockAgentState(new Map());

    const { container } = render(<SidePanel />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with agent selected', async () => {
    const agent = makeAgent({ id: 'agent-1', name: 'Selected Agent' });
    mockUiState({ sidePanelMode: 'detail', selectedAgentId: 'agent-1' });
    mockAgentState(new Map([['agent-1', agent]]));

    const { container } = render(<SidePanel />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations in terminal mode', async () => {
    mockUiState({ sidePanelMode: 'terminal' });
    mockAgentState(new Map());

    const { container } = render(<SidePanel />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
