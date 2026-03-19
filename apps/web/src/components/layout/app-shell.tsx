import type { ReactNode } from 'react';
import { TopBar } from './top-bar.js';
import { StatusBar } from './status-bar.js';
import { SidePanel } from './side-panel.js';
import { CommandPalette } from '../command/command-palette.js';
import { ErrorBoundary } from '../error-boundary/index.js';
import { useUiStore } from '../../stores/ui-store.js';
import { cn } from '../../lib/cn.js';
import { useKeyboardShortcuts } from '../../hooks/use-keyboard-shortcuts.js';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useKeyboardShortcuts();

  const sidePanelMode = useUiStore((s) => s.sidePanelMode);
  const sidePanelWidth = useUiStore((s) => s.sidePanelWidth);
  const showPanel = sidePanelMode !== 'closed';
  const commandPaletteOpen = useUiStore((s) => s.commandPaletteOpen);
  const closeCommandPalette = useUiStore((s) => s.closeCommandPalette);

  return (
    <ErrorBoundary>
      <div data-testid="app-shell" className="flex h-screen flex-col bg-background">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
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
        </div>
        <StatusBar />
        <CommandPalette open={commandPaletteOpen} onClose={closeCommandPalette} />
      </div>
    </ErrorBoundary>
  );
}
