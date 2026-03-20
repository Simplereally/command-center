import { axe } from 'vitest-axe';
import type { AgentResponse } from '@command-center/shared';
import { customRender as render, screen, waitFor } from '../../test/render.js';
import { AgentActions } from './agent-actions.js';

const mockStartAgent = vi.fn().mockResolvedValue(undefined);
const mockStopAgent = vi.fn().mockResolvedValue(undefined);
const mockRestartAgent = vi.fn().mockResolvedValue(undefined);
const mockDeleteAgent = vi.fn().mockResolvedValue(undefined);
const mockOpenTerminalPanel = vi.fn();
const mockCloseSidePanel = vi.fn();

vi.mock('../../stores/agent-store.js', () => ({
  useAgentStore: () => ({
    startAgent: mockStartAgent,
    stopAgent: mockStopAgent,
    restartAgent: mockRestartAgent,
    deleteAgent: mockDeleteAgent,
  }),
}));

vi.mock('../../stores/ui-store.js', () => ({
  useUiStore: () => ({
    openTerminalPanel: mockOpenTerminalPanel,
    closeSidePanel: mockCloseSidePanel,
  }),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
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

describe('AgentActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders action buttons', () => {
    render(<AgentActions agent={makeAgent()} />);

    expect(screen.getByTestId('agent-actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terminal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('enables Start for idle agent', () => {
    render(<AgentActions agent={makeAgent({ status: 'idle' })} />);

    expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
  });

  it('disables Start for running agent', () => {
    render(<AgentActions agent={makeAgent({ status: 'running' })} />);

    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  });

  it('enables Stop for running agent', () => {
    render(<AgentActions agent={makeAgent({ status: 'running' })} />);

    expect(screen.getByRole('button', { name: 'Stop' })).not.toBeDisabled();
  });

  it('disables Stop for idle agent', () => {
    render(<AgentActions agent={makeAgent({ status: 'idle' })} />);

    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
  });

  it('enables Restart for running agent', () => {
    render(<AgentActions agent={makeAgent({ status: 'running' })} />);

    expect(screen.getByRole('button', { name: 'Restart' })).not.toBeDisabled();
  });

  it('disables Restart for idle agent', () => {
    render(<AgentActions agent={makeAgent({ status: 'idle' })} />);

    expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();
  });

  it('enables Restart for error agent', () => {
    render(<AgentActions agent={makeAgent({ status: 'error' })} />);

    expect(screen.getByRole('button', { name: 'Restart' })).not.toBeDisabled();
  });

  it('calls startAgent when Start button is clicked', async () => {
    const { user } = render(<AgentActions agent={makeAgent({ status: 'idle' })} />);

    await user.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => {
      expect(mockStartAgent).toHaveBeenCalledWith('agent-1');
    });
  });

  it('calls stopAgent when Stop button is clicked', async () => {
    const { user } = render(<AgentActions agent={makeAgent({ status: 'running' })} />);

    await user.click(screen.getByRole('button', { name: 'Stop' }));

    await waitFor(() => {
      expect(mockStopAgent).toHaveBeenCalledWith('agent-1');
    });
  });

  it('calls restartAgent when Restart button is clicked', async () => {
    const { user } = render(<AgentActions agent={makeAgent({ status: 'running' })} />);

    await user.click(screen.getByRole('button', { name: 'Restart' }));

    await waitFor(() => {
      expect(mockRestartAgent).toHaveBeenCalledWith('agent-1');
    });
  });

  it('calls openTerminalPanel when Terminal button is clicked', async () => {
    const { user } = render(<AgentActions agent={makeAgent()} />);

    await user.click(screen.getByRole('button', { name: 'Terminal' }));

    expect(mockOpenTerminalPanel).toHaveBeenCalledWith('agent-1');
  });

  describe('delete confirmation flow', () => {
    it('shows Delete button initially (not confirm dialog)', () => {
      render(<AgentActions agent={makeAgent()} />);

      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
    });

    it('shows Confirm/Cancel when Delete is clicked', async () => {
      const { user } = render(<AgentActions agent={makeAgent()} />);

      await user.click(screen.getByRole('button', { name: 'Delete' }));

      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('calls deleteAgent on Confirm click', async () => {
      const { user } = render(<AgentActions agent={makeAgent()} />);

      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() => {
        expect(mockDeleteAgent).toHaveBeenCalledWith('agent-1');
      });
    });

    it('closes side panel after successful delete', async () => {
      const { user } = render(<AgentActions agent={makeAgent()} />);

      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      await waitFor(() => {
        expect(mockCloseSidePanel).toHaveBeenCalled();
      });
    });

    it('hides confirm buttons when Cancel is clicked', async () => {
      const { user } = render(<AgentActions agent={makeAgent()} />);

      await user.click(screen.getByRole('button', { name: 'Delete' }));
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(mockDeleteAgent).not.toHaveBeenCalled();
    });
  });

  it('shows toast on start error', async () => {
    const { toast } = await import('sonner');
    mockStartAgent.mockRejectedValueOnce(new Error('Start failed'));

    const { user } = render(<AgentActions agent={makeAgent({ status: 'idle' })} />);

    await user.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Start failed');
    });
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<AgentActions agent={makeAgent({ status: 'running' })} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
