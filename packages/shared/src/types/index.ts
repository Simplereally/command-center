// Re-export all inferred types from schemas
export type { CreateAgent, UpdateAgent, MoveAgent, AgentResponse } from '../schemas/agent.js';

export type { CreateBoard, BoardResponse, UpdateBoard } from '../schemas/board.js';

export type { SwimlaneResponse, UpdateSwimlane, CreateSwimlane } from '../schemas/swimlane.js';

export type { LogLevel, LogResponse } from '../schemas/log.js';

export type { MetricResponse } from '../schemas/metric.js';

// Re-export event types
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
} from './events.js';

// Re-export AgentStatus type
export type { AgentStatus } from '../constants/agent-status.js';
