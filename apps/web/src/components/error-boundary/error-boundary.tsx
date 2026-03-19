import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import type { ReactNode } from 'react';
import { ErrorFallback } from './error-fallback.js';

interface ErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: unknown, info: React.ErrorInfo) => void;
  onReset?: () => void;
  fallback?: ReactNode;
}

export function ErrorBoundary({ children, onError, onReset, fallback }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      fallback={fallback ?? <ErrorFallback />}
      onError={onError}
      onReset={onReset}
    >
      {children}
    </ReactErrorBoundary>
  );
}
