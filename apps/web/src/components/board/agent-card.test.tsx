import { fireEvent } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { AgentResponse, LogResponse } from '@command-center/shared';
import { customRender as render, screen } from '../../test/render.js';
import { AgentCard } from './agent-card.js';

const mockOpenDetailPanel = vi.fn();
const mockOpenTerminalPanel = vi.fn();

const { mockSelectedAgentId, mockAgentLogs, mockDeleteAgent, mockRestartAgent, mockCreateAgent, mockAgentsMap } = vi.hoisted(() => ({
  mockSelectedAgentId: { value: null as string | null },
  mockAgentLogs: { value: new Map<string, LogResponse[]>() },
  mockDeleteAgent: vi.fn().mockResolvedValue(undefined),
  mockRestartAgent: vi.fn().mockResolvedValue(undefined),
  mockCreateAgent: vi.fn().mockResolvedValue(undefined),
  mockAgentsMap: { value: new Map<string, AgentResponse>() },
}));

vi.mock('../../stores/ui-store.js', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      openDetailPanel: mockOpenDetailPanel,
      openTerminalPanel: mockOpenTerminalPanel,
      selectedAgentId: mockSelectedAgentId.value,
    }),
}));

vi.mock('../../stores/agent-store.js', () => {
  const storeMock = (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      logs: mockAgentLogs.value,
    });
  storeMock.getState = () => ({
    restartAgent: mockRestartAgent,
    deleteAgent: mockDeleteAgent,
    createAgent: mockCreateAgent,
    agents: mockAgentsMap.value,
  });
  storeMock.setState = vi.fn();
  return { useAgentStore: storeMock };
});

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

describe('AgentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedAgentId.value = null;
    mockAgentLogs.value = new Map();
    mockAgentsMap.value = new Map([['agent-1', makeAgent()]]);
  });

  it('shows agent name and status dot', () => {
    render(<AgentCard agent={makeAgent({ name: 'My Agent', status: 'running' })} />);

    expect(screen.getByTestId('agent-card-agent-1')).toBeInTheDocument();
    expect(screen.getByText('My Agent')).toBeInTheDocument();
    expect(screen.getByTestId('status-dot')).toBeInTheDocument();
  });

  it('shows working directory when present', () => {
    render(<AgentCard agent={makeAgent({ workingDir: '/home/user/project' })} />);

    expect(screen.getByText('/home/user/project')).toBeInTheDocument();
  });

  it('does not show working directory when null', () => {
    render(<AgentCard agent={makeAgent({ workingDir: null })} />);

    expect(screen.queryByText('/home/user/project')).not.toBeInTheDocument();
  });

  it('shows model badge when present', () => {
    render(<AgentCard agent={makeAgent({ model: 'claude-sonnet-4-20250514' })} />);

    expect(screen.getByTestId('provider-badge')).toBeInTheDocument();
    expect(screen.getByText('Claude Sonnet 4')).toBeInTheDocument();
  });

  it('does not show model badge when null', () => {
    render(<AgentCard agent={makeAgent({ model: null })} />);

    expect(screen.queryByTestId('provider-badge')).not.toBeInTheDocument();
  });

  it('calls openDetailPanel on click', async () => {
    const { user } = render(<AgentCard agent={makeAgent({ id: 'agent-42' })} />);

    await user.click(screen.getByTestId('agent-card-agent-42'));

    expect(mockOpenDetailPanel).toHaveBeenCalledWith('agent-42');
  });

  it('shows selected state glow when selected', () => {
    mockSelectedAgentId.value = 'agent-1';

    render(<AgentCard agent={makeAgent({ id: 'agent-1' })} />);

    const card = screen.getByTestId('agent-card-agent-1');
    expect(card.className).toContain('shadow-glow');
  });

  it('does not show selected glow when not selected', () => {
    mockSelectedAgentId.value = 'agent-other';

    render(<AgentCard agent={makeAgent({ id: 'agent-1' })} />);

    const card = screen.getByTestId('agent-card-agent-1');
    expect(card.className).not.toContain('shadow-glow');
  });

  it('has correct aria-label', () => {
    render(<AgentCard agent={makeAgent({ name: 'Bot Agent', status: 'running' })} />);

    expect(
      screen.getByRole('article', { name: 'Agent: Bot Agent, Status: running' }),
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <AgentCard agent={makeAgent({ name: 'Test Agent', status: 'running' })} />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations when selected', async () => {
    mockSelectedAgentId.value = 'agent-1';
    const { container } = render(
      <AgentCard agent={makeAgent({ id: 'agent-1', name: 'Selected Agent' })} />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows context menu on right-click', () => {
    render(<AgentCard agent={makeAgent({ id: 'agent-1' })} />);

    const card = screen.getByTestId('agent-card-agent-1');
    fireEvent.contextMenu(card);

    const menu = screen.getByTestId('agent-card-context-menu');
    expect(menu).toBeInTheDocument();
    expect(screen.getByText('Open Terminal')).toBeInTheDocument();
    expect(screen.getByText('Restart')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('closes context menu on click outside', () => {
    render(<AgentCard agent={makeAgent({ id: 'agent-1' })} />);

    const card = screen.getByTestId('agent-card-agent-1');
    fireEvent.contextMenu(card);

    expect(screen.getByTestId('agent-card-context-menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByTestId('agent-card-context-menu')).not.toBeInTheDocument();
  });

  it('calls openTerminalPanel when Open Terminal is clicked in context menu', async () => {
    const { user } = render(<AgentCard agent={makeAgent({ id: 'agent-42' })} />);

    const card = screen.getByTestId('agent-card-agent-42');
    fireEvent.contextMenu(card);

    const openTerminalItem = screen.getByText('Open Terminal');
    await user.click(openTerminalItem);

    expect(mockOpenTerminalPanel).toHaveBeenCalledWith('agent-42');
  });

  it('shows LiveTimer for running agents with startedAt', () => {
    render(
      <AgentCard agent={makeAgent({ status: 'running', startedAt: '2024-01-01T00:00:00.000Z' })} />,
    );

    expect(screen.getByTestId('live-timer')).toBeInTheDocument();
  });

  it('does not show LiveTimer for non-running agents', () => {
    render(
      <AgentCard agent={makeAgent({ status: 'idle', startedAt: '2024-01-01T00:00:00.000Z' })} />,
    );

    expect(screen.queryByTestId('live-timer')).not.toBeInTheDocument();
  });

  it('does not show LiveTimer for running agents without startedAt', () => {
    render(<AgentCard agent={makeAgent({ status: 'running', startedAt: null })} />);

    expect(screen.queryByTestId('live-timer')).not.toBeInTheDocument();
  });

  describe('delete with undo', () => {
    it('removes agent from store immediately on Delete click', async () => {
      const agent = makeAgent({ id: 'agent-1', name: 'Test Agent' });
      mockAgentsMap.value = new Map([['agent-1', agent]]);

      const { user } = render(<AgentCard agent={agent} />);

      const card = screen.getByTestId('agent-card-agent-1');
      fireEvent.contextMenu(card);

      await user.click(screen.getByText('Delete'));

      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });
  });

  describe('duplicate', () => {
    it('shows Duplicate menu item in context menu', () => {
      render(<AgentCard agent={makeAgent({ id: 'agent-1' })} />);

      const card = screen.getByTestId('agent-card-agent-1');
      fireEvent.contextMenu(card);

      expect(screen.getByText('Duplicate')).toBeInTheDocument();
    });

    it('calls createAgent with copy name when Duplicate is clicked', async () => {
      const agent = makeAgent({ id: 'agent-1', name: 'My Agent', boardId: 'board-1', swimlaneId: 'lane-1' });
      const { user } = render(<AgentCard agent={agent} />);

      const card = screen.getByTestId('agent-card-agent-1');
      fireEvent.contextMenu(card);

      await user.click(screen.getByText('Duplicate'));

      expect(mockCreateAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Agent (copy)',
          boardId: 'board-1',
          swimlaneId: 'lane-1',
        }),
      );
    });
  });

  describe('log preview', () => {
    it('shows last log line for running agent with logs', () => {
      mockAgentLogs.value = new Map([
        [
          'agent-1',
          [
            {
              id: 'log-1',
              agentId: 'agent-1',
              level: 'info',
              content: 'Starting process',
              timestamp: '2024-01-01T00:00:00Z',
            },
            {
              id: 'log-2',
              agentId: 'agent-1',
              level: 'info',
              content: 'Processing data',
              timestamp: '2024-01-01T00:00:01Z',
            },
            {
              id: 'log-3',
              agentId: 'agent-1',
              level: 'info',
              content: 'Task complete',
              timestamp: '2024-01-01T00:00:02Z',
            },
          ],
        ],
      ]);

      render(<AgentCard agent={makeAgent({ id: 'agent-1', status: 'running' })} />);

      expect(screen.getByTestId('agent-card-agent-1-log-preview')).toBeInTheDocument();
      expect(screen.getByText('Task complete')).toBeInTheDocument();
    });

    it('shows last log line for error agent with logs', () => {
      mockAgentLogs.value = new Map([
        [
          'agent-1',
          [
            {
              id: 'log-1',
              agentId: 'agent-1',
              level: 'error',
              content: 'Connection failed',
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
        ],
      ]);

      render(<AgentCard agent={makeAgent({ id: 'agent-1', status: 'error' })} />);

      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('does not show log line for idle agent', () => {
      mockAgentLogs.value = new Map([
        [
          'agent-1',
          [
            {
              id: 'log-1',
              agentId: 'agent-1',
              level: 'info',
              content: 'Some log',
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
        ],
      ]);

      render(<AgentCard agent={makeAgent({ id: 'agent-1', status: 'idle' })} />);

      expect(screen.queryByTestId('agent-card-agent-1-log-preview')).not.toBeInTheDocument();
    });

    it('does not show log line when no logs exist', () => {
      mockAgentLogs.value = new Map();

      render(<AgentCard agent={makeAgent({ id: 'agent-1', status: 'running' })} />);

      expect(screen.queryByTestId('agent-card-agent-1-log-preview')).not.toBeInTheDocument();
    });

    it('does not show log line when logs array is empty', () => {
      mockAgentLogs.value = new Map([['agent-1', []]]);

      render(<AgentCard agent={makeAgent({ id: 'agent-1', status: 'running' })} />);

      expect(screen.queryByTestId('agent-card-agent-1-log-preview')).not.toBeInTheDocument();
    });
  });

  describe('context menu actions', () => {
    it('calls restartAgent when Restart is clicked in context menu', async () => {
      const { user } = render(<AgentCard agent={makeAgent({ id: 'agent-1' })} />);

      const card = screen.getByTestId('agent-card-agent-1');
      fireEvent.contextMenu(card);

      await user.click(screen.getByText('Restart'));

      expect(mockRestartAgent).toHaveBeenCalledWith('agent-1');
    });

    it('closes context menu when Escape is pressed', () => {
      render(<AgentCard agent={makeAgent({ id: 'agent-1' })} />);

      const card = screen.getByTestId('agent-card-agent-1');
      fireEvent.contextMenu(card);

      expect(screen.getByTestId('agent-card-context-menu')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByTestId('agent-card-context-menu')).not.toBeInTheDocument();
    });
  });

  describe('error states', () => {
    it('shows error message indicator for error agent', () => {
      render(
        <AgentCard agent={makeAgent({ id: 'agent-1', status: 'error', errorMessage: 'OOM killed' })} />,
      );

      const card = screen.getByTestId('agent-card-agent-1');
      expect(card).toHaveAttribute('aria-label', 'Agent: Test Agent, Status: error');
    });

    it('renders card for completed agent', () => {
      render(<AgentCard agent={makeAgent({ status: 'completed' })} />);

      expect(screen.getByTestId('agent-card-agent-1')).toBeInTheDocument();
    });

    it('renders card for stopped agent', () => {
      render(<AgentCard agent={makeAgent({ status: 'stopped' })} />);

      expect(screen.getByTestId('agent-card-agent-1')).toBeInTheDocument();
    });
  });
});
