import { describe, it, expect } from 'vitest';
import {
  createAgentSchema,
  updateAgentSchema,
  moveAgentSchema,
  agentResponseSchema,
} from '../schemas/agent.js';
import { createBoardSchema, boardResponseSchema } from '../schemas/board.js';
import { swimlaneResponseSchema, updateSwimlaneSchema } from '../schemas/swimlane.js';
import { logResponseSchema } from '../schemas/log.js';
import { metricResponseSchema } from '../schemas/metric.js';

describe('createAgentSchema', () => {
  it('accepts valid data with required fields only', () => {
    const result = createAgentSchema.safeParse({
      name: 'Test Agent',
      boardId: 'board-123',
      swimlaneId: 'swimlane-456',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid data with all optional fields', () => {
    const result = createAgentSchema.safeParse({
      name: 'Test Agent',
      boardId: 'board-123',
      swimlaneId: 'swimlane-456',
      workingDir: '/home/user/project',
      envVars: { NODE_ENV: 'production' },
      command: 'npm run dev',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = createAgentSchema.safeParse({
      boardId: 'board-123',
      swimlaneId: 'swimlane-456',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createAgentSchema.safeParse({
      name: '',
      boardId: 'board-123',
      swimlaneId: 'swimlane-456',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 128 characters', () => {
    const result = createAgentSchema.safeParse({
      name: 'a'.repeat(129),
      boardId: 'board-123',
      swimlaneId: 'swimlane-456',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing boardId', () => {
    const result = createAgentSchema.safeParse({
      name: 'Test Agent',
      swimlaneId: 'swimlane-456',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing swimlaneId', () => {
    const result = createAgentSchema.safeParse({
      name: 'Test Agent',
      boardId: 'board-123',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateAgentSchema', () => {
  it('accepts partial updates', () => {
    const result = updateAgentSchema.safeParse({
      name: 'Updated Agent',
    });
    expect(result.success).toBe(true);
  });

  it('accepts status update', () => {
    const result = updateAgentSchema.safeParse({
      status: 'running',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = updateAgentSchema.safeParse({
      status: 'invalid-status',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty object (all fields optional)', () => {
    const result = updateAgentSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('moveAgentSchema', () => {
  it('accepts valid data with swimlaneId only', () => {
    const result = moveAgentSchema.safeParse({
      swimlaneId: 'swimlane-123',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid data with swimlaneId and position', () => {
    const result = moveAgentSchema.safeParse({
      swimlaneId: 'swimlane-123',
      position: 2,
    });
    expect(result.success).toBe(true);
  });

  it('accepts position of 0', () => {
    const result = moveAgentSchema.safeParse({
      swimlaneId: 'swimlane-123',
      position: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing swimlaneId', () => {
    const result = moveAgentSchema.safeParse({
      position: 2,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative position', () => {
    const result = moveAgentSchema.safeParse({
      swimlaneId: 'swimlane-123',
      position: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer position', () => {
    const result = moveAgentSchema.safeParse({
      swimlaneId: 'swimlane-123',
      position: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

describe('agentResponseSchema', () => {
  const validAgent = {
    id: 'agent-123',
    name: 'Test Agent',
    status: 'idle',
    boardId: 'board-456',
    swimlaneId: 'swimlane-789',
    model: null,
    workingDir: '/home/user/project',
    envVars: { NODE_ENV: 'development' },
    command: 'npm run dev',
    tmuxSession: null,
    tmuxPaneId: null,
    pid: 12345,
    exitCode: null,
    errorMessage: null,
    startedAt: null,
    stoppedAt: null,
    position: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  it('accepts complete agent shape', () => {
    const result = agentResponseSchema.safeParse(validAgent);
    expect(result.success).toBe(true);
  });

  it('accepts null optional fields', () => {
    const result = agentResponseSchema.safeParse({
      ...validAgent,
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
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = agentResponseSchema.safeParse({
      ...validAgent,
      status: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid datetime format', () => {
    const result = agentResponseSchema.safeParse({
      ...validAgent,
      createdAt: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer pid', () => {
    const result = agentResponseSchema.safeParse({
      ...validAgent,
      pid: 123.45,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = agentResponseSchema.safeParse({
      id: 'agent-123',
      name: 'Test Agent',
    });
    expect(result.success).toBe(false);
  });
});

describe('createBoardSchema', () => {
  it('accepts valid data', () => {
    const result = createBoardSchema.safeParse({
      name: 'My Board',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = createBoardSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createBoardSchema.safeParse({
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 128 characters', () => {
    const result = createBoardSchema.safeParse({
      name: 'a'.repeat(129),
    });
    expect(result.success).toBe(false);
  });
});

describe('boardResponseSchema', () => {
  it('accepts valid board response', () => {
    const result = boardResponseSchema.safeParse({
      id: 'board-123',
      name: 'My Board',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = boardResponseSchema.safeParse({
      id: 'board-123',
      name: 'My Board',
    });
    expect(result.success).toBe(false);
  });
});

describe('swimlaneResponseSchema', () => {
  it('accepts valid swimlane response', () => {
    const result = swimlaneResponseSchema.safeParse({
      id: 'swimlane-123',
      boardId: 'board-456',
      slug: 'in-progress',
      name: 'In Progress',
      position: 1,
      color: 'hsl(217 91% 60%)',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = swimlaneResponseSchema.safeParse({
      id: 'swimlane-123',
      boardId: 'board-456',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateSwimlaneSchema', () => {
  it('accepts partial updates', () => {
    const result = updateSwimlaneSchema.safeParse({
      name: 'Updated Name',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields optional)', () => {
    const result = updateSwimlaneSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = updateSwimlaneSchema.safeParse({
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative position', () => {
    const result = updateSwimlaneSchema.safeParse({
      position: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe('logResponseSchema', () => {
  it('accepts valid log response', () => {
    const result = logResponseSchema.safeParse({
      id: 'log-123',
      agentId: 'agent-456',
      level: 'info',
      content: 'Agent started successfully',
      timestamp: '2025-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid log levels', () => {
    const levels = ['debug', 'info', 'warn', 'error'];
    levels.forEach((level) => {
      const result = logResponseSchema.safeParse({
        id: 'log-123',
        agentId: 'agent-456',
        level,
        content: 'Test message',
        timestamp: '2025-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid log level', () => {
    const result = logResponseSchema.safeParse({
      id: 'log-123',
      agentId: 'agent-456',
      level: 'critical',
      content: 'Test message',
      timestamp: '2025-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = logResponseSchema.safeParse({
      id: 'log-123',
      agentId: 'agent-456',
    });
    expect(result.success).toBe(false);
  });
});

describe('metricResponseSchema', () => {
  it('accepts valid metric response', () => {
    const result = metricResponseSchema.safeParse({
      id: 'metric-123',
      agentId: 'agent-456',
      cpu: 45.5,
      memory: 1024,
      timestamp: '2025-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts cpu of 0', () => {
    const result = metricResponseSchema.safeParse({
      id: 'metric-123',
      agentId: 'agent-456',
      cpu: 0,
      memory: 1024,
      timestamp: '2025-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts cpu of 100', () => {
    const result = metricResponseSchema.safeParse({
      id: 'metric-123',
      agentId: 'agent-456',
      cpu: 100,
      memory: 1024,
      timestamp: '2025-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects cpu greater than 100', () => {
    const result = metricResponseSchema.safeParse({
      id: 'metric-123',
      agentId: 'agent-456',
      cpu: 101,
      memory: 1024,
      timestamp: '2025-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative cpu', () => {
    const result = metricResponseSchema.safeParse({
      id: 'metric-123',
      agentId: 'agent-456',
      cpu: -1,
      memory: 1024,
      timestamp: '2025-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer memory', () => {
    const result = metricResponseSchema.safeParse({
      id: 'metric-123',
      agentId: 'agent-456',
      cpu: 50,
      memory: 1024.5,
      timestamp: '2025-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative memory', () => {
    const result = metricResponseSchema.safeParse({
      id: 'metric-123',
      agentId: 'agent-456',
      cpu: 50,
      memory: -1,
      timestamp: '2025-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = metricResponseSchema.safeParse({
      id: 'metric-123',
      agentId: 'agent-456',
    });
    expect(result.success).toBe(false);
  });
});
