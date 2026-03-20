import { type ReactNode, lazy, Suspense, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import { TopBar } from './top-bar.js';
import { StatusBar } from './status-bar.js';
import { SidePanel } from './side-panel.js';
import { ErrorBoundary } from '../error-boundary/index.js';
import { useUiStore } from '../../stores/ui-store.js';
import { useAgentStore } from '../../stores/agent-store.js';
import { AgentDetail } from '../agent/agent-detail.js';
import { TerminalPanel } from '../terminal/terminal-panel.js';
import { cn } from '../../lib/cn.js';
import { useKeyboardShortcuts } from '../../hooks/use-keyboard-shortcuts.js';
import { WS_BASE_URL } from '../../lib/constants.js';

const LazyCommandPalette = lazy(() =>
  import('../command/command-palette.js').then((m) => ({ default: m.CommandPalette })),
);

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useKeyboardShortcuts();

  const viewMode = useUiStore((s) => s.viewMode);
  const sidePanelMode = useUiStore((s) => s.sidePanelMode);
  const sidePanelWidth = useUiStore((s) => s.sidePanelWidth);
  const showPanel = sidePanelMode !== 'closed';
  const commandPaletteOpen = useUiStore((s) => s.commandPaletteOpen);
  const closeCommandPalette = useUiStore((s) => s.closeCommandPalette);
  const selectedAgentId = useUiStore((s) => s.selectedAgentId);
  const selectedAgent = useAgentStore((s) =>
    selectedAgentId ? s.agents.get(selectedAgentId) ?? null : null,
  );

  const focusSessions = useMemo(() => {
    if (!selectedAgent?.tmuxSession) return [];
    return [
      {
        id: selectedAgent.id,
        name: selectedAgent.tmuxSession,
        sessionId: selectedAgent.tmuxSession,
        wsUrl: `${WS_BASE_URL}/api/v1/tmux/sessions/${encodeURIComponent(selectedAgent.tmuxSession)}/terminal`,
      },
    ];
  }, [selectedAgent?.id, selectedAgent?.tmuxSession]);

  return (
    <ErrorBoundary>
      <div data-testid="app-shell" className="flex h-screen flex-col bg-background">
        <TopBar />
        <AnimatePresence mode="wait">
          {viewMode === 'board' && (
            <motion.div
              key="board"
              className="flex flex-1 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <main className={cn('flex-1 overflow-auto', showPanel && 'border-r border-border')}>
                {children}
              </main>
              {showPanel && (
                <aside
                  className="flex-shrink-0 overflow-hidden"
                  style={{ width: `${sidePanelWidth}rem` }}
                >
                  <SidePanel />
                </aside>
              )}
            </motion.div>
          )}

          {viewMode === 'terminal' && (
            <motion.div
              key="terminal"
              data-testid="terminal-fullscreen"
              className="flex flex-1 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex-1 overflow-hidden">
                <SidePanel />
              </div>
            </motion.div>
          )}

          {viewMode === 'focus' && (
            <motion.div
              key="focus"
              data-testid="focus-view"
              className="flex flex-1 flex-col overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {selectedAgent ? (
                <>
                  <div className="flex-1 overflow-auto border-b border-border">
                    <AgentDetail agent={selectedAgent} />
                  </div>
                  <div className="h-1/2 overflow-hidden">
                    <TerminalPanel
                      sessions={focusSessions}
                      activeSessionId={selectedAgent.tmuxSession ?? null}
                      onSessionSelect={() => {}}
                      onSessionClose={() => {}}
                      onSessionCreate={() => {}}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-text-secondary">
                  <Maximize2 className="h-10 w-10 text-text-tertiary" />
                  <p className="text-sm">Select an agent to enter focus mode</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <StatusBar />
        {commandPaletteOpen && (
          <Suspense fallback={null}>
            <LazyCommandPalette open={commandPaletteOpen} onClose={closeCommandPalette} />
          </Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
}
