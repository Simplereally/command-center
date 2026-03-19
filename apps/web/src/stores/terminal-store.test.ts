import type { ConnectionStatus } from './terminal-store.js';

const createMockWebSocket = () => {
  const mock = {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onopen: null as ((...args: unknown[]) => void) | null,
    onclose: null as ((...args: unknown[]) => void) | null,
    onmessage: null as ((...args: unknown[]) => void) | null,
    onerror: null as ((...args: unknown[]) => void) | null,
  };
  return mock;
};

vi.stubGlobal('WebSocket', vi.fn().mockImplementation(createMockWebSocket));

const { makeTerminal } = vi.hoisted(() => {
  const makeTerminal = (
    overrides: Partial<{
      sessionName: string;
      agentId: string | null;
      status: ConnectionStatus;
      reconnectAttempts: number;
    }> = {},
  ) => ({
    sessionName: 'test-session',
    agentId: 'agent-1',
    connection: null,
    status: 'disconnected' as const,
    reconnectAttempts: 0,
    lastError: null,
    onOutput: null,
    onExit: null,
    onStatusChange: null,
    ...overrides,
  });

  return { makeTerminal };
});

import { useTerminalStore } from './terminal-store.js';

describe('useTerminalStore', () => {
  beforeEach(() => {
    useTerminalStore.setState({
      terminals: new Map(),
      agentToSession: new Map(),
    });
    vi.clearAllMocks();
    vi.stubGlobal('WebSocket', vi.fn().mockImplementation(createMockWebSocket));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('connectTerminal', () => {
    it('creates a new terminal instance and connects WebSocket', () => {
      const { connectTerminal } = useTerminalStore.getState();
      connectTerminal('session-1', 'agent-1');

      const state = useTerminalStore.getState();
      expect(state.terminals.has('session-1')).toBe(true);
      expect(state.agentToSession.get('agent-1')).toBe('session-1');
      expect(vi.mocked(WebSocket)).toHaveBeenCalledWith(
        'ws://localhost:4000/api/v1/tmux/sessions/session-1/terminal',
      );
    });

    it('registers output callback', () => {
      const onOutput = vi.fn();
      const { connectTerminal } = useTerminalStore.getState();
      connectTerminal('session-1', 'agent-1', { onOutput });

      const state = useTerminalStore.getState();
      const terminal = state.terminals.get('session-1');
      expect(terminal?.onOutput).toBe(onOutput);
    });

    it('registers exit callback', () => {
      const onExit = vi.fn();
      const { connectTerminal } = useTerminalStore.getState();
      connectTerminal('session-1', 'agent-1', { onExit });

      const state = useTerminalStore.getState();
      const terminal = state.terminals.get('session-1');
      expect(terminal?.onExit).toBe(onExit);
    });

    it('registers status change callback', () => {
      const onStatusChange = vi.fn();
      const { connectTerminal } = useTerminalStore.getState();
      connectTerminal('session-1', 'agent-1', { onStatusChange });

      const state = useTerminalStore.getState();
      const terminal = state.terminals.get('session-1');
      expect(terminal?.onStatusChange).toBe(onStatusChange);
    });

    it('updates existing terminal when connecting with same session name', () => {
      const { connectTerminal } = useTerminalStore.getState();
      connectTerminal('session-1', 'agent-1');
      const newOnOutput = vi.fn();
      connectTerminal('session-1', 'agent-2', { onOutput: newOnOutput });

      const state = useTerminalStore.getState();
      const terminal = state.terminals.get('session-1');
      expect(terminal?.agentId).toBe('agent-2');
      expect(terminal?.onOutput).toBe(newOnOutput);
      expect(state.agentToSession.get('agent-2')).toBe('session-1');
    });
  });

  describe('disconnectTerminal', () => {
    it('sets status to disconnected and closes WebSocket', () => {
      const mockClose = vi.fn();
      vi.stubGlobal(
        'WebSocket',
        vi.fn().mockImplementation(() => ({
          ...createMockWebSocket(),
          close: mockClose,
        })),
      );

      const { connectTerminal, disconnectTerminal } = useTerminalStore.getState();
      connectTerminal('session-1', 'agent-1');
      disconnectTerminal('session-1');

      const state = useTerminalStore.getState();
      const terminal = state.terminals.get('session-1');
      expect(terminal?.status).toBe('disconnected');
      expect(mockClose).toHaveBeenCalled();
    });

    it('removes agent-to-session mapping', () => {
      const { connectTerminal, disconnectTerminal } = useTerminalStore.getState();
      connectTerminal('session-1', 'agent-1');
      disconnectTerminal('session-1');

      const state = useTerminalStore.getState();
      expect(state.agentToSession.has('agent-1')).toBe(false);
    });

    it('does nothing if terminal does not exist', () => {
      const { disconnectTerminal } = useTerminalStore.getState();
      expect(() => disconnectTerminal('nonexistent')).not.toThrow();
    });
  });

  describe('reconnectTerminal', () => {
    it('resets reconnect attempts and creates new connection', () => {
      useTerminalStore.setState({
        terminals: new Map([
          [
            'session-1',
            {
              sessionName: 'session-1',
              agentId: 'agent-1',
              connection: null,
              status: 'error' as ConnectionStatus,
              reconnectAttempts: 3,
              lastError: 'Previous error',
              onOutput: null,
              onExit: null,
              onStatusChange: null,
            },
          ],
        ]),
        agentToSession: new Map([['agent-1', 'session-1']]),
      });

      const { reconnectTerminal } = useTerminalStore.getState();
      reconnectTerminal('session-1');

      expect(vi.mocked(WebSocket)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(WebSocket)).toHaveBeenCalledWith(
        'ws://localhost:4000/api/v1/tmux/sessions/session-1/terminal',
      );
    });

    it('does nothing if terminal does not exist', () => {
      const { reconnectTerminal } = useTerminalStore.getState();
      reconnectTerminal('nonexistent');
      expect(vi.mocked(WebSocket)).not.toHaveBeenCalled();
    });
  });

  describe('getTerminalStatus', () => {
    it('returns status of existing terminal', () => {
      const terminal = makeTerminal({ sessionName: 'session-1', agentId: 'agent-1' });
      useTerminalStore.setState({
        terminals: new Map([['session-1', terminal]]),
        agentToSession: new Map(),
      });

      const { getTerminalStatus } = useTerminalStore.getState();
      expect(getTerminalStatus('session-1')).toBe('disconnected');
    });

    it('returns undefined for nonexistent terminal', () => {
      const { getTerminalStatus } = useTerminalStore.getState();
      expect(getTerminalStatus('nonexistent')).toBeUndefined();
    });
  });

  describe('getTerminalByAgent', () => {
    it('returns terminal for existing agent', () => {
      const terminal = makeTerminal({ sessionName: 'session-1', agentId: 'agent-1' });
      useTerminalStore.setState({
        terminals: new Map([['session-1', terminal]]),
        agentToSession: new Map([['agent-1', 'session-1']]),
      });

      const { getTerminalByAgent } = useTerminalStore.getState();
      const result = getTerminalByAgent('agent-1');
      expect(result?.sessionName).toBe('session-1');
    });

    it('returns undefined for nonexistent agent', () => {
      const { getTerminalByAgent } = useTerminalStore.getState();
      expect(getTerminalByAgent('nonexistent')).toBeUndefined();
    });
  });

  describe('sendInput', () => {
    it('sends input message when connected', () => {
      const mockSend = vi.fn();
      vi.stubGlobal(
        'WebSocket',
        vi.fn().mockImplementation(() => ({
          ...createMockWebSocket(),
          send: mockSend,
        })),
      );

      const { connectTerminal, sendInput } = useTerminalStore.getState();
      connectTerminal('session-1', 'agent-1');

      const result = sendInput('session-1', 'ls -la');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'terminal:input',
          sessionId: 'session-1',
          data: 'ls -la',
        }),
      );
    });

    it('returns false when terminal does not exist', () => {
      const { sendInput } = useTerminalStore.getState();
      expect(sendInput('nonexistent', 'test')).toBe(false);
    });

    it('returns false when not connected', () => {
      const terminal = makeTerminal({
        sessionName: 'session-1',
        agentId: 'agent-1',
        status: 'disconnected',
      });
      useTerminalStore.setState({
        terminals: new Map([['session-1', terminal]]),
        agentToSession: new Map([['agent-1', 'session-1']]),
      });

      const { sendInput } = useTerminalStore.getState();
      expect(sendInput('session-1', 'test')).toBe(false);
    });
  });

  describe('sendResize', () => {
    it('sends resize message when connected', () => {
      const mockSend = vi.fn();
      vi.stubGlobal(
        'WebSocket',
        vi.fn().mockImplementation(() => ({
          ...createMockWebSocket(),
          send: mockSend,
        })),
      );

      const { connectTerminal, sendResize } = useTerminalStore.getState();
      connectTerminal('session-1', 'agent-1');

      const result = sendResize('session-1', 80, 24);

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'terminal:resize',
          sessionId: 'session-1',
          cols: 80,
          rows: 24,
        }),
      );
    });

    it('returns false when terminal does not exist', () => {
      const { sendResize } = useTerminalStore.getState();
      expect(sendResize('nonexistent', 80, 24)).toBe(false);
    });

    it('returns false when not connected', () => {
      const terminal = makeTerminal({
        sessionName: 'session-1',
        agentId: 'agent-1',
        status: 'reconnecting',
      });
      useTerminalStore.setState({
        terminals: new Map([['session-1', terminal]]),
        agentToSession: new Map([['agent-1', 'session-1']]),
      });

      const { sendResize } = useTerminalStore.getState();
      expect(sendResize('session-1', 80, 24)).toBe(false);
    });
  });

  describe('agentToSession mapping', () => {
    it('maintains bidirectional mapping between agent and session', () => {
      const { connectTerminal, getTerminalByAgent, getTerminalStatus } =
        useTerminalStore.getState();

      connectTerminal('my-session', 'my-agent');

      expect(getTerminalByAgent('my-agent')?.sessionName).toBe('my-session');
      expect(getTerminalStatus('my-session')).toBeDefined();
    });

    it('handles multiple agents', () => {
      const { connectTerminal } = useTerminalStore.getState();

      connectTerminal('session-1', 'agent-1');
      connectTerminal('session-2', 'agent-2');
      connectTerminal('session-3', 'agent-3');

      const state = useTerminalStore.getState();
      expect(state.agentToSession.size).toBe(3);
      expect(state.terminals.size).toBe(3);
    });
  });
});
