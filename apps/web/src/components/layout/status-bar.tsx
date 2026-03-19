import { useAgentStore } from '../../stores/agent-store.js';
import { AgentStatus } from '@command-center/shared';

export function StatusBar() {
  const agents = useAgentStore((s) => s.agents);

  const runningCount = Array.from(agents.values()).filter(
    (a) => a.status === AgentStatus.RUNNING,
  ).length;
  const totalCount = agents.size;

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
          <span className="text-text-primary">0</span> tmux sessions
        </span>
      </div>

      {/* Center: Last event */}
      <div className="text-text-tertiary">
        Last event: —
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
