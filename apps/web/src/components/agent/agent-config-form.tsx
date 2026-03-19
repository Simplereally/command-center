import { useState, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { Pencil, Save, X, Loader2 } from 'lucide-react';
import type { AgentResponse, UpdateAgent } from '@command-center/shared';
import { toast } from 'sonner';
import { cn } from '../../lib/cn.js';

interface AgentConfigFormProps {
  agent: AgentResponse;
  onSave: (data: UpdateAgent) => Promise<void>;
}

const inputClasses =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const readOnlyClasses =
  'w-full rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm text-text-primary';

function envVarsToString(envVars: Record<string, string> | null): string {
  if (!envVars) return '';
  return Object.entries(envVars)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

function stringToEnvVars(str: string): Record<string, string> | undefined {
  const trimmed = str.trim();
  if (!trimmed) return undefined;
  const result: Record<string, string> = {};
  for (const line of trimmed.split('\n')) {
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function AgentConfigForm({ agent, onSave }: AgentConfigFormProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(agent.name);
  const [workingDir, setWorkingDir] = useState(agent.workingDir ?? '');
  const [envVarsText, setEnvVarsText] = useState(envVarsToString(agent.envVars));

  const resetForm = useCallback(() => {
    setName(agent.name);
    setWorkingDir(agent.workingDir ?? '');
    setEnvVarsText(envVarsToString(agent.envVars));
  }, [agent]);

  const handleEdit = useCallback(() => {
    resetForm();
    setEditing(true);
  }, [resetForm]);

  const handleCancel = useCallback(() => {
    resetForm();
    setEditing(false);
  }, [resetForm]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        toast.error('Name is required');
        return;
      }

      setLoading(true);
      try {
        const data: UpdateAgent = {
          name: name.trim(),
          ...(workingDir.trim() ? { workingDir: workingDir.trim() } : {}),
          ...(() => {
            const parsed = stringToEnvVars(envVarsText);
            return parsed ? { envVars: parsed } : {};
          })(),
        };
        await onSave(data);
        toast.success('Agent configuration updated');
        setEditing(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update configuration');
      } finally {
        setLoading(false);
      }
    },
    [name, workingDir, envVarsText, onSave],
  );

  return (
    <div data-testid="agent-config-form">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-secondary">Configuration</h3>
        {!editing && (
          <button
            type="button"
            onClick={handleEdit}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
            aria-label="Edit configuration"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="config-name" className="mb-1 block text-xs font-medium text-text-tertiary uppercase tracking-wide">
                Name
              </label>
              <input
                id="config-name"
                type="text"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className={inputClasses}
                placeholder="Agent name"
              />
            </div>

            <div>
              <label htmlFor="config-working-dir" className="mb-1 block text-xs font-medium text-text-tertiary uppercase tracking-wide">
                Working Directory
              </label>
              <input
                id="config-working-dir"
                type="text"
                value={workingDir}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setWorkingDir(e.target.value)}
                className={inputClasses}
                placeholder="/path/to/project"
              />
            </div>

            <div>
              <label htmlFor="config-env-vars" className="mb-1 block text-xs font-medium text-text-tertiary uppercase tracking-wide">
                Environment Variables
              </label>
              <textarea
                id="config-env-vars"
                value={envVarsText}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEnvVarsText(e.target.value)}
                className={cn(inputClasses, 'min-h-[80px] font-mono text-xs')}
                placeholder="KEY=value&#10;ANOTHER_KEY=value"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <div>
            <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Name</dt>
            <dd className={readOnlyClasses}>{agent.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Working Directory</dt>
            <dd className={readOnlyClasses}>
              {agent.workingDir ?? <span className="text-text-tertiary">Not set</span>}
            </dd>
          </div>
          {agent.envVars && Object.keys(agent.envVars).length > 0 && (
            <div>
              <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wide">Environment Variables</dt>
              <dd className={cn(readOnlyClasses, 'font-mono text-xs whitespace-pre-wrap')}>
                {envVarsToString(agent.envVars)}
              </dd>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
