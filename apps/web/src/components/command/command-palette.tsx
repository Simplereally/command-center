import { useCallback, useEffect, useMemo } from 'react';
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
  Bot,
  RotateCcw,
  FileText,
  Layers,
} from 'lucide-react';
import { useAgentStore } from '../../stores/agent-store.js';
import { useBoardStore } from '../../stores/board-store.js';
import { useUiStore } from '../../stores/ui-store.js';
import { pushModal, popModal, topModal } from '../../lib/modal-stack.js';

const STATUS_LABELS: Record<string, string> = {
  idle: 'Idle',
  starting: 'Starting',
  running: 'Running',
  paused: 'Paused',
  stopping: 'Stopping',
  stopped: 'Stopped',
  error: 'Error',
  completed: 'Done',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-[var(--color-status-idle)]',
  starting: 'bg-[var(--color-status-starting)]',
  running: 'bg-[var(--color-status-running)]',
  paused: 'bg-[var(--color-status-paused)]',
  stopping: 'bg-[var(--color-status-stopping)]',
  stopped: 'bg-[var(--color-status-idle)]',
  error: 'bg-[var(--color-status-error)]',
  completed: 'bg-[var(--color-status-completed)]',
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-[var(--color-status-idle)]';
}

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
  const openDetailPanel = useUiStore((s) => s.openDetailPanel);
  const startAgent = useAgentStore((s) => s.startAgent);
  const stopAgent = useAgentStore((s) => s.stopAgent);
  const restartAgent = useAgentStore((s) => s.restartAgent);
  const getAgentById = useAgentStore((s) => s.getAgentById);
  const agents = useAgentStore((s) => s.agents);
  const boards = useBoardStore((s) => s.boards);

  const selectedAgent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;

  const allAgents = useMemo(() => Array.from(agents.values()), [agents]);

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
    if (open) {
      pushModal('commandPalette');
    }
    return () => {
      if (topModal() === 'commandPalette') {
        popModal();
      }
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        if (topModal() === 'commandPalette') {
          e.stopImmediatePropagation();
          onClose();
        }
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
        className="fixed left-1/2 top-1/3 z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
      >
        <Command label="Command Palette">
          <Command.Input
            data-testid="command-palette-input"
            placeholder="Type a command..."
            className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <Command.List
            data-testid="command-palette-list"
            className="max-h-80 overflow-y-auto scroll-smooth py-2 transition-[max-height] duration-200"
          >
            <Command.Empty
              data-testid="command-palette-empty"
              className="px-4 py-6 text-center text-sm text-text-tertiary"
            >
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Agents"
              data-testid="command-group-agents"
              className={groupClassName}
            >
              <CommandItem
                onSelect={handleSelect(() => useUiStore.getState().openCreateAgentDialog())}
                data-testid="cmd-new-agent"
                shortcut="⌘N"
              >
                <Plus className="h-4 w-4 shrink-0 text-text-tertiary" />
                <span className="flex-1">New Agent</span>
              </CommandItem>

              {selectedAgent && (
                <>
                  <CommandItem
                    onSelect={handleSelect(() => startAgent(selectedAgent.id))}
                    data-testid="cmd-start-agent"
                  >
                    <Play className="h-4 w-4 shrink-0 text-text-tertiary" />
                    <span className="flex-1">Start Agent: {selectedAgent.name}</span>
                  </CommandItem>

                  <CommandItem
                    onSelect={handleSelect(() => stopAgent(selectedAgent.id))}
                    data-testid="cmd-stop-agent"
                  >
                    <Square className="h-4 w-4 shrink-0 text-text-tertiary" />
                    <span className="flex-1">Stop Agent: {selectedAgent.name}</span>
                  </CommandItem>

                  <CommandItem
                    onSelect={handleSelect(() => openTerminalPanel(selectedAgent.id))}
                    data-testid="cmd-open-terminal"
                  >
                    <Terminal className="h-4 w-4 shrink-0 text-text-tertiary" />
                    <span className="flex-1">Open Terminal: {selectedAgent.name}</span>
                  </CommandItem>
                </>
              )}
            </Command.Group>

            {allAgents.length > 0 && (
              <Command.Group
                heading="All Agents"
                data-testid="command-group-all-agents"
                className={groupClassName}
              >
                {allAgents.map((agent) => (
                  <CommandItem
                    key={`agent-${agent.id}`}
                    data-testid={`cmd-agent-${agent.id}`}
                    onSelect={handleSelect(() => {
                      selectAgent(agent.id);
                      openDetailPanel(agent.id);
                    })}
                  >
                    <Bot className="h-4 w-4 shrink-0 text-text-tertiary" />
                    <span className="flex-1 truncate">{agent.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${statusColor(agent.status)}`}
                    >
                      {statusLabel(agent.status)}
                    </span>
                    {agent.model && (
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-tertiary">
                        {agent.model}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </Command.Group>
            )}

            {allAgents.length > 0 && (
              <Command.Group
                heading="Quick Actions"
                data-testid="command-group-quick-actions"
                className={groupClassName}
              >
                {allAgents.map((agent) => (
                  <AgentQuickActions
                    key={`quick-${agent.id}`}
                    agentId={agent.id}
                    agentName={agent.name}
                    onStop={handleSelect(() => stopAgent(agent.id))}
                    onRestart={handleSelect(() => restartAgent(agent.id))}
                    onTerminal={handleSelect(() => openTerminalPanel(agent.id))}
                    onLogs={handleSelect(() => {
                      selectAgent(agent.id);
                      openDetailPanel(agent.id);
                    })}
                  />
                ))}
              </Command.Group>
            )}

            {boards.length > 0 && (
              <Command.Group
                heading="Boards"
                data-testid="command-group-boards"
                className={groupClassName}
              >
                {boards.map((board) => (
                  <CommandItem
                    key={`board-${board.id}`}
                    data-testid={`cmd-board-${board.id}`}
                    onSelect={handleSelect(() => navigate(`/boards/${board.id}`))}
                  >
                    <Layers className="h-4 w-4 shrink-0 text-text-tertiary" />
                    <span className="flex-1">{board.name}</span>
                  </CommandItem>
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading="Navigation"
              data-testid="command-group-navigation"
              className={groupClassName}
            >
              <CommandItem
                onSelect={handleSelect(() => navigate('/'))}
                data-testid="cmd-go-to-board"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0 text-text-tertiary" />
                <span className="flex-1">Go to Board</span>
              </CommandItem>

              <CommandItem
                onSelect={handleSelect(() => navigate('/settings'))}
                data-testid="cmd-go-to-settings"
                shortcut="⌘,"
              >
                <Settings className="h-4 w-4 shrink-0 text-text-tertiary" />
                <span className="flex-1">Go to Settings</span>
              </CommandItem>
            </Command.Group>

            <Command.Group
              heading="Actions"
              data-testid="command-group-actions"
              className={groupClassName}
            >
              <CommandItem onSelect={handleSelect(closeSidePanel)} data-testid="cmd-toggle-sidebar">
                <PanelLeftClose className="h-4 w-4 shrink-0 text-text-tertiary" />
                <span className="flex-1">Toggle Sidebar</span>
              </CommandItem>

              <CommandItem
                onSelect={handleSelect(() => selectAgent(null))}
                data-testid="cmd-focus-board"
              >
                <Focus className="h-4 w-4 shrink-0 text-text-tertiary" />
                <span className="flex-1">Focus Board</span>
              </CommandItem>
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-center gap-4 border-t border-border px-4 py-2 text-[11px] text-text-tertiary">
            <span>↑↓ Navigate</span>
            <span>•</span>
            <span>Enter Select</span>
            <span>•</span>
            <span>Esc Close</span>
          </div>
        </Command>
      </div>
    </>
  );
}

const groupClassName =
  'mt-2 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide';

function CommandItem({
  children,
  onSelect,
  shortcut,
  ...props
}: {
  children: React.ReactNode;
  onSelect: () => void;
  shortcut?: string;
  'data-testid'?: string;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-primary data-[selected=true]:bg-accent-muted data-[selected=true]:text-text-primary"
      {...props}
    >
      {children}
      {shortcut && (
        <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}

function AgentQuickActions({
  agentId,
  agentName,
  onStop,
  onRestart,
  onTerminal,
  onLogs,
}: {
  agentId: string;
  agentName: string;
  onStop: () => void;
  onRestart: () => void;
  onTerminal: () => void;
  onLogs: () => void;
}) {
  return (
    <>
      <CommandItem
        data-testid={`cmd-stop-${agentId}`}
        onSelect={onStop}
      >
        <Square className="h-4 w-4 shrink-0 text-text-tertiary" />
        <span className="flex-1">Stop {agentName}</span>
      </CommandItem>
      <CommandItem
        data-testid={`cmd-restart-${agentId}`}
        onSelect={onRestart}
      >
        <RotateCcw className="h-4 w-4 shrink-0 text-text-tertiary" />
        <span className="flex-1">Restart {agentName}</span>
      </CommandItem>
      <CommandItem
        data-testid={`cmd-terminal-${agentId}`}
        onSelect={onTerminal}
      >
        <Terminal className="h-4 w-4 shrink-0 text-text-tertiary" />
        <span className="flex-1">Open Terminal for {agentName}</span>
      </CommandItem>
      <CommandItem
        data-testid={`cmd-logs-${agentId}`}
        onSelect={onLogs}
      >
        <FileText className="h-4 w-4 shrink-0 text-text-tertiary" />
        <span className="flex-1">View Logs for {agentName}</span>
      </CommandItem>
    </>
  );
}
