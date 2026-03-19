import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import { TopBar } from './top-bar.js';
import { StatusBar } from './status-bar.js';
import { SidePanel } from './side-panel.js';
import { CommandPalette } from '../command/command-palette.js';
import { ErrorBoundary } from '../error-boundary/index.js';
import { useUiStore } from '../../stores/ui-store.js';
import { useAgentStore } from '../../stores/agent-store.js';
import { AgentDetail } from '../agent/agent-detail.js';
import { TerminalPanel } from '../terminal/terminal-panel.js';
import { cn } from '../../lib/cn.js';
import { useKeyboardShortcuts } from '../../hooks/use-keyboard-shortcuts.js';

const WS_BASE_URL = 'ws://localhost:4000';

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
  const agents = useAgentStore((s) => s.agents);
  const selectedAgent = selectedAgentId ? agents.get(selectedAgentId) : null;

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
                      sessions={
                        selectedAgent.tmuxSession
                          ? [
                              {
                                id: selectedAgent.id,
                                name: selectedAgent.tmuxSession,
                                sessionId: selectedAgent.tmuxSession,
                                wsUrl: `${WS_BASE_URL}/api/v1/tmux/sessions/${selectedAgent.tmuxSession}/terminal`,
                              },
                            ]
                          : []
                      }
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
        <CommandPalette open={commandPaletteOpen} onClose={closeCommandPalette} />
      </div>
    </ErrorBoundary>
  );
}
