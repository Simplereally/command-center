import { renderHook, act, waitFor } from '@testing-library/react';
import { useLogStream } from './use-log-stream.js';

const mockLogsHistory = vi.fn();

vi.mock('./api-client.js', () => ({
  api: {
    logs: {
      history: (...args: unknown[]) => mockLogsHistory(...args),
      streamUrl: (agentId: string) => `/api/v1/agents/${agentId}/logs`,
    },
  },
}));

class MockEventSource {
  static instances: MockEventSource[] = [];
  readonly url: string;
  readyState = 0;
  private listeners = new Map<string, Set<(e: MessageEvent | Event) => void>>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (e: MessageEvent | Event) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
  }

  removeEventListener(type: string, cb: (e: MessageEvent | Event) => void) {
    this.listeners.get(type)?.delete(cb);
  }

  close() {
    this.readyState = 2;
  }

  simulateOpen() {
    this.readyState = 1;
    for (const cb of this.listeners.get('open') ?? []) {
      cb(new Event('open'));
    }
  }

  simulateError(closed = false) {
    this.readyState = closed ? 2 : 0;
    for (const cb of this.listeners.get('error') ?? []) {
      cb(new Event('error'));
    }
  }

  simulateLog(data: Record<string, unknown>) {
    const event = new MessageEvent('log', { data: JSON.stringify(data) });
    for (const cb of this.listeners.get('log') ?? []) {
      cb(event);
    }
  }

  static get CLOSED() {
    return 2;
  }

  static reset() {
    MockEventSource.instances = [];
  }
}

const originalEventSource = globalThis.EventSource;

beforeEach(() => {
  vi.clearAllMocks();
  MockEventSource.reset();
  (globalThis as Record<string, unknown>).EventSource = MockEventSource as unknown as typeof EventSource;
  mockLogsHistory.mockResolvedValue([]);
});

afterAll(() => {
  globalThis.EventSource = originalEventSource;
});

describe('useLogStream', () => {
  it('returns empty state when agentId is null', () => {
    const { result } = renderHook(() => useLogStream(null));

    expect(result.current.logs).toEqual([]);
    expect(result.current.connected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads history on mount', async () => {
    mockLogsHistory.mockResolvedValue([
      { id: 'log-1', level: 'info', content: 'Started', timestamp: '2024-01-01T00:00:00Z' },
      { id: 'log-2', level: 'warn', content: 'Warning', timestamp: '2024-01-01T00:00:01Z' },
    ]);

    const { result } = renderHook(() => useLogStream('agent-1'));

    await waitFor(() => {
      expect(result.current.logs).toHaveLength(2);
    });

    expect(mockLogsHistory).toHaveBeenCalledWith('agent-1', { limit: 200 });
    expect(result.current.logs[0]!.content).toBe('Started');
    expect(result.current.logs[1]!.content).toBe('Warning');
  });

  it('creates EventSource with correct URL', async () => {
    renderHook(() => useLogStream('agent-1'));

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    expect(MockEventSource.instances[0]!.url).toContain('/agents/agent-1/logs');
  });

  it('sets connected=true on EventSource open', async () => {
    const { result } = renderHook(() => useLogStream('agent-1'));

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    act(() => {
      MockEventSource.instances[0]!.simulateOpen();
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('adds log entries from SSE events', async () => {
    const { result } = renderHook(() => useLogStream('agent-1'));

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    act(() => {
      MockEventSource.instances[0]!.simulateOpen();
      MockEventSource.instances[0]!.simulateLog({
        id: 'sse-1',
        level: 'info',
        content: 'New log entry',
        timestamp: Date.now(),
      });
    });

    await waitFor(() => {
      expect(result.current.logs.some((l) => l.content === 'New log entry')).toBe(true);
    });
  });

  it('deduplicates log entries by id', async () => {
    const { result } = renderHook(() => useLogStream('agent-1'));

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    act(() => {
      MockEventSource.instances[0]!.simulateOpen();
      MockEventSource.instances[0]!.simulateLog({
        id: 'sse-1',
        level: 'info',
        content: 'Duplicate entry',
        timestamp: Date.now(),
      });
      MockEventSource.instances[0]!.simulateLog({
        id: 'sse-1',
        level: 'info',
        content: 'Duplicate entry',
        timestamp: Date.now(),
      });
    });

    await waitFor(() => {
      const matchingLogs = result.current.logs.filter((l) => l.id === 'sse-1');
      expect(matchingLogs).toHaveLength(1);
    });
  });

  it('handles backwards-compat "message" field', async () => {
    const { result } = renderHook(() => useLogStream('agent-1'));

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    act(() => {
      MockEventSource.instances[0]!.simulateOpen();
      MockEventSource.instances[0]!.simulateLog({
        id: 'sse-2',
        level: 'info',
        message: 'From message field',
        timestamp: Date.now(),
      });
    });

    await waitFor(() => {
      expect(result.current.logs.some((l) => l.content === 'From message field')).toBe(true);
    });
  });

  it('sets error on EventSource error (reconnecting)', async () => {
    const { result } = renderHook(() => useLogStream('agent-1'));

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    act(() => {
      MockEventSource.instances[0]!.simulateError(false);
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.error).toBe('Reconnecting…');
  });

  it('sets error on EventSource closed', async () => {
    const { result } = renderHook(() => useLogStream('agent-1'));

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    act(() => {
      MockEventSource.instances[0]!.simulateError(true);
    });

    expect(result.current.connected).toBe(false);
    expect(result.current.error).toBe('Connection closed');
  });

  it('clears logs when clearLogs is called', async () => {
    const { result } = renderHook(() => useLogStream('agent-1'));

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    act(() => {
      MockEventSource.instances[0]!.simulateOpen();
      MockEventSource.instances[0]!.simulateLog({
        id: 'sse-1',
        level: 'info',
        content: 'A log',
        timestamp: Date.now(),
      });
    });

    await waitFor(() => {
      expect(result.current.logs).toHaveLength(1);
    });

    act(() => {
      result.current.clearLogs();
    });

    expect(result.current.logs).toHaveLength(0);
  });

  it('closes EventSource on unmount', async () => {
    const { unmount } = renderHook(() => useLogStream('agent-1'));

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    const es = MockEventSource.instances[0]!;
    unmount();

    expect(es.readyState).toBe(2);
  });

  it('resets state when agentId changes to null', async () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useLogStream>,
      { agentId: string | null }
    >(
      ({ agentId }) => useLogStream(agentId),
      { initialProps: { agentId: 'agent-1' } },
    );

    await waitFor(() => {
      expect(MockEventSource.instances).toHaveLength(1);
    });

    rerender({ agentId: null });

    expect(result.current.logs).toEqual([]);
    expect(result.current.connected).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
