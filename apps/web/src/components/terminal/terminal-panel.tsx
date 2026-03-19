import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { TerminalTabs, type TerminalTab } from './terminal-tabs.js';
import { TerminalInstance } from './terminal-instance.js';
import { cn } from '../../lib/cn.js';

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

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function TerminalPanel({
  sessions,
  activeSessionId,
  onSessionSelect,
  onSessionClose,
  onSessionCreate,
  className,
}: TerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>(() =>
    sessions.map((s) => ({
      id: s.id,
      name: s.name,
      sessionId: s.sessionId,
      isActive: s.sessionId === activeSessionId,
    })),
  );

  const [localActiveTabId, setLocalActiveTabId] = useState<string | null>(
    sessions.find((s) => s.sessionId === activeSessionId)?.id ?? null,
  );

  const handleTabSelect = useCallback(
    (tabId: string) => {
      setLocalActiveTabId(tabId);
      const tab = tabs.find((t) => t.id === tabId);
      if (tab) {
        onSessionSelect(tab.sessionId);
      }
    },
    [tabs, onSessionSelect],
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      onSessionClose(tab.sessionId);
      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== tabId);
        if (localActiveTabId === tabId && newTabs.length > 0) {
          const closedIndex = prev.findIndex((t) => t.id === tabId);
          const newActiveIndex = Math.min(closedIndex, newTabs.length - 1);
          const newActiveTab = newTabs[newActiveIndex];
          if (newActiveTab) {
            setLocalActiveTabId(newActiveTab.id);
            onSessionSelect(newActiveTab.sessionId);
          }
        }
        return newTabs;
      });

      if (tabs.length === 1) {
        toast.info('Last terminal closed');
      }
    },
    [tabs, localActiveTabId, onSessionClose, onSessionSelect],
  );

  const handleNewTab = useCallback(() => {
    onSessionCreate();
    const newId = generateSessionId();
    const newTab: TerminalTab = {
      id: newId,
      name: `Terminal ${tabs.length + 1}`,
      sessionId: newId,
    };
    setTabs((prev) => [...prev, newTab]);
    setLocalActiveTabId(newId);
  }, [tabs.length, onSessionCreate]);

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId);

  return (
    <div data-testid="terminal-panel" className={cn('flex h-full flex-col bg-surface', className)}>
      <TerminalTabs
        tabs={tabs}
        activeTabId={localActiveTabId ?? ''}
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
