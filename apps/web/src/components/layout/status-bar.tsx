import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAgentStore } from '../../stores/agent-store.js';
import { useUiStore } from '../../stores/ui-store.js';
import { AgentStatus } from '@command-center/shared';
import { api } from '../../lib/api-client.js';
import { formatRelativeTime } from '../../lib/format-date.js';

const TMUX_POLL_INTERVAL_MS = 30_000;
const RELATIVE_TIME_TICK_MS = 1_000;

export function StatusBar() {
  const agents = useAgentStore((s) => s.agents);
  const selectedAgentId = useUiStore((s) => s.selectedAgentId);
  const commandPaletteOpen = useUiStore((s) => s.commandPaletteOpen);

  const { runningCount, totalCount } = useMemo(() => {
    let running = 0;
    for (const agent of agents.values()) {
      if (agent.status === AgentStatus.RUNNING) running++;
    }
    return { runningCount: running, totalCount: agents.size };
  }, [agents]);

  const [tmuxCount, setTmuxCount] = useState(0);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const prevAgentsRef = useRef<Map<string, string>>(new Map());

  const fetchTmuxSessions = useCallback(async () => {
    try {
      const sessions = await api.tmux.listSessions();
      setTmuxCount(sessions.length);
    } catch {
      // silently ignore — tmux count is non-critical
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (cancelled) return;
      fetchTmuxSessions();
      intervalId = setInterval(fetchTmuxSessions, TMUX_POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchTmuxSessions]);

  useEffect(() => {
    const currentStatuses = new Map<string, string>();
    agents.forEach((agent, id) => {
      currentStatuses.set(id, agent.status);
    });

    const prev = prevAgentsRef.current;
    let changed = false;

    if (prev.size !== currentStatuses.size) {
      changed = true;
    } else {
      for (const [id, status] of currentStatuses) {
        if (prev.get(id) !== status) {
          changed = true;
          break;
        }
      }
    }

    if (changed && prev.size > 0) {
      setLastEventTime(new Date());
    }

    prevAgentsRef.current = currentStatuses;
  }, [agents]);

  useEffect(() => {
    if (!lastEventTime) return;
    const intervalId = setInterval(() => setTick((t) => t + 1), RELATIVE_TIME_TICK_MS);
    return () => clearInterval(intervalId);
  }, [lastEventTime]);

  return (
    <footer data-testid="status-bar" className="flex h-8 flex-shrink-0 items-center justify-between border-t border-border bg-surface px-4 text-xs text-text-secondary">
      {/* Left: Agent + tmux counts */}
      <div className="flex items-center gap-4">
        <span>
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-status-running" />
          {runningCount} active
        </span>
        <span>{totalCount} total agents</span>
        <span className="text-text-tertiary">|</span>
        <span>
          <span className="text-text-primary">{tmuxCount}</span> tmux sessions
        </span>
      </div>

      {/* Center: Last event */}
      <div className="text-text-tertiary">
        Last event: {lastEventTime ? formatRelativeTime(lastEventTime) : '—'}
      </div>

      {/* Right: Keyboard hints */}
      <div data-testid="keyboard-hints" className="flex items-center gap-3 text-text-tertiary">
        {commandPaletteOpen ? (
          <>
            <kbd className="rounded border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
            <span>navigate</span>
            <kbd className="rounded border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
            <span>select</span>
            <kbd className="rounded border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
            <span>close</span>
          </>
        ) : selectedAgentId ? (
          <>
            <kbd className="rounded border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-[10px]">T</kbd>
            <span>terminal</span>
            <kbd className="rounded border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-[10px]">Space</kbd>
            <span>start/stop</span>
            <kbd className="rounded border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-[10px]">R</kbd>
            <span>restart</span>
          </>
        ) : (
          <>
            <kbd className="rounded border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            <span>command palette</span>
            <kbd className="rounded border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-[10px]">⌘N</kbd>
            <span>new agent</span>
          </>
        )}
      </div>
    </footer>
  );
}
