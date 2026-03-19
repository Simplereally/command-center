import { useErrorBoundary } from 'react-error-boundary';
import { AlertTriangle } from 'lucide-react';

export function ErrorFallback() {
  const { resetBoundary } = useErrorBoundary();

  return (
    <div role="alert" className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-destructive-muted p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="mb-2 text-lg font-semibold text-text-primary">Something went wrong</h2>
      <p className="mb-6 text-sm text-text-secondary">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={resetBoundary}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
