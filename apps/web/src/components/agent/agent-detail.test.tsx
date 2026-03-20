import type { AgentResponse } from '@command-center/shared';
import { customRender as render, screen } from '../../test/render.js';
import { AgentDetail } from './agent-detail.js';

const mockUpdateAgent = vi.fn();

vi.mock('./agent-log-viewer.js', () => ({
  AgentLogViewer: ({ agentId }: { agentId: string }) => (
    <div data-testid="agent-log-viewer" data-agent-id={agentId} />
  ),
}));

vi.mock('./agent-actions.js', () => ({
  AgentActions: ({ agent }: { agent: AgentResponse }) => (
    <div data-testid="agent-actions" data-agent-id={agent.id} />
  ),
}));

vi.mock('./agent-metrics.js', () => ({
  AgentMetrics: ({ agentId }: { agentId: string }) => (
    <div data-testid="agent-metrics" data-agent-id={agentId} />
  ),
}));

vi.mock('./agent-config-form.js', () => ({
  AgentConfigForm: ({ agent, onSave }: { agent: AgentResponse; onSave: () => void }) => (
    <div data-testid="agent-config-form" data-agent-id={agent.id} data-onsave={typeof onSave} />
  ),
}));

vi.mock('../../stores/agent-store.js', () => ({
  useAgentStore: () => ({
    updateAgent: mockUpdateAgent,
  }),
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

describe('AgentDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows agent name and status', () => {
    render(<AgentDetail agent={makeAgent({ name: 'My Agent', status: 'running' })} />);

    expect(screen.getByTestId('agent-detail')).toBeInTheDocument();
    expect(screen.getByText('My Agent')).toBeInTheDocument();
    expect(screen.getByTestId('agent-status-badge')).toHaveTextContent('Running');
  });

  it('renders AgentActions component', () => {
    render(<AgentDetail agent={makeAgent({ id: 'agent-42' })} />);

    const actions = screen.getByTestId('agent-actions');
    expect(actions).toBeInTheDocument();
    expect(actions).toHaveAttribute('data-agent-id', 'agent-42');
  });

  it('renders AgentMetrics component', () => {
    render(<AgentDetail agent={makeAgent({ id: 'agent-42' })} />);

    const metrics = screen.getByTestId('agent-metrics');
    expect(metrics).toBeInTheDocument();
    expect(metrics).toHaveAttribute('data-agent-id', 'agent-42');
  });

  it('renders AgentConfigForm component', () => {
    render(<AgentDetail agent={makeAgent({ id: 'agent-42' })} />);

    const configForm = screen.getByTestId('agent-config-form');
    expect(configForm).toBeInTheDocument();
    expect(configForm).toHaveAttribute('data-agent-id', 'agent-42');
    expect(configForm).toHaveAttribute('data-onsave', 'function');
  });

  it('shows "Default" for missing command', () => {
    render(<AgentDetail agent={makeAgent({ command: null })} />);

    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows command when set', () => {
    render(<AgentDetail agent={makeAgent({ command: 'npm run dev' })} />);

    expect(screen.getByText('npm run dev')).toBeInTheDocument();
  });

  it('shows em dash for missing PID', () => {
    render(<AgentDetail agent={makeAgent({ pid: null })} />);

    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('shows PID when set', () => {
    render(<AgentDetail agent={makeAgent({ pid: 12345 })} />);

    expect(screen.getByText('12345')).toBeInTheDocument();
  });

  it('shows log viewer for running agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'running' })} />);

    expect(screen.getByTestId('agent-log-viewer')).toBeInTheDocument();
  });

  it('shows log viewer for error agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'error' })} />);

    expect(screen.getByTestId('agent-log-viewer')).toBeInTheDocument();
  });

  it('does not show log viewer for idle agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'idle' })} />);

    expect(screen.queryByTestId('agent-log-viewer')).not.toBeInTheDocument();
  });

  it('does not show log viewer for stopped agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'stopped' })} />);

    expect(screen.queryByTestId('agent-log-viewer')).not.toBeInTheDocument();
  });

  it('shows created and updated dates', () => {
    render(
      <AgentDetail
        agent={makeAgent({
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        })}
      />,
    );

    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });
});
