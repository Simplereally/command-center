import { useState, useCallback, useEffect, useRef, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useAgentStore } from '../../stores/agent-store.js';
import { cn } from '../../lib/cn.js';

interface AgentCreateDialogProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  swimlaneId: string;
}

const inputClasses =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function AgentCreateDialog({ open, onClose, boardId, swimlaneId }: AgentCreateDialogProps) {
  const { createAgent } = useAgentStore();
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const [command, setCommand] = useState('');
  const [envVarsText, setEnvVarsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setModel('');
      setWorkingDir('');
      setCommand('');
      setEnvVarsText('');
      setError(null);
      setLoading(false);
      requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        setError('Name is required');
        return;
      }

      setLoading(true);
      setError(null);

      const envVars: Record<string, string> = {};
      if (envVarsText.trim()) {
        for (const line of envVarsText.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            envVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
          }
        }
      }

      try {
        await createAgent({
          name: name.trim(),
          boardId,
          swimlaneId,
          ...(model.trim() && { model: model.trim() }),
          ...(workingDir.trim() && { workingDir: workingDir.trim() }),
          ...(command.trim() && { command: command.trim() }),
          ...(Object.keys(envVars).length > 0 && { envVars }),
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create agent');
      } finally {
        setLoading(false);
      }
    },
    [name, model, workingDir, command, envVarsText, boardId, swimlaneId, createAgent, onClose],
  );

  if (!open) return null;

  return (
    <div
      data-testid="agent-create-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        data-testid="agent-create-dialog"
        className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-create-dialog-title"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="agent-create-dialog-title" className="text-lg font-semibold text-text-primary">
            Create New Agent
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 p-6">
            <div>
              <label htmlFor="agent-name" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Name <span className="text-status-error">*</span>
              </label>
              <input
                ref={nameInputRef}
                id="agent-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClasses}
                placeholder="My Agent"
                required
              />
            </div>

            <div>
              <label htmlFor="agent-model" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Model
              </label>
              <input
                id="agent-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={inputClasses}
                placeholder="claude-4-opus"
              />
            </div>

            <div>
              <label htmlFor="agent-working-dir" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Working Directory
              </label>
              <input
                id="agent-working-dir"
                type="text"
                value={workingDir}
                onChange={(e) => setWorkingDir(e.target.value)}
                className={inputClasses}
                placeholder="/path/to/project"
              />
            </div>

            <div>
              <label htmlFor="agent-command" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Command
              </label>
              <input
                id="agent-command"
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className={inputClasses}
                placeholder="npm run dev"
              />
            </div>

            <div>
              <label htmlFor="agent-env-vars" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Environment Variables
              </label>
              <textarea
                id="agent-env-vars"
                value={envVarsText}
                onChange={(e) => setEnvVarsText(e.target.value)}
                className={cn(inputClasses, 'min-h-[80px] resize-y')}
                placeholder="KEY=VALUE (one per line)"
                rows={3}
              />
            </div>

            {error && (
              <p data-testid="agent-create-dialog-error" className="text-sm text-status-error">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'rounded-lg px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
