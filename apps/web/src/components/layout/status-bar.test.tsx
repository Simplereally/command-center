import type { AgentResponse } from '@command-center/shared';
import { customRender as render, screen } from '../../test/render.js';
import { StatusBar } from './status-bar.js';
import { useAgentStore } from '../../stores/agent-store.js';

vi.mock('../../stores/agent-store.js', () => ({
  useAgentStore: vi.fn(),
}));

vi.mock('../../lib/api-client.js', () => ({
  api: {
    tmux: {
      listSessions: vi.fn().mockResolvedValue([]),
    },
  },
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

function mockAgentState(agents: Map<string, AgentResponse>) {
  vi.mocked(useAgentStore).mockImplementation(((
    selector: (s: Record<string, unknown>) => unknown,
  ) => selector({ agents })) as never);
}

describe('StatusBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows running agent count', () => {
    const agents = new Map<string, AgentResponse>([
      ['a1', makeAgent({ id: 'a1', status: 'running' })],
      ['a2', makeAgent({ id: 'a2', status: 'running' })],
      ['a3', makeAgent({ id: 'a3', status: 'idle' })],
    ]);
    mockAgentState(agents);

    render(<StatusBar />);

    expect(screen.getByText('2 active')).toBeInTheDocument();
  });

  it('shows total agent count', () => {
    const agents = new Map<string, AgentResponse>([
      ['a1', makeAgent({ id: 'a1', status: 'running' })],
      ['a2', makeAgent({ id: 'a2', status: 'idle' })],
    ]);
    mockAgentState(agents);

    render(<StatusBar />);

    expect(screen.getByText('2 total agents')).toBeInTheDocument();
  });

  it('shows zero counts when no agents', () => {
    mockAgentState(new Map());

    render(<StatusBar />);

    expect(screen.getByText('0 active')).toBeInTheDocument();
    expect(screen.getByText('0 total agents')).toBeInTheDocument();
  });

  it('shows keyboard shortcut hint', () => {
    mockAgentState(new Map());

    render(<StatusBar />);

    expect(screen.getByText(/command palette/i)).toBeInTheDocument();
  });
});
