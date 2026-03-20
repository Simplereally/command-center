import type { AgentResponse } from '@command-center/shared';

const { makeAgent, deleteRejectRef, moveRejectRef } = vi.hoisted(() => {
  const makeAgentFn = (overrides: Partial<AgentResponse> = {}): AgentResponse => ({
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

  return {
    makeAgent: makeAgentFn,
    deleteRejectRef: { value: null as unknown },
    moveRejectRef: { value: null as unknown },
  };
});

vi.mock('../lib/api-client.js', () => ({
  api: {
    agents: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(makeAgent({ id: 'agent-new' })),
      delete: async () => {
        if (deleteRejectRef.value) throw deleteRejectRef.value;
        return { success: true };
      },
      start: vi.fn().mockImplementation(async (id: string) =>
        makeAgent({ id, status: 'running' }),
      ),
      stop: vi.fn().mockImplementation(async (id: string) =>
        makeAgent({ id, status: 'stopped' }),
      ),
      restart: vi.fn().mockImplementation(async (id: string) =>
        makeAgent({ id, status: 'running' }),
      ),
      move: async (id: string, data: { swimlaneId: string; position: number }) => {
        if (moveRejectRef.value) throw moveRejectRef.value;
        return makeAgent({ id, swimlaneId: data.swimlaneId, position: data.position });
      },
      update: vi.fn().mockImplementation(async (id: string, data: Record<string, unknown>) =>
        makeAgent({ id, ...data }),
      ),
    },
    logs: {
      history: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { useAgentStore } from './agent-store.js';

describe('useAgentStore integration', () => {
  beforeEach(() => {
    useAgentStore.setState({
      agents: new Map(),
      logs: new Map(),
      loading: false,
      error: null,
    });
    deleteRejectRef.value = null;
    moveRejectRef.value = null;
  });

  describe('deleteAgent with rollback', () => {
    it('removes agent from map on success', async () => {
      const agent = makeAgent({ id: 'agent-1' });
      useAgentStore.setState({ agents: new Map([['agent-1', agent]]) });

      await useAgentStore.getState().deleteAgent('agent-1');

      expect(useAgentStore.getState().agents.has('agent-1')).toBe(false);
    });

    it('rolls back agent on API failure', async () => {
      const agent = makeAgent({ id: 'agent-1', name: 'Important Agent' });
      useAgentStore.setState({ agents: new Map([['agent-1', agent]]) });
      deleteRejectRef.value = new Error('Delete failed');

      await expect(
        useAgentStore.getState().deleteAgent('agent-1'),
      ).rejects.toThrow('Delete failed');

      expect(useAgentStore.getState().agents.has('agent-1')).toBe(true);
      expect(useAgentStore.getState().agents.get('agent-1')?.name).toBe('Important Agent');
    });

    it('does nothing when deleting non-existent agent', async () => {
      await useAgentStore.getState().deleteAgent('non-existent');

      expect(useAgentStore.getState().agents.size).toBe(0);
    });
  });

  describe('startAgent / stopAgent / restartAgent update agent in Map', () => {
    beforeEach(() => {
      const agents = new Map([
        ['agent-1', makeAgent({ id: 'agent-1', status: 'idle' })],
        ['agent-2', makeAgent({ id: 'agent-2', status: 'running' })],
      ]);
      useAgentStore.setState({ agents });
    });

    it('startAgent updates status to running', async () => {
      await useAgentStore.getState().startAgent('agent-1');
      expect(useAgentStore.getState().agents.get('agent-1')?.status).toBe('running');
    });

    it('stopAgent updates status to stopped', async () => {
      await useAgentStore.getState().stopAgent('agent-2');
      expect(useAgentStore.getState().agents.get('agent-2')?.status).toBe('stopped');
    });

    it('restartAgent updates status to running', async () => {
      await useAgentStore.getState().restartAgent('agent-2');
      expect(useAgentStore.getState().agents.get('agent-2')?.status).toBe('running');
    });

    it('does not affect other agents when starting one', async () => {
      await useAgentStore.getState().startAgent('agent-1');
      expect(useAgentStore.getState().agents.get('agent-2')?.status).toBe('running');
    });
  });

  describe('optimisticMove + rollbackMove state changes', () => {
    beforeEach(() => {
      useAgentStore.setState({
        agents: new Map([
          ['agent-1', makeAgent({ id: 'agent-1', swimlaneId: 'lane-1', position: 0 })],
          ['agent-2', makeAgent({ id: 'agent-2', swimlaneId: 'lane-1', position: 1 })],
        ]),
      });
    });

    it('optimisticMove updates swimlaneId and position', () => {
      useAgentStore.getState().optimisticMove('agent-1', 'lane-2', 3);

      const agent = useAgentStore.getState().agents.get('agent-1');
      expect(agent?.swimlaneId).toBe('lane-2');
      expect(agent?.position).toBe(3);
    });

    it('optimisticMove does not affect other agents', () => {
      useAgentStore.getState().optimisticMove('agent-1', 'lane-2', 3);

      const agent2 = useAgentStore.getState().agents.get('agent-2');
      expect(agent2?.swimlaneId).toBe('lane-1');
      expect(agent2?.position).toBe(1);
    });

    it('rollbackMove restores original swimlaneId and position', () => {
      useAgentStore.getState().optimisticMove('agent-1', 'lane-2', 3);
      useAgentStore.getState().rollbackMove('agent-1', 'lane-1', 0);

      const agent = useAgentStore.getState().agents.get('agent-1');
      expect(agent?.swimlaneId).toBe('lane-1');
      expect(agent?.position).toBe(0);
    });

    it('commitMove persists the move via API', async () => {
      useAgentStore.getState().optimisticMove('agent-1', 'lane-2', 3);
      await useAgentStore.getState().commitMove('agent-1', 'lane-2', 3);

      const agent = useAgentStore.getState().agents.get('agent-1');
      expect(agent?.swimlaneId).toBe('lane-2');
      expect(agent?.position).toBe(3);
    });

    it('handles non-existent agent gracefully for optimisticMove', () => {
      useAgentStore.getState().optimisticMove('non-existent', 'lane-2', 0);
      expect(useAgentStore.getState().agents.has('non-existent')).toBe(false);
    });

    it('handles non-existent agent gracefully for rollbackMove', () => {
      useAgentStore.getState().rollbackMove('non-existent', 'lane-1', 0);
      expect(useAgentStore.getState().agents.has('non-existent')).toBe(false);
    });
  });

  describe('updateAgent', () => {
    it('updates agent in the map', async () => {
      useAgentStore.setState({
        agents: new Map([['agent-1', makeAgent({ id: 'agent-1', name: 'Old Name' })]]),
      });

      await useAgentStore.getState().updateAgent('agent-1', { name: 'New Name' });

      expect(useAgentStore.getState().agents.get('agent-1')?.name).toBe('New Name');
    });
  });
});
