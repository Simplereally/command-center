import { useCallback, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router';
import {
  Plus,
  Play,
  Square,
  Terminal,
  LayoutDashboard,
  Settings,
  PanelLeftClose,
  Focus,
} from 'lucide-react';
import { useAgentStore } from '../../stores/agent-store.js';
import { useUiStore } from '../../stores/ui-store.js';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const selectedAgentId = useUiStore((s) => s.selectedAgentId);
  const openTerminalPanel = useUiStore((s) => s.openTerminalPanel);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);
  const selectAgent = useUiStore((s) => s.selectAgent);
  const startAgent = useAgentStore((s) => s.startAgent);
  const stopAgent = useAgentStore((s) => s.stopAgent);
  const getAgentById = useAgentStore((s) => s.getAgentById);

  const selectedAgent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;

  const handleSelect = useCallback(
    (action: () => void) => {
      return () => {
        action();
        onClose();
      };
    },
    [onClose],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        data-testid="command-palette-backdrop"
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        data-testid="command-palette"
        className="fixed left-1/2 top-1/3 z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-surface shadow-2xl"
      >
        <Command label="Command Palette">
          <Command.Input
            data-testid="command-palette-input"
            placeholder="Type a command..."
            className="w-full bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent border-b border-border"
          />
          <Command.List data-testid="command-palette-list">
            <Command.Empty
              data-testid="command-palette-empty"
              className="px-4 py-6 text-center text-sm text-text-tertiary"
            >
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Agents"
              data-testid="command-group-agents"
              className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
            >
              <CommandItem
                onSelect={handleSelect(() => useUiStore.getState().openCreateAgentDialog())}
                data-testid="cmd-new-agent"
              >
                <Plus className="h-4 w-4 text-text-tertiary" />
                <span>New Agent</span>
                <kbd className="ml-auto text-xs text-text-tertiary">⌘N</kbd>
              </CommandItem>

              {selectedAgent && (
                <>
                  <CommandItem
                    onSelect={handleSelect(() => startAgent(selectedAgent.id))}
                    data-testid="cmd-start-agent"
                  >
                    <Play className="h-4 w-4 text-text-tertiary" />
                    <span>Start Agent: {selectedAgent.name}</span>
                  </CommandItem>

                  <CommandItem
                    onSelect={handleSelect(() => stopAgent(selectedAgent.id))}
                    data-testid="cmd-stop-agent"
                  >
                    <Square className="h-4 w-4 text-text-tertiary" />
                    <span>Stop Agent: {selectedAgent.name}</span>
                  </CommandItem>

                  <CommandItem
                    onSelect={handleSelect(() => openTerminalPanel(selectedAgent.id))}
                    data-testid="cmd-open-terminal"
                  >
                    <Terminal className="h-4 w-4 text-text-tertiary" />
                    <span>Open Terminal: {selectedAgent.name}</span>
                  </CommandItem>
                </>
              )}
            </Command.Group>

            <Command.Group
              heading="Navigation"
              data-testid="command-group-navigation"
              className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
            >
              <CommandItem
                onSelect={handleSelect(() => navigate('/'))}
                data-testid="cmd-go-to-board"
              >
                <LayoutDashboard className="h-4 w-4 text-text-tertiary" />
                <span>Go to Board</span>
              </CommandItem>

              <CommandItem
                onSelect={handleSelect(() => navigate('/settings'))}
                data-testid="cmd-go-to-settings"
              >
                <Settings className="h-4 w-4 text-text-tertiary" />
                <span>Go to Settings</span>
              </CommandItem>
            </Command.Group>

            <Command.Group
              heading="Actions"
              data-testid="command-group-actions"
              className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
            >
              <CommandItem onSelect={handleSelect(closeSidePanel)} data-testid="cmd-toggle-sidebar">
                <PanelLeftClose className="h-4 w-4 text-text-tertiary" />
                <span>Toggle Sidebar</span>
              </CommandItem>

              <CommandItem
                onSelect={handleSelect(() => selectAgent(null))}
                data-testid="cmd-focus-board"
              >
                <Focus className="h-4 w-4 text-text-tertiary" />
                <span>Focus Board</span>
              </CommandItem>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </>
  );
}

function CommandItem({
  children,
  onSelect,
  ...props
}: {
  children: React.ReactNode;
  onSelect: () => void;
  'data-testid'?: string;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-4 py-2 text-sm text-text-primary cursor-pointer data-[selected=true]:bg-surface-hover"
      {...props}
    >
      {children}
    </Command.Item>
  );
}
