import type { AgentResponse, LogResponse } from '@command-center/shared';

const { makeAgent, mockAgents, mockLogsHistory } = vi.hoisted(() => {
  const makeAgent = (overrides: Partial<AgentResponse> = {}): AgentResponse => ({
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
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const mockAgents = [
    makeAgent({ id: 'agent-1', name: 'Agent 1', swimlaneId: 'lane-1', position: 0 }),
    makeAgent({ id: 'agent-2', name: 'Agent 2', swimlaneId: 'lane-1', position: 1 }),
    makeAgent({ id: 'agent-3', name: 'Agent 3', swimlaneId: 'lane-2', position: 0 }),
  ];

  const makeLog = (overrides: Partial<LogResponse> = {}): LogResponse => ({
    id: 'log-1',
    agentId: 'agent-1',
    level: 'info',
    message: 'Agent started',
    timestamp: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const mockLogsHistory = vi
    .fn()
    .mockResolvedValue([
      makeLog({ id: 'log-1', message: 'Starting process' }),
      makeLog({ id: 'log-2', message: 'Processing data' }),
      makeLog({ id: 'log-3', message: 'Task complete' }),
    ]);

  return { makeAgent, mockAgents, makeLog, mockLogsHistory };
});

vi.mock('../lib/api-client.js', () => ({
  api: {
    agents: {
      list: vi.fn().mockResolvedValue(mockAgents),
      create: vi.fn().mockResolvedValue(makeAgent({ id: 'agent-new', name: 'New Agent' })),
      delete: vi.fn().mockResolvedValue({ success: true }),
      start: vi.fn().mockResolvedValue(makeAgent({ id: 'agent-1', status: 'running' })),
      stop: vi.fn().mockResolvedValue(makeAgent({ id: 'agent-1', status: 'stopped' })),
      restart: vi.fn().mockResolvedValue(makeAgent({ id: 'agent-1', status: 'running' })),
      move: vi
        .fn()
        .mockResolvedValue(makeAgent({ id: 'agent-1', swimlaneId: 'lane-2', position: 0 })),
    },
    logs: {
      history: mockLogsHistory,
    },
  },
}));

import { useAgentStore } from './agent-store.js';

describe('useAgentStore', () => {
  beforeEach(() => {
    useAgentStore.setState({
      agents: new Map(),
      logs: new Map(),
      loading: false,
      error: null,
    });
    mockLogsHistory.mockClear();
  });

  describe('fetchAgents', () => {
    it('fetches and stores agents as a Map', async () => {
      const { fetchAgents } = useAgentStore.getState();
      await fetchAgents('board-1');

      const state = useAgentStore.getState();
      expect(state.agents.size).toBe(3);
      expect(state.agents.get('agent-1')?.name).toBe('Agent 1');
      expect(state.loading).toBe(false);
    });
  });

  describe('createAgent', () => {
    it('creates and adds agent to map', async () => {
      const { createAgent } = useAgentStore.getState();
      const agent = await createAgent({
        name: 'New Agent',
        boardId: 'board-1',
        swimlaneId: 'lane-1',
      });

      expect(agent.id).toBe('agent-new');
      expect(useAgentStore.getState().agents.get('agent-new')).toBeDefined();
    });
  });

  describe('deleteAgent', () => {
    it('deletes agent from map', async () => {
      useAgentStore.setState({
        agents: new Map([['agent-1', mockAgents[0]!]]),
      });

      const { deleteAgent } = useAgentStore.getState();
      await deleteAgent('agent-1');

      expect(useAgentStore.getState().agents.has('agent-1')).toBe(false);
    });
  });

  describe('fetchLatestLogs', () => {
    it('fetches and stores logs for an agent', async () => {
      const { fetchLatestLogs } = useAgentStore.getState();
      await fetchLatestLogs('agent-1');

      expect(mockLogsHistory).toHaveBeenCalledWith('agent-1', { limit: 3 });
      const logs = useAgentStore.getState().logs.get('agent-1');
      expect(logs).toHaveLength(3);
      expect(logs?.[2]?.message).toBe('Task complete');
    });

    it('stores logs keyed by agentId', async () => {
      const { fetchLatestLogs } = useAgentStore.getState();
      await fetchLatestLogs('agent-1');
      await fetchLatestLogs('agent-2');

      expect(useAgentStore.getState().logs.has('agent-1')).toBe(true);
      expect(useAgentStore.getState().logs.has('agent-2')).toBe(true);
    });

    it('silently handles API errors', async () => {
      mockLogsHistory.mockRejectedValueOnce(new Error('Network error'));

      const { fetchLatestLogs } = useAgentStore.getState();
      await fetchLatestLogs('agent-1');

      expect(useAgentStore.getState().logs.has('agent-1')).toBe(false);
    });
  });

  describe('lifecycle actions', () => {
    beforeEach(() => {
      useAgentStore.setState({
        agents: new Map([['agent-1', mockAgents[0]!]]),
      });
    });

    it('starts an agent', async () => {
      const { startAgent } = useAgentStore.getState();
      await startAgent('agent-1');

      expect(useAgentStore.getState().agents.get('agent-1')?.status).toBe('running');
    });

    it('stops an agent', async () => {
      const { stopAgent } = useAgentStore.getState();
      await stopAgent('agent-1');

      expect(useAgentStore.getState().agents.get('agent-1')?.status).toBe('stopped');
    });

    it('restarts an agent', async () => {
      const { restartAgent } = useAgentStore.getState();
      await restartAgent('agent-1');

      expect(useAgentStore.getState().agents.get('agent-1')?.status).toBe('running');
    });
  });

  describe('optimistic move', () => {
    beforeEach(() => {
      useAgentStore.setState({
        agents: new Map([['agent-1', mockAgents[0]!]]),
      });
    });

    it('optimistically updates swimlaneId and position', () => {
      const { optimisticMove } = useAgentStore.getState();
      optimisticMove('agent-1', 'lane-2', 5);

      const agent = useAgentStore.getState().agents.get('agent-1');
      expect(agent?.swimlaneId).toBe('lane-2');
      expect(agent?.position).toBe(5);
    });

    it('rolls back to original values', () => {
      const { optimisticMove, rollbackMove } = useAgentStore.getState();
      optimisticMove('agent-1', 'lane-2', 5);
      rollbackMove('agent-1', 'lane-1', 0);

      const agent = useAgentStore.getState().agents.get('agent-1');
      expect(agent?.swimlaneId).toBe('lane-1');
      expect(agent?.position).toBe(0);
    });

    it('commits move via API', async () => {
      const { commitMove } = useAgentStore.getState();
      await commitMove('agent-1', 'lane-2', 0);

      const agent = useAgentStore.getState().agents.get('agent-1');
      expect(agent?.swimlaneId).toBe('lane-2');
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      useAgentStore.setState({
        agents: new Map(mockAgents.map((a: AgentResponse) => [a.id, a])),
      });
    });

    it('getAgentsByLane returns agents in a lane sorted by position', () => {
      const { getAgentsByLane } = useAgentStore.getState();
      const lane1Agents = getAgentsByLane('lane-1');

      expect(lane1Agents).toHaveLength(2);
      expect(lane1Agents[0]?.name).toBe('Agent 1');
      expect(lane1Agents[1]?.name).toBe('Agent 2');
    });

    it('getAgentsByLane returns empty for empty lane', () => {
      const { getAgentsByLane } = useAgentStore.getState();
      expect(getAgentsByLane('lane-999')).toEqual([]);
    });

    it('getAgentById returns agent or undefined', () => {
      const { getAgentById } = useAgentStore.getState();
      expect(getAgentById('agent-1')?.name).toBe('Agent 1');
      expect(getAgentById('unknown')).toBeUndefined();
    });
  });
});
