import type {
  AgentResponse,
  BoardResponse,
  SwimlaneResponse,
  CreateAgent,
  UpdateAgent,
  MoveAgent,
  LogResponse,
  MetricResponse,
} from '@command-center/shared';
import { API_BASE_URL } from './constants.js';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface TmuxSessionInfo {
  id: string;
  name: string;
  createdAt: string;
  attached: boolean;
}

interface ApiResponse<T> {
  data: T;
}

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorBody = (await response.json()) as ApiErrorResponse;
      throw new ApiError(
        response.status,
        errorBody.error.code,
        errorBody.error.message,
        errorBody.error.details,
      );
    }

    const json = (await response.json()) as ApiResponse<T>;
    return json.data;
  }

  // ── Boards ──────────────────────────────────────

  readonly boards = {
    list: (): Promise<BoardResponse[]> =>
      this.request<BoardResponse[]>('/boards'),

    get: (boardId: string): Promise<BoardResponse> =>
      this.request<BoardResponse>(`/boards/${boardId}`),

    create: (data: { name: string; description?: string }): Promise<BoardResponse> =>
      this.request<BoardResponse>('/boards', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (
      boardId: string,
      data: { name?: string; description?: string },
    ): Promise<BoardResponse> =>
      this.request<BoardResponse>(`/boards/${boardId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (boardId: string): Promise<{ success: boolean }> =>
      this.request<{ success: boolean }>(`/boards/${boardId}`, {
        method: 'DELETE',
      }),
  };

  // ── Swimlanes ───────────────────────────────────

  readonly swimlanes = {
    list: (boardId: string): Promise<SwimlaneResponse[]> =>
      this.request<SwimlaneResponse[]>(`/boards/${boardId}/swimlanes`),

    update: (
      laneId: string,
      data: { name?: string; position?: number; color?: string },
    ): Promise<SwimlaneResponse> =>
      this.request<SwimlaneResponse>(`/swimlanes/${laneId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  };

  // ── Agents ──────────────────────────────────────

  readonly agents = {
    list: (params?: { boardId?: string; status?: string; swimlaneId?: string }): Promise<AgentResponse[]> => {
      const searchParams = new URLSearchParams();
      if (params?.boardId) searchParams.set('boardId', params.boardId);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.swimlaneId) searchParams.set('swimlaneId', params.swimlaneId);
      const query = searchParams.toString();
      return this.request<AgentResponse[]>(`/agents${query ? `?${query}` : ''}`);
    },

    get: (agentId: string): Promise<AgentResponse> =>
      this.request<AgentResponse>(`/agents/${agentId}`),

    create: (data: CreateAgent): Promise<AgentResponse> =>
      this.request<AgentResponse>('/agents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (agentId: string, data: UpdateAgent): Promise<AgentResponse> =>
      this.request<AgentResponse>(`/agents/${agentId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (agentId: string): Promise<{ success: boolean }> =>
      this.request<{ success: boolean }>(`/agents/${agentId}`, {
        method: 'DELETE',
      }),

    start: (agentId: string): Promise<AgentResponse> =>
      this.request<AgentResponse>(`/agents/${agentId}/start`, {
        method: 'POST',
      }),

    stop: (agentId: string): Promise<AgentResponse> =>
      this.request<AgentResponse>(`/agents/${agentId}/stop`, {
        method: 'POST',
      }),

    restart: (agentId: string): Promise<AgentResponse> =>
      this.request<AgentResponse>(`/agents/${agentId}/restart`, {
        method: 'POST',
      }),

    move: (agentId: string, data: MoveAgent): Promise<AgentResponse> =>
      this.request<AgentResponse>(`/agents/${agentId}/move`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // ── Logs ────────────────────────────────────────

  readonly logs = {
    history: (agentId: string, params?: { limit?: number; offset?: number }): Promise<LogResponse[]> => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.offset) searchParams.set('offset', String(params.offset));
      const query = searchParams.toString();
      return this.request<LogResponse[]>(`/agents/${agentId}/logs/history${query ? `?${query}` : ''}`);
    },

    streamUrl: (agentId: string): string => `${this.baseUrl}/agents/${agentId}/logs`,
  };

  // ── Tmux ──────────────────────────────────────

  readonly tmux = {
    listSessions: (): Promise<TmuxSessionInfo[]> =>
      this.request<TmuxSessionInfo[]>('/tmux/sessions'),
  };

  // ── Metrics ─────────────────────────────────────

  readonly metrics = {
    latest: (agentId: string): Promise<MetricResponse> =>
      this.request<MetricResponse>(`/agents/${agentId}/metrics`),

    history: (agentId: string, params?: { limit?: number }): Promise<MetricResponse[]> => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', String(params.limit));
      const query = searchParams.toString();
      return this.request<MetricResponse[]>(`/agents/${agentId}/metrics/history${query ? `?${query}` : ''}`);
    },
  };
}

export const api = new ApiClient();
export { ApiClient };
