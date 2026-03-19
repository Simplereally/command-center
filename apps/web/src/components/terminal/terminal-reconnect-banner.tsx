import { RefreshCw } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export interface TerminalReconnectBannerProps {
  isVisible: boolean;
  attempt: number;
  maxAttempts: number;
  onRetry: () => void;
  className?: string;
}

export function TerminalReconnectBanner({
  isVisible,
  attempt,
  maxAttempts,
  onRetry,
  className,
}: TerminalReconnectBannerProps) {
  if (!isVisible) {
    return null;
  }

  const isLastAttempt = attempt >= maxAttempts;
  const progressPercent = Math.min((attempt / maxAttempts) * 100, 100);

  return (
    <div
      data-testid="terminal-reconnect-banner"
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface/95 backdrop-blur-sm',
        className,
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface-card p-6 shadow-lg">
        <RefreshCw className="h-8 w-8 animate-spin text-accent" aria-hidden="true" />
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary">Reconnecting...</p>
          <p className="mt-1 text-xs text-text-secondary">
            Attempt {attempt} of {maxAttempts}
          </p>
        </div>
        <div className="w-48">
          <div className="h-1 overflow-hidden rounded-full bg-surface-hover">
            <div
              className="h-full animate-pulse rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        {!isLastAttempt && (
          <p className="text-xs text-text-tertiary">
            Next attempt in {Math.max(0, (maxAttempts - attempt) * 2)}s
          </p>
        )}
        {isLastAttempt && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Retry Now
          </button>
        )}
      </div>
    </div>
  );
}
