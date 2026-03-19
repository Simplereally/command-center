import { useEffect, useCallback, useRef } from 'react';
import { cn } from '../../lib/cn.js';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        confirmRef.current?.focus();
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel],
  );

  if (!open) return null;

  return (
    <div
      data-testid="confirm-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        data-testid="confirm-dialog"
        className="w-full max-w-sm rounded-2xl border border-border bg-surface shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="p-6">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold text-text-primary">
            {title}
          </h2>
          <p id="confirm-dialog-message" className="mt-2 text-sm text-text-secondary">
            {message}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'rounded-lg px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium text-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              destructive
                ? 'bg-status-error hover:bg-status-error/90 focus-visible:ring-status-error'
                : 'bg-accent hover:bg-accent-hover focus-visible:ring-accent',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
