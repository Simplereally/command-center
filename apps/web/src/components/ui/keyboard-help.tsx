import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export interface KeyboardHelpProps {
  open: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string;
  action: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: '⌘K', action: 'Command palette' },
      { keys: '⌘N', action: 'New agent' },
      { keys: '← →', action: 'Navigate lanes' },
      { keys: '↑ ↓', action: 'Navigate cards' },
    ],
  },
  {
    title: 'Agent Actions',
    shortcuts: [
      { keys: 'T', action: 'Open terminal' },
      { keys: 'Space', action: 'Start/stop' },
      { keys: 'R', action: 'Restart' },
      { keys: 'Enter', action: 'Select/view detail' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: 'Escape', action: 'Close panel / deselect' },
      { keys: '?', action: 'Toggle this help' },
    ],
  },
];

export function KeyboardHelp({ open, onClose }: KeyboardHelpProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      data-testid="keyboard-help-backdrop"
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
    >
      <div
        data-testid="keyboard-help-modal"
        className="max-w-md bg-surface rounded-xl border border-border shadow-xl p-6 mx-auto mt-[15vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Keyboard Shortcuts</h2>
          <button
            type="button"
            data-testid="keyboard-help-close"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
                {group.title}
              </h3>
              <div className="space-y-0.5">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.action} className="flex justify-between py-1.5">
                    <span className="text-sm text-text-secondary">{shortcut.action}</span>
                    <kbd className="inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-xs font-mono text-text-secondary">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
