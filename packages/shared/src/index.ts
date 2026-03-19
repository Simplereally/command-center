// ── Constants ────────────────────────────────────────────────────────────────

export { AgentStatus, VALID_TRANSITIONS, canTransition } from './constants/agent-status.js';

export { SWIMLANE_STATUS_MAP, SWIMLANE_DEFINITIONS } from './constants/swimlane-defaults.js';

// ── Schemas ──────────────────────────────────────────────────────────────────

export {
  createAgentSchema,
  updateAgentSchema,
  moveAgentSchema,
  agentResponseSchema,
} from './schemas/agent.js';

export { createBoardSchema, boardResponseSchema, updateBoardSchema } from './schemas/board.js';

export {
  swimlaneResponseSchema,
  updateSwimlaneSchema,
  createSwimlaneSchema,
} from './schemas/swimlane.js';

export { logResponseSchema } from './schemas/log.js';

export { metricResponseSchema } from './schemas/metric.js';

// ── Types ────────────────────────────────────────────────────────────────────

export type {
  CreateAgent,
  UpdateAgent,
  MoveAgent,
  AgentResponse,
  CreateBoard,
  BoardResponse,
  UpdateBoard,
  SwimlaneResponse,
  UpdateSwimlane,
  CreateSwimlane,
  LogLevel,
  LogResponse,
  MetricResponse,
} from './types/index.js';

export type {
  TerminalInputMessage,
  TerminalOutputMessage,
  TerminalResizeMessage,
  TerminalExitMessage,
  TerminalErrorMessage,
  TerminalMessage,
  AgentStatusChangeMessage,
  AgentLogMessage,
  AgentMetricMessage,
  AgentMessage,
  WebSocketMessage,
  SSEAgentCreatedEvent,
  SSEAgentUpdatedEvent,
  SSEAgentDeletedEvent,
  SSEAgentStatusEvent,
  SSELogEvent,
  SSEMetricEvent,
  SSEEvent,
} from './types/events.js';
