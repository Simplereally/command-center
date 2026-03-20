import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { useUiStore } from '../../stores/ui-store.js';
import { useAgentStore } from '../../stores/agent-store.js';
import { AgentDetail } from '../agent/agent-detail.js';
import { TerminalPanel } from '../terminal/terminal-panel.js';
import type { TerminalSession } from '../terminal/terminal-panel.js';
import { ErrorBoundary } from '../error-boundary/index.js';
import { WS_BASE_URL } from '../../lib/constants.js';
import { api } from '../../lib/api-client.js';

export function SidePanel() {
  const sidePanelMode = useUiStore((s) => s.sidePanelMode);
  const selectedAgentId = useUiStore((s) => s.selectedAgentId);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);
  const selectedAgent = useAgentStore((s) =>
    selectedAgentId ? s.agents.get(selectedAgentId) ?? null : null,
  );
  const prefersReducedMotion = useReducedMotion();

  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isCreatingAgentSession, setIsCreatingAgentSession] = useState(false);
  const creatingSessionRef = useRef(false);
  const lastCreatedAgentRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      sidePanelMode !== 'terminal' ||
      !selectedAgent ||
      selectedAgent.tmuxSession ||
      creatingSessionRef.current ||
      lastCreatedAgentRef.current === selectedAgent.id
    ) {
      return;
    }

    creatingSessionRef.current = true;
    setIsCreatingAgentSession(true);
    const sessionName = `cc-agent-${selectedAgent.id}`;

    api.tmux.createSession(sessionName).then((created) => {
      lastCreatedAgentRef.current = selectedAgent.id;
      const newSession: TerminalSession = {
        id: selectedAgent.id,
        name: created.name,
        sessionId: created.name,
        wsUrl: `${WS_BASE_URL}/api/v1/tmux/sessions/${encodeURIComponent(created.name)}/terminal`,
      };
      setTerminalSessions((prev) => {
        if (prev.some((s) => s.id === selectedAgent.id)) return prev;
        return [newSession, ...prev];
      });
      setActiveSessionId(created.name);
    }).catch((err: unknown) => {
      toast.error(
        `Failed to create terminal for agent: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }).finally(() => {
      creatingSessionRef.current = false;
      setIsCreatingAgentSession(false);
    });
  }, [sidePanelMode, selectedAgent]);

  const sessions = useMemo<TerminalSession[]>(() => {
    if (!selectedAgent?.tmuxSession) return terminalSessions;
    const agentSession: TerminalSession = {
      id: selectedAgent.id,
      name: selectedAgent.tmuxSession,
      sessionId: selectedAgent.tmuxSession,
      wsUrl: `${WS_BASE_URL}/api/v1/tmux/sessions/${encodeURIComponent(selectedAgent.tmuxSession)}/terminal`,
    };
    const hasAgent = terminalSessions.some((s) => s.id === selectedAgent.id);
    return hasAgent ? terminalSessions : [agentSession, ...terminalSessions];
  }, [selectedAgent, terminalSessions]);

  const effectiveActiveSessionId = activeSessionId ?? sessions[0]?.sessionId ?? null;

  const handleSessionSelect = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const handleSessionClose = useCallback((sessionId: string) => {
    setTerminalSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    setActiveSessionId((prev) => (prev === sessionId ? null : prev));
  }, []);

  const handleSessionCreate = useCallback(() => {
    // handled internally by TerminalPanel
  }, []);

  if (sidePanelMode === 'closed') {
    return null;
  }

  const panelVariants = {
    hidden: { opacity: 0, x: prefersReducedMotion ? 0 : 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: prefersReducedMotion ? 0 : 20 },
  };

  return (
    <motion.aside
      key={sidePanelMode}
      data-testid="side-panel"
      role="complementary"
      className="flex h-full flex-col bg-surface"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={panelVariants}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex h-10 flex-shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-sm font-medium text-text-primary">
          {sidePanelMode === 'detail' ? 'Agent Detail' : 'Terminal'}
        </span>
        <button
          type="button"
          onClick={closeSidePanel}
          className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {sidePanelMode === 'detail' && selectedAgent && (
          <div className="h-full overflow-y-auto">
            <ErrorBoundary>
              <AgentDetail agent={selectedAgent} />
            </ErrorBoundary>
          </div>
        )}
        {sidePanelMode === 'terminal' && selectedAgentId && !isCreatingAgentSession && (
          <ErrorBoundary>
            <TerminalPanel
              sessions={sessions}
              activeSessionId={effectiveActiveSessionId}
              onSessionSelect={handleSessionSelect}
              onSessionClose={handleSessionClose}
              onSessionCreate={handleSessionCreate}
            />
          </ErrorBoundary>
        )}
        {sidePanelMode === 'terminal' && selectedAgentId && isCreatingAgentSession && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
            <Terminal className="h-8 w-8 animate-pulse text-accent" />
            <p className="text-sm text-text-secondary">Starting terminal session...</p>
          </div>
        )}
        {sidePanelMode === 'terminal' && !selectedAgentId && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
            <Terminal className="h-10 w-10 text-text-tertiary" />
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">No agent selected</p>
              <p className="mt-1 text-xs text-text-secondary">
                Select an agent from the board to open its terminal
              </p>
            </div>
          </div>
        )}
        {sidePanelMode === 'detail' && !selectedAgent && (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-sm text-text-secondary">Select an agent to view details</p>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
