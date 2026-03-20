import { type ReactNode, lazy, Suspense, useMemo, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Terminal } from 'lucide-react';
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

const FOCUS_TERMINAL_MIN_HEIGHT = 120;
const FOCUS_TERMINAL_DEFAULT_RATIO = 0.45;

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

  const [focusTerminalRatio, setFocusTerminalRatio] = useState(FOCUS_TERMINAL_DEFAULT_RATIO);
  const focusContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const onMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingRef.current || !focusContainerRef.current) return;
      const rect = focusContainerRef.current.getBoundingClientRect();
      const y = moveEvt.clientY - rect.top;
      const ratio = 1 - y / rect.height;
      const clampedRatio = Math.max(
        FOCUS_TERMINAL_MIN_HEIGHT / rect.height,
        Math.min(ratio, 1 - FOCUS_TERMINAL_MIN_HEIGHT / rect.height),
      );
      setFocusTerminalRatio(clampedRatio);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

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
              ref={focusContainerRef}
              className="flex flex-1 flex-col overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {selectedAgent ? (
                <>
                  <div
                    className="overflow-auto"
                    style={{ height: `${(1 - focusTerminalRatio) * 100}%` }}
                  >
                    <AgentDetail agent={selectedAgent} />
                  </div>
                  <div
                    className="group relative flex h-1 flex-shrink-0 cursor-row-resize items-center justify-center bg-border transition-colors hover:bg-accent/50"
                    onMouseDown={handleDividerMouseDown}
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label="Resize terminal"
                    data-testid="focus-divider"
                  >
                    <div className="absolute h-3 w-full" />
                    <div className="h-0.5 w-8 rounded-full bg-text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div
                    className="overflow-hidden"
                    style={{ height: `${focusTerminalRatio * 100}%` }}
                  >
                    {selectedAgent.tmuxSession ? (
                      <TerminalPanel
                        sessions={focusSessions}
                        activeSessionId={selectedAgent.tmuxSession}
                        onSessionSelect={() => {}}
                        onSessionClose={() => {}}
                        onSessionCreate={() => {}}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface p-6">
                        <Terminal className="h-8 w-8 text-text-tertiary" />
                        <div className="text-center">
                          <p className="text-sm font-medium text-text-primary">No terminal session</p>
                          <p className="mt-1 text-xs text-text-secondary">
                            Start the agent to open a terminal connection
                          </p>
                        </div>
                      </div>
                    )}
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
