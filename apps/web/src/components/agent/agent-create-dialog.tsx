import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import {
  X,
  ArrowLeft,
  Terminal,
  Code,
  GitBranch,
  Settings,
  ExternalLink,
  ChevronDown,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import {
  PROVIDERS,
  type AgentProvider,
  type AuthMethod,
} from '@command-center/shared';
import { useAgentStore } from '../../stores/agent-store.js';
import { pushModal, popModal, topModal } from '../../lib/modal-stack.js';
import { cn } from '../../lib/cn.js';

interface AgentCreateDialogProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  swimlaneId: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Terminal,
  Code,
  GitBranch,
  Settings,
};

const inputClasses =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function generateDefaultName(provider: AgentProvider): string {
  const now = new Date();
  const ts = [
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');
  return `${provider.name} ${ts}`;
}

function AuthMethodDisplay({ method }: { method: AuthMethod }) {
  return (
    <div className="flex items-center gap-2 text-xs text-text-tertiary">
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          method.type === 'api_key'
            ? 'bg-amber-400'
            : method.type === 'oauth'
              ? 'bg-blue-400'
              : 'bg-emerald-400',
        )}
      />
      <span>{method.description}</span>
      {method.setupUrl && (
        <a
          href={method.setupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-accent hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

export function AgentCreateDialog({
  open,
  onClose,
  boardId,
  swimlaneId,
}: AgentCreateDialogProps) {
  const { createAgent } = useAgentStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedProvider, setSelectedProvider] =
    useState<AgentProvider | null>(null);

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
      setStep(1);
      setSelectedProvider(null);
      setName('');
      setModel('');
      setWorkingDir('');
      setCommand('');
      setEnvVarsText('');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      pushModal('createAgentDialog');
    }
    return () => {
      if (topModal() === 'createAgentDialog') {
        popModal();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (topModal() === 'createAgentDialog') {
          e.stopImmediatePropagation();
          onClose();
        }
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

  const handleSelectProvider = useCallback(
    (provider: AgentProvider) => {
      setSelectedProvider(provider);
      setName(generateDefaultName(provider));
      setCommand(provider.defaultCommand);
      setModel(
        provider.models.length > 0 ? provider.models[0]!.id : '',
      );

      const envLines: string[] = [];
      for (const [key, value] of Object.entries(
        provider.defaultEnvVars,
      )) {
        envLines.push(`${key}=${value}`);
      }
      setEnvVarsText(envLines.join('\n'));

      setError(null);
      setStep(2);

      requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
    },
    [],
  );

  const handleBack = useCallback(() => {
    setStep(1);
    setError(null);
  }, []);

  const handleApiKeyChange = useCallback(
    (envVar: string, value: string) => {
      setEnvVarsText((prev) => {
        const lines = prev.split('\n').filter((l) => {
          const eqIdx = l.indexOf('=');
          return eqIdx > 0
            ? l.slice(0, eqIdx).trim() !== envVar
            : true;
        });
        if (value.trim()) {
          lines.push(`${envVar}=${value.trim()}`);
        }
        return lines.filter((l) => l.trim()).join('\n');
      });
    },
    [],
  );

  const getApiKeyValue = useCallback(
    (envVar: string): string => {
      for (const line of envVarsText.split('\n')) {
        const eqIdx = line.indexOf('=');
        if (
          eqIdx > 0 &&
          line.slice(0, eqIdx).trim() === envVar
        ) {
          return line.slice(eqIdx + 1).trim();
        }
      }
      return '';
    },
    [envVarsText],
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
            envVars[trimmed.slice(0, eqIdx).trim()] = trimmed
              .slice(eqIdx + 1)
              .trim();
          }
        }
      }

      try {
        await createAgent({
          name: name.trim(),
          boardId,
          swimlaneId,
          ...(model.trim() && { model: model.trim() }),
          ...(workingDir.trim() && {
            workingDir: workingDir.trim(),
          }),
          ...(command.trim() && { command: command.trim() }),
          ...(Object.keys(envVars).length > 0 && { envVars }),
        });
        onClose();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to create agent',
        );
      } finally {
        setLoading(false);
      }
    },
    [
      name,
      model,
      workingDir,
      command,
      envVarsText,
      boardId,
      swimlaneId,
      createAgent,
      onClose,
    ],
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
        className={cn(
          'w-full rounded-2xl border border-border bg-surface shadow-xl',
          step === 1 ? 'max-w-lg' : 'max-w-md',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-create-dialog-title"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2
              id="agent-create-dialog-title"
              className="text-lg font-semibold text-text-primary"
            >
              {step === 1
                ? 'Choose Provider'
                : `New ${selectedProvider?.name ?? ''} Agent`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 1 ? (
          <div className="p-6">
            <div
              data-testid="provider-grid"
              className="grid grid-cols-2 gap-3"
            >
              {PROVIDERS.map((provider) => {
                const IconComponent =
                  ICON_MAP[provider.icon] ?? Settings;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    data-testid={`provider-card-${provider.id}`}
                    onClick={() =>
                      handleSelectProvider(provider)
                    }
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-xl border border-border bg-background p-4 text-left transition-all',
                      'hover:border-accent hover:bg-surface-hover hover:shadow-md',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted">
                        <IconComponent className="h-4 w-4 text-accent" />
                      </div>
                      <span className="text-sm font-semibold text-text-primary">
                        {provider.name}
                      </span>
                    </div>
                    <p className="text-xs text-text-tertiary leading-relaxed">
                      {provider.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-4 p-6">
              <div>
                <label
                  htmlFor="agent-name"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Name{' '}
                  <span className="text-status-error">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="agent-name"
                  type="text"
                  value={name}
                  onChange={(
                    e: ChangeEvent<HTMLInputElement>,
                  ) => setName(e.target.value)}
                  className={inputClasses}
                  placeholder="My Agent"
                  required
                />
              </div>

              {selectedProvider &&
              selectedProvider.models.length > 0 ? (
                <div>
                  <label
                    htmlFor="agent-model"
                    className="mb-1.5 block text-sm font-medium text-text-secondary"
                  >
                    Model
                  </label>
                  <div className="relative">
                    <select
                      id="agent-model"
                      value={model}
                      onChange={(
                        e: ChangeEvent<HTMLSelectElement>,
                      ) => setModel(e.target.value)}
                      className={cn(
                        inputClasses,
                        'appearance-none pr-8',
                      )}
                    >
                      {selectedProvider.models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                  </div>
                </div>
              ) : selectedProvider?.id === 'custom' ? (
                <div>
                  <label
                    htmlFor="agent-model"
                    className="mb-1.5 block text-sm font-medium text-text-secondary"
                  >
                    Model
                  </label>
                  <input
                    id="agent-model"
                    type="text"
                    value={model}
                    onChange={(
                      e: ChangeEvent<HTMLInputElement>,
                    ) => setModel(e.target.value)}
                    className={inputClasses}
                    placeholder="e.g. gpt-4o, claude-4-opus"
                  />
                </div>
              ) : null}

              {selectedProvider &&
                selectedProvider.authMethods.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                      Authentication
                    </label>
                    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                      {selectedProvider.authMethods.map(
                        (method, idx) => (
                          <div
                            key={`${method.type}-${method.envVar ?? idx}`}
                          >
                            <AuthMethodDisplay
                              method={method}
                            />
                            {method.type === 'api_key' &&
                              method.envVar && (
                                <input
                                  type="password"
                                  placeholder={`Enter ${method.envVar}`}
                                  value={getApiKeyValue(
                                    method.envVar,
                                  )}
                                  onChange={(
                                    e: ChangeEvent<HTMLInputElement>,
                                  ) =>
                                    handleApiKeyChange(
                                      method.envVar!,
                                      e.target.value,
                                    )
                                  }
                                  className={cn(
                                    inputClasses,
                                    'mt-1.5 font-mono text-xs',
                                  )}
                                  aria-label={method.envVar}
                                />
                              )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              <div>
                <label
                  htmlFor="agent-working-dir"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Working Directory
                </label>
                <input
                  id="agent-working-dir"
                  type="text"
                  value={workingDir}
                  onChange={(
                    e: ChangeEvent<HTMLInputElement>,
                  ) => setWorkingDir(e.target.value)}
                  className={inputClasses}
                  placeholder="/path/to/project"
                />
              </div>

              <div>
                <label
                  htmlFor="agent-command"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Command
                </label>
                <input
                  id="agent-command"
                  type="text"
                  value={command}
                  onChange={(
                    e: ChangeEvent<HTMLInputElement>,
                  ) => setCommand(e.target.value)}
                  className={inputClasses}
                  placeholder={
                    selectedProvider?.defaultCommand ||
                    'Enter command'
                  }
                />
                {selectedProvider?.defaultCommand && (
                  <p className="mt-1 text-xs text-text-tertiary">
                    Default:{' '}
                    <code className="rounded bg-background px-1 py-0.5">
                      {selectedProvider.defaultCommand}
                    </code>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="agent-env-vars"
                  className="mb-1.5 block text-sm font-medium text-text-secondary"
                >
                  Environment Variables
                </label>
                <textarea
                  id="agent-env-vars"
                  value={envVarsText}
                  onChange={(
                    e: ChangeEvent<HTMLTextAreaElement>,
                  ) => setEnvVarsText(e.target.value)}
                  className={cn(
                    inputClasses,
                    'min-h-[80px] resize-y font-mono text-xs',
                  )}
                  placeholder="KEY=VALUE (one per line)"
                  rows={3}
                />
              </div>

              {selectedProvider?.docUrl && (
                <a
                  href={selectedProvider.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {selectedProvider.name} Documentation
                </a>
              )}

              {error && (
                <p
                  data-testid="agent-create-dialog-error"
                  className="text-sm text-status-error"
                >
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
                  'inline-flex items-center gap-1.5',
                )}
              >
                {loading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
