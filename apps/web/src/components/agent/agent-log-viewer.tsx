import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Trash2, Loader2, WifiOff } from 'lucide-react';
import type { LogLevel } from '@command-center/shared';
import { useLogStream } from '../../lib/use-log-stream.js';
import { cn } from '../../lib/cn.js';

interface AgentLogViewerProps {
  agentId: string;
  maxLines?: number;
  maxHeight?: string;
}

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'text-gray-500',
  info: 'text-blue-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
};

const LOG_LEVEL_BG: Record<LogLevel, string> = {
  debug: 'bg-gray-500/10',
  info: 'bg-blue-500/10',
  warn: 'bg-amber-500/10',
  error: 'bg-red-500/10',
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AgentLogViewer({
  agentId,
  maxLines = 500,
  maxHeight = '400px',
}: AgentLogViewerProps) {
  const { logs: allLogs, connected, error, clearLogs } = useLogStream(agentId);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleLogs = useMemo(() => {
    if (allLogs.length <= maxLines) return allLogs;
    return allLogs.slice(allLogs.length - maxLines);
  }, [allLogs, maxLines]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 40;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(atBottom);
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      requestAnimationFrame(scrollToBottom);
    }
  }, [visibleLogs, isAtBottom, scrollToBottom]);

  const isReconnecting = !connected && error === 'Reconnecting…';
  const isInitialLoading = !connected && !error && visibleLogs.length === 0;

  return (
    <div className="flex flex-col rounded-lg border border-border bg-gray-950 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gray-900/80">
        <span className="text-xs font-medium text-text-secondary tracking-wide uppercase">
          Logs
        </span>
        <div className="flex items-center gap-2">
          {isReconnecting && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <WifiOff className="h-3 w-3" />
              Reconnecting…
            </span>
          )}
          {isInitialLoading && (
            <span className="flex items-center gap-1 text-xs text-text-tertiary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Connecting…
            </span>
          )}
          {connected && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
          <button
            type="button"
            onClick={clearLogs}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-text-tertiary hover:text-text-secondary hover:bg-gray-800 transition-colors"
            aria-label="Clear logs"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-auto overflow-x-hidden scroll-smooth"
          style={{ maxHeight }}
          role="log"
          aria-live="polite"
          aria-label="Agent log output"
        >
          {visibleLogs.length === 0 && !isInitialLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-text-tertiary">
              No logs yet
            </div>
          ) : visibleLogs.length === 0 && isInitialLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting…
            </div>
          ) : (
            <div className="p-2 space-y-px">
              {visibleLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex gap-2 rounded px-2 py-0.5 text-xs font-mono',
                    LOG_LEVEL_BG[entry.level],
                  )}
                >
                  <span className="shrink-0 text-gray-500 select-none">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 w-12 text-right uppercase font-semibold select-none',
                      LOG_LEVEL_COLORS[entry.level],
                    )}
                  >
                    {entry.level}
                  </span>
                  <span className="text-gray-200 break-all whitespace-pre-wrap">
                    {entry.content}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isAtBottom && visibleLogs.length > 0 && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-white shadow-lg hover:bg-accent-hover transition-colors"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-3 w-3" />
            New logs
          </button>
        )}
      </div>
    </div>
  );
}
