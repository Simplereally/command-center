import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useUiStore } from '../../stores/ui-store.js';
import { useAgentStore } from '../../stores/agent-store.js';
import { AgentDetail } from '../agent/agent-detail.js';
import { ErrorBoundary } from '../error-boundary/index.js';

export function SidePanel() {
  const sidePanelMode = useUiStore((s) => s.sidePanelMode);
  const selectedAgentId = useUiStore((s) => s.selectedAgentId);
  const closeSidePanel = useUiStore((s) => s.closeSidePanel);
  const agents = useAgentStore((s) => s.agents);
  const selectedAgent = selectedAgentId ? agents.get(selectedAgentId) : null;
  const prefersReducedMotion = useReducedMotion();

  if (sidePanelMode === 'closed') {
    return null;
  }

  const panelVariants = {
    hidden: { opacity: 0, x: prefersReducedMotion ? 0 : 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: prefersReducedMotion ? 0 : 20 },
  };

  return (
    <motion.aside
      key={sidePanelMode}
      data-testid="side-panel"
      role="complementary"
      className="flex h-full flex-col bg-surface"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={panelVariants}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex h-10 flex-shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-sm font-medium text-text-primary">
          {sidePanelMode === 'detail' ? 'Agent Detail' : 'Terminal'}
        </span>
        <button
          type="button"
          onClick={closeSidePanel}
          className="rounded p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sidePanelMode === 'detail' && selectedAgent && (
          <ErrorBoundary>
            <AgentDetail agent={selectedAgent} />
          </ErrorBoundary>
        )}
        {sidePanelMode === 'terminal' && (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-sm text-text-secondary">Terminal View</p>
          </div>
        )}
        {sidePanelMode === 'detail' && !selectedAgent && (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-sm text-text-secondary">Agent Detail View</p>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
