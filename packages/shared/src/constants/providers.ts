export interface AgentProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  models: AgentModel[];
  authMethods: AuthMethod[];
  defaultCommand: string;
  defaultEnvVars: Record<string, string>;
  docUrl?: string;
}

export interface AgentModel {
  id: string;
  name: string;
  provider: string;
}

export interface AuthMethod {
  type: 'api_key' | 'oauth' | 'cli_auth';
  envVar?: string;
  description: string;
  setupUrl?: string;
}

export const PROVIDERS: AgentProvider[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    description: "Anthropic's Claude Code CLI agent",
    icon: 'Terminal',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'claude-code' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'claude-code' },
    ],
    authMethods: [
      { type: 'api_key', envVar: 'ANTHROPIC_API_KEY', description: 'Anthropic API key' },
      { type: 'oauth', description: 'Claude Max/Pro subscription (interactive login)', setupUrl: 'https://console.anthropic.com/' },
      { type: 'cli_auth', description: 'Run `claude auth login` first' },
    ],
    defaultCommand: 'claude --print',
    defaultEnvVars: {},
    docUrl: 'https://docs.anthropic.com/en/docs/claude-code',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    description: 'Open-source AI coding agent',
    icon: 'Code',
    models: [{ id: 'opencode-default', name: 'Default', provider: 'opencode' }],
    authMethods: [
      { type: 'cli_auth', description: 'Run `opencode auth` first' },
      { type: 'api_key', envVar: 'OPENCODE_API_KEY', description: 'OpenCode API key' },
    ],
    defaultCommand: 'opencode',
    defaultEnvVars: {},
  },
  {
    id: 'aider',
    name: 'Aider',
    description: 'AI pair programming in your terminal',
    icon: 'GitBranch',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'aider' },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'aider' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'aider' },
    ],
    authMethods: [
      { type: 'api_key', envVar: 'OPENAI_API_KEY', description: 'OpenAI API key (for GPT models)' },
      { type: 'api_key', envVar: 'ANTHROPIC_API_KEY', description: 'Anthropic API key (for Claude models)' },
    ],
    defaultCommand: 'aider',
    defaultEnvVars: {},
    docUrl: 'https://aider.chat',
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Any CLI command or script',
    icon: 'Settings',
    models: [],
    authMethods: [],
    defaultCommand: '',
    defaultEnvVars: {},
  },
];

export function getProviderById(id: string): AgentProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getProviderForModel(modelId: string): AgentProvider | undefined {
  return PROVIDERS.find((p) => p.models.some((m) => m.id === modelId));
}
