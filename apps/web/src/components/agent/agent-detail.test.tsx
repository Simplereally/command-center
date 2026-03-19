import type { AgentResponse } from '@command-center/shared';
import { customRender as render, screen } from '../../test/render.js';
import { AgentDetail } from './agent-detail.js';

const mockStartAgent = vi.fn();
const mockStopAgent = vi.fn();
const mockRestartAgent = vi.fn();
const mockOpenTerminalPanel = vi.fn();

vi.mock('./agent-log-viewer.js', () => ({
  AgentLogViewer: ({ agentId }: { agentId: string }) => (
    <div data-testid="agent-log-viewer" data-agent-id={agentId} />
  ),
}));

vi.mock('../../stores/agent-store.js', () => ({
  useAgentStore: () => ({
    startAgent: mockStartAgent,
    stopAgent: mockStopAgent,
    restartAgent: mockRestartAgent,
  }),
}));

vi.mock('../../stores/ui-store.js', () => ({
  useUiStore: () => ({
    openTerminalPanel: mockOpenTerminalPanel,
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

  it('shows "Not set" for missing working directory', () => {
    render(<AgentDetail agent={makeAgent({ workingDir: null })} />);

    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('shows working directory when set', () => {
    render(<AgentDetail agent={makeAgent({ workingDir: '/home/user/project' })} />);

    expect(screen.getByText('/home/user/project')).toBeInTheDocument();
  });

  it('shows start button for idle agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'idle' })} />);

    const startButton = screen.getByRole('button', { name: /^start$/i });
    expect(startButton).toBeInTheDocument();
  });

  it('shows start button for stopped agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'stopped' })} />);

    const startButton = screen.getByRole('button', { name: /^start$/i });
    expect(startButton).toBeInTheDocument();
  });

  it('does not show start button for running agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'running' })} />);

    expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument();
  });

  it('shows stop button for running agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'running' })} />);

    const stopButton = screen.getByRole('button', { name: /^stop$/i });
    expect(stopButton).toBeInTheDocument();
  });

  it('shows stop button for paused agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'paused' })} />);

    const stopButton = screen.getByRole('button', { name: /^stop$/i });
    expect(stopButton).toBeInTheDocument();
  });

  it('does not show stop button for idle agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'idle' })} />);

    expect(screen.queryByRole('button', { name: /^stop$/i })).not.toBeInTheDocument();
  });

  it('shows restart button for running agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'running' })} />);

    const restartButton = screen.getByRole('button', { name: /^restart$/i });
    expect(restartButton).toBeInTheDocument();
  });

  it('shows restart button for paused agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'paused' })} />);

    const restartButton = screen.getByRole('button', { name: /^restart$/i });
    expect(restartButton).toBeInTheDocument();
  });

  it('shows restart button for error agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'error' })} />);

    const restartButton = screen.getByRole('button', { name: /^restart$/i });
    expect(restartButton).toBeInTheDocument();
  });

  it('does not show restart button for idle agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'idle' })} />);

    expect(screen.queryByRole('button', { name: /^restart$/i })).not.toBeInTheDocument();
  });

  it('shows terminal button always', () => {
    render(<AgentDetail agent={makeAgent({ status: 'idle' })} />);

    const terminalButton = screen.getByRole('button', { name: /^terminal$/i });
    expect(terminalButton).toBeInTheDocument();
  });

  it('shows terminal button for running agent', () => {
    render(<AgentDetail agent={makeAgent({ status: 'running' })} />);

    const terminalButton = screen.getByRole('button', { name: /^terminal$/i });
    expect(terminalButton).toBeInTheDocument();
  });

  it('calls startAgent when start button is clicked', async () => {
    const { user } = render(<AgentDetail agent={makeAgent({ status: 'idle' })} />);

    await user.click(screen.getByRole('button', { name: /^start$/i }));
    expect(mockStartAgent).toHaveBeenCalledWith('agent-1');
  });

  it('calls stopAgent when stop button is clicked', async () => {
    const { user } = render(<AgentDetail agent={makeAgent({ status: 'running' })} />);

    await user.click(screen.getByRole('button', { name: /^stop$/i }));
    expect(mockStopAgent).toHaveBeenCalledWith('agent-1');
  });

  it('calls restartAgent when restart button is clicked', async () => {
    const { user } = render(<AgentDetail agent={makeAgent({ status: 'running' })} />);

    await user.click(screen.getByRole('button', { name: /^restart$/i }));
    expect(mockRestartAgent).toHaveBeenCalledWith('agent-1');
  });

  it('calls openTerminalPanel when terminal button is clicked', async () => {
    const { user } = render(<AgentDetail agent={makeAgent({ status: 'idle' })} />);

    await user.click(screen.getByRole('button', { name: /^terminal$/i }));
    expect(mockOpenTerminalPanel).toHaveBeenCalledWith('agent-1');
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

  it('shows environment variables when present', () => {
    render(
      <AgentDetail agent={makeAgent({ envVars: { NODE_ENV: 'development', PORT: '3000' } })} />,
    );

    expect(screen.getByText('Environment Variables')).toBeInTheDocument();
    expect(screen.getByText('NODE_ENV')).toBeInTheDocument();
    expect(screen.getByText('development')).toBeInTheDocument();
    expect(screen.getByText('PORT')).toBeInTheDocument();
    expect(screen.getByText('3000')).toBeInTheDocument();
  });

  it('does not show environment variables section when empty', () => {
    render(<AgentDetail agent={makeAgent({ envVars: null })} />);

    expect(screen.queryByText('Environment Variables')).not.toBeInTheDocument();
  });

  it('does not show environment variables section when envVars is empty object', () => {
    render(<AgentDetail agent={makeAgent({ envVars: {} })} />);

    expect(screen.queryByText('Environment Variables')).not.toBeInTheDocument();
  });
});
