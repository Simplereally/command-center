import type {
  OpencodeLogEntry,
  OpencodeAgentMetadata,
  OpencodeLogLevel,
  OpencodeAgentStatus,
} from './types.js';

const LOG_TIMESTAMP_REGEX =
  /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})?)\s*/;
const LOG_LEVEL_REGEX = /\[(debug|info|warn|error|system)\]/i;
const LOG_SESSION_REGEX = /\[([^\]]+)\]/;
const LOG_SOURCE_REGEX = /<([^>]+)>/;

function inferLogLevel(message: string): OpencodeLogLevel {
  const lower = message.toLowerCase();

  if (lower.includes('error') || lower.includes('failed') || lower.includes('fatal')) {
    return 'error';
  }
  if (lower.includes('warn') || lower.includes('warning')) {
    return 'warn';
  }
  if (lower.includes('debug')) {
    return 'debug';
  }
  if (lower.includes('info')) {
    return 'info';
  }

  return 'system';
}

export function parseOpencodeLog(line: string): OpencodeLogEntry | null {
  if (!line || line.trim().length === 0) {
    return null;
  }

  let remaining = line;
  let timestamp = new Date();
  let level: OpencodeLogLevel = 'info';
  let sessionId: string | null = null;
  let source: string | null = null;
  let explicitLevel = false;

  const tsMatch = remaining.match(LOG_TIMESTAMP_REGEX);
  if (tsMatch && tsMatch[1]) {
    const parsed = new Date(tsMatch[1]);
    if (!Number.isNaN(parsed.getTime())) {
      timestamp = parsed;
    }
    remaining = remaining.slice(tsMatch[0].length);
  }

  const levelMatch = remaining.match(LOG_LEVEL_REGEX);
  if (levelMatch && levelMatch[1]) {
    explicitLevel = true;
    const rawLevel = levelMatch[1].toLowerCase();
    if (rawLevel === 'debug') level = 'debug';
    else if (rawLevel === 'info') level = 'info';
    else if (rawLevel === 'warn') level = 'warn';
    else if (rawLevel === 'error') level = 'error';
    else if (rawLevel === 'system') level = 'system';

    remaining = remaining.slice(remaining.indexOf(levelMatch[0]) + levelMatch[0].length);
  }

  const sessionMatch = remaining.match(LOG_SESSION_REGEX);
  if (sessionMatch && sessionMatch[1]) {
    sessionId = sessionMatch[1];
    remaining = remaining.slice(remaining.indexOf(sessionMatch[0]) + sessionMatch[0].length);
  }

  const sourceMatch = remaining.match(LOG_SOURCE_REGEX);
  if (sourceMatch && sourceMatch[1]) {
    source = sourceMatch[1];
    remaining = remaining.slice(remaining.indexOf(sourceMatch[0]) + sourceMatch[0].length);
  }

  const message = remaining.trim();
  if (!message) {
    return null;
  }

  if (!explicitLevel) {
    level = inferLogLevel(message);
  }

  return {
    timestamp,
    level,
    message,
    sessionId,
    source,
  };
}

const METADATA_SESSION_REGEX = /session[:\s"]+([^\s",]+)/i;
const METADATA_NAME_REGEX = /name[:\s"]+([^\s",]+)/i;
const METADATA_STATUS_REGEX =
  /status[:\s"]+(init|initializing|running|active|paused|pause|waiting|idle|done|finished|completed|failed|error)/i;
const METADATA_MODEL_REGEX = /model[:\s"]+([^\s",]+)/i;
const METADATA_TOKENS_REGEX = /tokens?[:\s]+(\d+)/i;
const METADATA_DIR_REGEX = /(?:working[_-]?)?dir[:\s]+([^\s,]+)/i;
const METADATA_STARTED_REGEX =
  /(?:started|start)[:\s]+(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})?)/i;

function parseAgentStatus(statusStr: string): OpencodeAgentStatus {
  const lower = statusStr.toLowerCase();

  switch (lower) {
    case 'initializing':
    case 'init':
      return 'initializing';
    case 'running':
    case 'active':
      return 'running';
    case 'paused':
    case 'pause':
      return 'paused';
    case 'waiting':
    case 'idle':
      return 'waiting';
    case 'completed':
    case 'done':
    case 'finished':
      return 'completed';
    case 'error':
    case 'failed':
      return 'error';
    default:
      return 'error';
  }
}

export function parseAgentMetadata(stdout: string): OpencodeAgentMetadata {
  const metadata: OpencodeAgentMetadata = {
    sessionId: 'unknown',
    name: null,
    status: 'error',
    model: null,
    tokens: null,
    workingDir: null,
    startedAt: null,
  };

  if (!stdout || stdout.trim().length === 0) {
    return metadata;
  }

  const sessionMatch = stdout.match(METADATA_SESSION_REGEX);
  if (sessionMatch && sessionMatch[1]) {
    metadata.sessionId = sessionMatch[1];
  }

  const nameMatch = stdout.match(METADATA_NAME_REGEX);
  if (nameMatch && nameMatch[1]) {
    metadata.name = nameMatch[1];
  }

  const statusMatch = stdout.match(METADATA_STATUS_REGEX);
  if (statusMatch && statusMatch[1]) {
    metadata.status = parseAgentStatus(statusMatch[1]);
  }

  const modelMatch = stdout.match(METADATA_MODEL_REGEX);
  if (modelMatch && modelMatch[1]) {
    metadata.model = modelMatch[1];
  }

  const tokensMatch = stdout.match(METADATA_TOKENS_REGEX);
  if (tokensMatch && tokensMatch[1]) {
    const parsed = Number.parseInt(tokensMatch[1], 10);
    if (!Number.isNaN(parsed)) {
      metadata.tokens = parsed;
    }
  }

  const dirMatch = stdout.match(METADATA_DIR_REGEX);
  if (dirMatch && dirMatch[1]) {
    metadata.workingDir = dirMatch[1];
  }

  const startedMatch = stdout.match(METADATA_STARTED_REGEX);
  if (startedMatch && startedMatch[1]) {
    const parsed = new Date(startedMatch[1]);
    if (!Number.isNaN(parsed.getTime())) {
      metadata.startedAt = parsed;
    }
  }

  return metadata;
}
