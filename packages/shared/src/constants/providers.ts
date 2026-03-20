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
    description: "Anthropic's agentic coding CLI with deep codebase understanding",
    icon: 'Terminal',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'claude-code' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'claude-code' },
      { id: 'claude-sonnet-4-6-20260205', name: 'Claude Sonnet 4.6', provider: 'claude-code' },
      { id: 'claude-opus-4-6-20260205', name: 'Claude Opus 4.6', provider: 'claude-code' },
    ],
    authMethods: [
      { type: 'api_key', envVar: 'ANTHROPIC_API_KEY', description: 'Anthropic API key', setupUrl: 'https://console.anthropic.com/' },
      { type: 'oauth', description: 'Claude Max/Pro subscription (browser login)' },
      { type: 'cli_auth', description: 'Run `claude` and follow the login prompt' },
    ],
    defaultCommand: 'claude',
    defaultEnvVars: {},
    docUrl: 'https://docs.anthropic.com/en/docs/claude-code',
  },
  {
    id: 'codex-cli',
    name: 'Codex CLI',
    description: "OpenAI's open-source coding agent with sandbox execution",
    icon: 'Braces',
    models: [
      { id: 'codex-mini-latest', name: 'Codex Mini', provider: 'codex-cli' },
      { id: 'o3', name: 'o3', provider: 'codex-cli' },
      { id: 'o4-mini', name: 'o4-mini', provider: 'codex-cli' },
    ],
    authMethods: [
      { type: 'api_key', envVar: 'OPENAI_API_KEY', description: 'OpenAI API key', setupUrl: 'https://platform.openai.com/api-keys' },
      { type: 'oauth', description: 'ChatGPT Plus/Pro/Team subscription login' },
    ],
    defaultCommand: 'codex',
    defaultEnvVars: {},
    docUrl: 'https://developers.openai.com/codex',
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    description: "Google's open-source AI agent with 1M token context",
    icon: 'Sparkles',
    models: [
      { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'gemini-cli' },
      { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'gemini-cli' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini-cli' },
    ],
    authMethods: [
      { type: 'api_key', envVar: 'GEMINI_API_KEY', description: 'Google AI Studio API key', setupUrl: 'https://ai.google.dev/' },
      { type: 'oauth', description: 'Google account sign-in (free tier: 1,000 req/day)' },
    ],
    defaultCommand: 'gemini',
    defaultEnvVars: {},
    docUrl: 'https://developers.google.com/gemini-code-assist/docs/gemini-cli',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    description: 'Open-source AI coding agent supporting 75+ LLM providers',
    icon: 'Code',
    models: [
      { id: 'opencode-default', name: 'Default', provider: 'opencode' },
    ],
    authMethods: [
      { type: 'cli_auth', description: 'Run `opencode auth login` to configure a provider' },
      { type: 'api_key', envVar: 'OPENAI_API_KEY', description: 'OpenAI API key (for OpenAI models)' },
      { type: 'api_key', envVar: 'ANTHROPIC_API_KEY', description: 'Anthropic API key (for Claude models)' },
    ],
    defaultCommand: 'opencode',
    defaultEnvVars: {},
    docUrl: 'https://opencode.ai/docs',
  },
  {
    id: 'aider',
    name: 'Aider',
    description: 'AI pair programming with git integration and 100+ language support',
    icon: 'GitBranch',
    models: [
      { id: 'sonnet', name: 'Claude Sonnet 4', provider: 'aider' },
      { id: 'opus', name: 'Claude Opus 4', provider: 'aider' },
      { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'aider' },
      { id: 'o3', name: 'o3', provider: 'aider' },
      { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'aider' },
      { id: 'gemini/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'aider' },
    ],
    authMethods: [
      { type: 'api_key', envVar: 'ANTHROPIC_API_KEY', description: 'Anthropic API key (for Claude models)' },
      { type: 'api_key', envVar: 'OPENAI_API_KEY', description: 'OpenAI API key (for GPT/o-series)' },
      { type: 'api_key', envVar: 'GEMINI_API_KEY', description: 'Google API key (for Gemini models)' },
      { type: 'api_key', envVar: 'DEEPSEEK_API_KEY', description: 'DeepSeek API key' },
    ],
    defaultCommand: 'aider',
    defaultEnvVars: {},
    docUrl: 'https://aider.chat',
  },
  {
    id: 'copilot-cli',
    name: 'Copilot CLI',
    description: "GitHub's agentic CLI with plan, review, and autopilot modes",
    icon: 'Zap',
    models: [
      { id: 'copilot-default', name: 'Default', provider: 'copilot-cli' },
    ],
    authMethods: [
      { type: 'cli_auth', description: 'Run `gh auth login` to authenticate with GitHub' },
      { type: 'api_key', envVar: 'GITHUB_TOKEN', description: 'GitHub personal access token' },
    ],
    defaultCommand: 'gh copilot',
    defaultEnvVars: {},
    docUrl: 'https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli',
  },
  {
    id: 'amazon-q',
    name: 'Amazon Q',
    description: "AWS's AI coding agent with cloud-native tooling",
    icon: 'Cloud',
    models: [
      { id: 'amazon-q-default', name: 'Default', provider: 'amazon-q' },
    ],
    authMethods: [
      { type: 'cli_auth', description: 'Authenticate with AWS Builder ID via `q login`' },
      { type: 'oauth', description: 'AWS IAM Identity Center (for organizations)' },
    ],
    defaultCommand: 'q chat',
    defaultEnvVars: {},
    docUrl: 'https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line-chat.html',
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
