import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AgentResponse, CreateAgent, LogResponse, UpdateAgent } from '@command-center/shared';
import { api } from '../lib/api-client.js';

export interface AgentState {
  agents: Map<string, AgentResponse>;
  logs: Map<string, LogResponse[]>;
  loading: boolean;
  error: string | null;

  fetchAgents: (boardId: string) => Promise<void>;
  createAgent: (data: CreateAgent) => Promise<AgentResponse>;
  updateAgent: (id: string, data: UpdateAgent) => Promise<AgentResponse>;
  deleteAgent: (id: string) => Promise<void>;

  startAgent: (id: string) => Promise<void>;
  stopAgent: (id: string) => Promise<void>;
  restartAgent: (id: string) => Promise<void>;

  optimisticMove: (id: string, swimlaneId: string, position: number) => void;
  rollbackMove: (id: string, originalSwimlaneId: string, originalPosition: number) => void;
  commitMove: (id: string, swimlaneId: string, position: number) => Promise<void>;

  fetchLatestLogs: (agentId: string) => Promise<void>;

  getAgentsByLane: (swimlaneId: string) => AgentResponse[];
  getAgentById: (id: string) => AgentResponse | undefined;
}

export const useAgentStore = create<AgentState>()(
  immer((set, get) => ({
    agents: new Map<string, AgentResponse>(),
    logs: new Map<string, LogResponse[]>(),
    loading: false,
    error: null,

    fetchAgents: async (boardId: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });
      try {
        const agents = await api.agents.list({ boardId });
        set((state) => {
          state.agents = new Map(agents.map((a) => [a.id, a]));
          state.loading = false;
        });
      } catch (err) {
        set((state) => {
          state.error = err instanceof Error ? err.message : 'Failed to fetch agents';
          state.loading = false;
        });
      }
    },

    createAgent: async (data: CreateAgent) => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const tempAgent: AgentResponse = {
        id: tempId,
        name: data.name,
        status: 'idle',
        boardId: data.boardId,
        swimlaneId: data.swimlaneId,
        model: null,
        workingDir: data.workingDir ?? null,
        envVars: data.envVars ?? null,
        command: data.command ?? null,
        tmuxSession: null,
        tmuxPaneId: null,
        pid: null,
        exitCode: null,
        errorMessage: null,
        startedAt: null,
        stoppedAt: null,
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set((state) => {
        state.agents.set(tempId, tempAgent);
      });

      try {
        const agent = await api.agents.create(data);
        set((state) => {
          state.agents.delete(tempId);
          state.agents.set(agent.id, agent);
        });
        return agent;
      } catch (err) {
        set((state) => {
          state.agents.delete(tempId);
        });
        throw err;
      }
    },

    updateAgent: async (id: string, data: UpdateAgent) => {
      const updated = await api.agents.update(id, data);
      set((state) => {
        state.agents.set(id, updated);
      });
      return updated;
    },

    deleteAgent: async (id: string) => {
      const agent = get().agents.get(id);
      if (!agent) return;

      set((state) => {
        state.agents.delete(id);
      });

      try {
        await api.agents.delete(id);
      } catch (err) {
        set((state) => {
          state.agents.set(id, agent);
        });
        throw err;
      }
    },

    startAgent: async (id: string) => {
      const updated = await api.agents.start(id);
      set((state) => {
        state.agents.set(id, updated);
      });
    },

    stopAgent: async (id: string) => {
      const updated = await api.agents.stop(id);
      set((state) => {
        state.agents.set(id, updated);
      });
    },

    restartAgent: async (id: string) => {
      const updated = await api.agents.restart(id);
      set((state) => {
        state.agents.set(id, updated);
      });
    },

    optimisticMove: (id: string, swimlaneId: string, position: number) => {
      set((state) => {
        const agent = state.agents.get(id);
        if (agent) {
          agent.swimlaneId = swimlaneId;
          agent.position = position;
        }
      });
    },

    rollbackMove: (id: string, originalSwimlaneId: string, originalPosition: number) => {
      set((state) => {
        const agent = state.agents.get(id);
        if (agent) {
          agent.swimlaneId = originalSwimlaneId;
          agent.position = originalPosition;
        }
      });
    },

    commitMove: async (id: string, swimlaneId: string, position: number) => {
      const updated = await api.agents.move(id, { swimlaneId, position });
      set((state) => {
        state.agents.set(id, updated);
      });
    },

    fetchLatestLogs: async (agentId: string) => {
      try {
        const logs = await api.logs.history(agentId, { limit: 3 });
        set((state) => {
          state.logs.set(agentId, logs);
        });
      } catch {
        // Silently fail - logs are non-critical
      }
    },

    getAgentsByLane: (swimlaneId: string) => {
      return Array.from(get().agents.values())
        .filter((a) => a.swimlaneId === swimlaneId)
        .sort((a, b) => a.position - b.position);
    },

    getAgentById: (id: string) => {
      return get().agents.get(id);
    },
  })),
);

export const agentStore = useAgentStore;
