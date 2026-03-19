import { useCallback, useEffect, useRef, useState } from 'react';
import type { LogLevel } from '@command-center/shared';
import { api } from './api-client.js';

export interface LogEntry {
  id: string;
  level: LogLevel;
  content: string;
  timestamp: number;
}

interface UseLogStreamResult {
  logs: LogEntry[];
  connected: boolean;
  error: string | null;
  clearLogs: () => void;
}

const MAX_BUFFER = 1000;

function parseLogContent(raw: Record<string, unknown>): string {
  return (typeof raw.content === 'string' ? raw.content : null)
    ?? (typeof raw.message === 'string' ? raw.message : '');
}

function parseLogTimestamp(raw: Record<string, unknown>): number {
  const ts = raw.timestamp;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const n = Number(ts);
    return Number.isNaN(n) ? new Date(ts).getTime() : n;
  }
  return Date.now();
}

export function useLogStream(agentId: string | null): UseLogStreamResult {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seenIdsRef = useRef(new Set<string>());
  const eventSourceRef = useRef<EventSource | null>(null);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => {
      if (seenIdsRef.current.has(entry.id)) return prev;
      seenIdsRef.current.add(entry.id);
      const next = [...prev, entry];
      if (next.length > MAX_BUFFER) {
        const removed = next.splice(0, next.length - MAX_BUFFER);
        for (const r of removed) {
          seenIdsRef.current.delete(r.id);
        }
      }
      return next;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    seenIdsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!agentId) {
      setLogs([]);
      seenIdsRef.current.clear();
      setConnected(false);
      setError(null);
      return;
    }

    const abortController = new AbortController();

    async function loadHistory() {
      try {
        const history = await api.logs.history(agentId!, { limit: 200 });
        if (abortController.signal.aborted) return;

        const entries: LogEntry[] = history.map((raw) => {
          const rec = raw as unknown as Record<string, unknown>;
          return {
            id: String(rec.id),
            level: rec.level as LogLevel,
            content: parseLogContent(rec),
            timestamp: parseLogTimestamp(rec),
          };
        });

        entries.sort((a, b) => a.timestamp - b.timestamp);

        const trimmed = entries.length > MAX_BUFFER
          ? entries.slice(entries.length - MAX_BUFFER)
          : entries;

        setLogs(trimmed);
        seenIdsRef.current.clear();
        for (const e of trimmed) {
          seenIdsRef.current.add(e.id);
        }
      } catch {
        // History load failed; SSE will still provide live logs
      }
    }

    loadHistory();

    const streamUrl = api.logs.streamUrl(agentId);
    const fullUrl = streamUrl.startsWith('http')
      ? streamUrl
      : `${window.location.origin}${streamUrl}`;

    const es = new EventSource(fullUrl);
    eventSourceRef.current = es;

    es.addEventListener('log', (event: MessageEvent) => {
      try {
        const raw = JSON.parse(event.data as string) as Record<string, unknown>;
        addLog({
          id: String(raw.id),
          level: raw.level as LogLevel,
          content: parseLogContent(raw),
          timestamp: parseLogTimestamp(raw),
        });
      } catch {
        // Ignore malformed events
      }
    });

    es.addEventListener('open', () => {
      setConnected(true);
      setError(null);
    });

    es.addEventListener('error', () => {
      setConnected(false);
      if (es.readyState === EventSource.CLOSED) {
        setError('Connection closed');
      } else {
        setError('Reconnecting…');
      }
    });

    return () => {
      abortController.abort();
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [agentId, addLog]);

  return { logs, connected, error, clearLogs };
}
