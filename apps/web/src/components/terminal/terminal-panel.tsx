import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { TerminalTabs, type TerminalTab } from './terminal-tabs.js';
import { TerminalInstance } from './terminal-instance.js';
import { cn } from '../../lib/cn.js';
import { api } from '../../lib/api-client.js';
import { WS_BASE_URL } from '../../lib/constants.js';

export interface TerminalSession {
  id: string;
  name: string;
  sessionId: string;
  wsUrl: string;
}

export interface TerminalPanelProps {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onSessionClose: (sessionId: string) => void;
  onSessionCreate: () => void;
  className?: string;
}

let sessionCounter = 0;

export function TerminalPanel({
  sessions,
  activeSessionId,
  onSessionSelect,
  onSessionClose,
  onSessionCreate,
  className,
}: TerminalPanelProps) {
  const [localSessions, setLocalSessions] = useState<TerminalSession[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const prevSessionsRef = useRef(sessions);

  useEffect(() => {
    if (sessions !== prevSessionsRef.current) {
      prevSessionsRef.current = sessions;
    }
  }, [sessions]);

  const allSessions = useMemo(
    () => [...sessions, ...localSessions.filter(
      (ls) => !sessions.some((s) => s.sessionId === ls.sessionId),
    )],
    [sessions, localSessions],
  );

  const tabs: TerminalTab[] = allSessions.map((s) => ({
    id: s.id,
    name: s.name,
    sessionId: s.sessionId,
    isActive: s.sessionId === activeSessionId,
  }));

  const [localActiveTabId, setLocalActiveTabId] = useState<string | null>(
    allSessions.find((s) => s.sessionId === activeSessionId)?.id ?? null,
  );

  const effectiveActiveTabId = localActiveTabId ?? allSessions[0]?.id ?? null;
  const activeTab = tabs.find((t) => t.id === effectiveActiveTabId);
  const activeSession = allSessions.find((s) => s.sessionId === activeTab?.sessionId)
    ?? allSessions.find((s) => s.sessionId === activeSessionId);

  const handleTabSelect = useCallback(
    (tabId: string) => {
      setLocalActiveTabId(tabId);
      const tab = allSessions.find((s) => s.id === tabId);
      if (tab) {
        onSessionSelect(tab.sessionId);
      }
    },
    [allSessions, onSessionSelect],
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      const session = allSessions.find((s) => s.id === tabId);
      if (!session) return;

      onSessionClose(session.sessionId);
      setLocalSessions((prev) => prev.filter((s) => s.id !== tabId));

      const remaining = allSessions.filter((s) => s.id !== tabId);
      if (effectiveActiveTabId === tabId && remaining.length > 0) {
        const closedIndex = allSessions.findIndex((s) => s.id === tabId);
        const newActiveIndex = Math.min(closedIndex, remaining.length - 1);
        const newActive = remaining[newActiveIndex];
        if (newActive) {
          setLocalActiveTabId(newActive.id);
          onSessionSelect(newActive.sessionId);
        }
      }

      if (allSessions.length === 1) {
        toast.info('Last terminal closed');
      }
    },
    [allSessions, effectiveActiveTabId, onSessionClose, onSessionSelect],
  );

  const handleNewTab = useCallback(async () => {
    if (isCreating) return;
    setIsCreating(true);

    const sessionName = `cc-term-${Date.now()}-${++sessionCounter}`;

    try {
      const created = await api.tmux.createSession(sessionName);
      const newSession: TerminalSession = {
        id: created.name,
        name: created.name,
        sessionId: created.name,
        wsUrl: `${WS_BASE_URL}/api/v1/tmux/sessions/${encodeURIComponent(created.name)}/terminal`,
      };
      setLocalSessions((prev) => [...prev, newSession]);
      setLocalActiveTabId(newSession.id);
      onSessionCreate();
      onSessionSelect(newSession.sessionId);
    } catch (err) {
      toast.error(
        `Failed to create terminal session: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, onSessionCreate, onSessionSelect]);

  return (
    <div data-testid="terminal-panel" className={cn('flex h-full flex-col bg-surface', className)}>
      <TerminalTabs
        tabs={tabs}
        activeTabId={effectiveActiveTabId ?? ''}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />
      <div className="flex-1 overflow-hidden">
        {activeSession ? (
          <TerminalInstance
            key={activeSession.sessionId}
            sessionId={activeSession.sessionId}
            wsUrl={activeSession.wsUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-secondary">No active terminal session</p>
          </div>
        )}
      </div>
    </div>
  );
}
