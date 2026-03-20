import { axe } from 'vitest-axe';
import { customRender as render, screen } from '../../test/render.js';
import { AgentLogViewer } from './agent-log-viewer.js';

const mockClearLogs = vi.fn();
const { mockLogs, mockConnected, mockError } = vi.hoisted(() => ({
  mockLogs: {
    value: [] as Array<{
      id: string;
      level: string;
      content: string;
      timestamp: number;
    }>,
  },
  mockConnected: { value: false },
  mockError: { value: null as string | null },
}));

vi.mock('../../lib/use-log-stream.js', () => ({
  useLogStream: () => ({
    logs: mockLogs.value,
    connected: mockConnected.value,
    error: mockError.value,
    clearLogs: mockClearLogs,
  }),
}));

function makeLogs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    level: i % 2 === 0 ? 'info' : 'warn',
    content: `Log message ${i}`,
    timestamp: Date.now() + i * 1000,
  }));
}

describe('AgentLogViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogs.value = [];
    mockConnected.value = false;
    mockError.value = null;
  });

  it('renders log container with role="log"', () => {
    render(<AgentLogViewer agentId="agent-1" />);

    expect(screen.getByRole('log')).toBeInTheDocument();
  });

  it('shows "Connecting…" when initial loading (not connected, no error, no logs)', () => {
    mockConnected.value = false;
    mockError.value = null;
    mockLogs.value = [];

    render(<AgentLogViewer agentId="agent-1" />);

    expect(screen.getAllByText('Connecting…').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Live" indicator when connected', () => {
    mockConnected.value = true;

    render(<AgentLogViewer agentId="agent-1" />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows "Reconnecting…" when disconnected with reconnecting error', () => {
    mockConnected.value = false;
    mockError.value = 'Reconnecting…';

    render(<AgentLogViewer agentId="agent-1" />);

    expect(screen.getByText('Reconnecting…')).toBeInTheDocument();
  });

  it('shows "No logs yet" when connected but no logs', () => {
    mockConnected.value = true;
    mockLogs.value = [];

    render(<AgentLogViewer agentId="agent-1" />);

    expect(screen.getByText('No logs yet')).toBeInTheDocument();
  });

  it('renders log entries with level and content', () => {
    mockConnected.value = true;
    mockLogs.value = [
      { id: 'log-1', level: 'info', content: 'Started process', timestamp: Date.now() },
      { id: 'log-2', level: 'error', content: 'Connection failed', timestamp: Date.now() + 1000 },
    ];

    render(<AgentLogViewer agentId="agent-1" />);

    expect(screen.getByText('Started process')).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    expect(screen.getByText('info')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('calls clearLogs when Clear button is clicked', async () => {
    mockConnected.value = true;
    mockLogs.value = makeLogs(3);

    const { user } = render(<AgentLogViewer agentId="agent-1" />);

    const clearButton = screen.getByRole('button', { name: 'Clear logs' });
    await user.click(clearButton);

    expect(mockClearLogs).toHaveBeenCalledOnce();
  });

  it('limits visible logs to maxLines', () => {
    mockConnected.value = true;
    mockLogs.value = makeLogs(10);

    render(<AgentLogViewer agentId="agent-1" maxLines={5} />);

    expect(screen.queryByText('Log message 0')).not.toBeInTheDocument();
    expect(screen.getByText('Log message 5')).toBeInTheDocument();
    expect(screen.getByText('Log message 9')).toBeInTheDocument();
  });

  it('shows all logs when count is within maxLines', () => {
    mockConnected.value = true;
    mockLogs.value = makeLogs(3);

    render(<AgentLogViewer agentId="agent-1" maxLines={500} />);

    expect(screen.getByText('Log message 0')).toBeInTheDocument();
    expect(screen.getByText('Log message 1')).toBeInTheDocument();
    expect(screen.getByText('Log message 2')).toBeInTheDocument();
  });

  it('renders Logs header', () => {
    render(<AgentLogViewer agentId="agent-1" />);

    expect(screen.getByText('Logs')).toBeInTheDocument();
  });

  it('should have no accessibility violations when connected with logs', async () => {
    mockConnected.value = true;
    mockLogs.value = makeLogs(3);

    const { container } = render(<AgentLogViewer agentId="agent-1" />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when empty', async () => {
    mockConnected.value = true;
    mockLogs.value = [];

    const { container } = render(<AgentLogViewer agentId="agent-1" />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
