import { customRender as render, screen, waitFor, act } from '../../test/render.js';
import { AgentMetrics } from './agent-metrics.js';

const mockMetricsLatest = vi.fn();

vi.mock('../../lib/api-client.js', () => ({
  api: {
    metrics: {
      latest: (...args: unknown[]) => mockMetricsLatest(...args),
    },
  },
}));

describe('AgentMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockMetricsLatest.mockReturnValue(new Promise(() => {}));

    render(<AgentMetrics agentId="agent-1" />);

    expect(screen.getByTestId('agent-metrics')).toHaveTextContent('Loading metrics…');
  });

  it('shows "No metrics yet" when API returns error', async () => {
    mockMetricsLatest.mockRejectedValue(new Error('Not found'));

    render(<AgentMetrics agentId="agent-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('agent-metrics')).toHaveTextContent('No metrics yet');
    });
  });

  it('shows CPU and memory when metrics are loaded', async () => {
    mockMetricsLatest.mockResolvedValue({
      id: 'metric-1',
      agentId: 'agent-1',
      cpu: 45.3,
      memory: 536870912,
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    render(<AgentMetrics agentId="agent-1" />);

    await waitFor(() => {
      expect(screen.getByText('45.3%')).toBeInTheDocument();
      expect(screen.getByText('512 MB')).toBeInTheDocument();
    });
  });

  it('displays CPU and Memory labels', async () => {
    mockMetricsLatest.mockResolvedValue({
      id: 'metric-1',
      agentId: 'agent-1',
      cpu: 10.0,
      memory: 104857600,
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    render(<AgentMetrics agentId="agent-1" />);

    await waitFor(() => {
      expect(screen.getByText('CPU')).toBeInTheDocument();
      expect(screen.getByText('Memory')).toBeInTheDocument();
    });
  });

  it('calls api.metrics.latest with agent id', async () => {
    mockMetricsLatest.mockResolvedValue({
      id: 'metric-1',
      agentId: 'agent-42',
      cpu: 0,
      memory: 0,
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    render(<AgentMetrics agentId="agent-42" />);

    await waitFor(() => {
      expect(mockMetricsLatest).toHaveBeenCalledWith('agent-42');
    });
  });

  it('shows high CPU values', async () => {
    mockMetricsLatest.mockResolvedValue({
      id: 'metric-1',
      agentId: 'agent-1',
      cpu: 95.0,
      memory: 104857600,
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    render(<AgentMetrics agentId="agent-1" />);

    await waitFor(() => {
      expect(screen.getByText('95.0%')).toBeInTheDocument();
    });
  });

  it('shows high memory usage formatted in MB', async () => {
    mockMetricsLatest.mockResolvedValue({
      id: 'metric-1',
      agentId: 'agent-1',
      cpu: 10.0,
      memory: 1610612736,
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    render(<AgentMetrics agentId="agent-1" />);

    await waitFor(() => {
      expect(screen.getByText((text) => text.includes('1,536') && text.includes('MB'))).toBeInTheDocument();
    });
  });

  describe('polling with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('polls metrics at 5-second intervals', async () => {
      mockMetricsLatest.mockResolvedValue({
        id: 'metric-1',
        agentId: 'agent-1',
        cpu: 10,
        memory: 1048576,
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      render(<AgentMetrics agentId="agent-1" />);

      await waitFor(() => {
        expect(mockMetricsLatest).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockMetricsLatest).toHaveBeenCalledTimes(2);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(mockMetricsLatest).toHaveBeenCalledTimes(3);
    });

    it('cleans up interval on unmount', async () => {
      mockMetricsLatest.mockResolvedValue({
        id: 'metric-1',
        agentId: 'agent-1',
        cpu: 10,
        memory: 1048576,
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      const { unmount } = render(<AgentMetrics agentId="agent-1" />);

      await waitFor(() => {
        expect(mockMetricsLatest).toHaveBeenCalledTimes(1);
      });

      unmount();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });
      expect(mockMetricsLatest).toHaveBeenCalledTimes(1);
    });
  });
});
