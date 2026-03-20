import { useState, useEffect, useRef, useMemo } from 'react';
import { useAgentStore } from '../../stores/agent-store.js';
import { AgentStatus } from '@command-center/shared';
import { api } from '../../lib/api-client.js';

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffS = Math.floor(diffMs / 1000);

  if (diffS < 5) return 'just now';
  if (diffS < 60) return `${diffS}s ago`;
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

const TMUX_POLL_INTERVAL_MS = 10_000;
const RELATIVE_TIME_TICK_MS = 1_000;

export function StatusBar() {
  const agents = useAgentStore((s) => s.agents);

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

  useEffect(() => {
    let cancelled = false;

    const fetchTmuxSessions = async () => {
      try {
        const sessions = await api.tmux.listSessions();
        if (!cancelled) setTmuxCount(sessions.length);
      } catch {
        // silently ignore — tmux count is non-critical
      }
    };

    fetchTmuxSessions();
    const intervalId = setInterval(fetchTmuxSessions, TMUX_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

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
      <div className="flex items-center gap-3">
        <kbd className="rounded border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
          ⌘K
        </kbd>
        <span className="text-text-tertiary">command palette</span>
      </div>
    </footer>
  );
}
