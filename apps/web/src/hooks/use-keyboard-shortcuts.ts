import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useUiStore } from '../stores/ui-store.js';
import { useAgentStore } from '../stores/agent-store.js';
import { useBoardStore } from '../stores/board-store.js';
import { topModal } from '../lib/modal-stack.js';
import { AgentStatus } from '@command-center/shared';

const ACTIVE_STATUSES = new Set<string>([
  AgentStatus.RUNNING,
  AgentStatus.STARTING,
  AgentStatus.PAUSED,
]);

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export function scrollAgentIntoView(agentId: string): void {
  requestAnimationFrame(() => {
    document
      .querySelector(`[data-testid="agent-card-${agentId}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

export function useKeyboardShortcuts(): void {
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isInputElement(event.target)) return;

      const { key, metaKey, ctrlKey } = event;
      const modifier = metaKey || ctrlKey;

      if (modifier && key === 'k') {
        event.preventDefault();
        useUiStore.getState().toggleCommandPalette();
        return;
      }

      if (modifier && key === 'n') {
        event.preventDefault();
        useUiStore.getState().openCreateAgentDialog();
        return;
      }

      if (modifier && key === '1') {
        event.preventDefault();
        useUiStore.getState().setViewMode('board');
        return;
      }

      if (modifier && key === '2') {
        event.preventDefault();
        useUiStore.getState().setViewMode('terminal');
        return;
      }

      if (modifier && key === '3') {
        event.preventDefault();
        useUiStore.getState().setViewMode('focus');
        return;
      }

      if (modifier && key === ',') {
        event.preventDefault();
        navigate('/settings');
        return;
      }

      if (key === 'Escape') {
        if (topModal()) {
          return;
        }
        event.preventDefault();
        useUiStore.getState().closeSidePanel();
        return;
      }

      if (modifier) return;

      const selectedAgentId = useUiStore.getState().selectedAgentId;

      if (key === 't' || key === 'T') {
        if (selectedAgentId) {
          event.preventDefault();
          useUiStore.getState().openTerminalPanel(selectedAgentId);
        }
        return;
      }

      if (key === ' ') {
        if (selectedAgentId) {
          event.preventDefault();
          const agent = useAgentStore.getState().getAgentById(selectedAgentId);
          if (agent) {
            if (ACTIVE_STATUSES.has(agent.status)) {
              useAgentStore.getState().stopAgent(selectedAgentId);
            } else {
              useAgentStore.getState().startAgent(selectedAgentId);
            }
          }
        }
        return;
      }

      if (key === 'r' || key === 'R') {
        if (selectedAgentId) {
          event.preventDefault();
          useAgentStore.getState().restartAgent(selectedAgentId);
        }
        return;
      }

      const swimlanes = useBoardStore.getState().swimlanes;
      const currentSwimlaneIndex = useUiStore.getState().selectedSwimlaneIndex;
      const cardIndexMap = useUiStore.getState().selectedCardIndexByLane;

      if (key === 'ArrowLeft') {
        if (swimlanes.length > 0) {
          event.preventDefault();
          const newIndex =
            currentSwimlaneIndex > 0 ? currentSwimlaneIndex - 1 : swimlanes.length - 1;
          useUiStore.getState().setSelectedSwimlaneIndex(newIndex);
          const newSwimlane = swimlanes[newIndex];
          if (newSwimlane) {
            const currentCardIndex = cardIndexMap.get(newSwimlane.id) ?? 0;
            useUiStore.getState().setSelectedCardIndex(newSwimlane.id, currentCardIndex);
            const agentsInLane = useAgentStore.getState().getAgentsByLane(newSwimlane.id);
            if (agentsInLane.length > 0) {
              const cardIndex = Math.min(currentCardIndex, agentsInLane.length - 1);
              const agent = agentsInLane[cardIndex];
              if (agent) {
                useUiStore.getState().selectAgent(agent.id);
                useUiStore.getState().setSelectedCardIndex(newSwimlane.id, cardIndex);
                scrollAgentIntoView(agent.id);
              }
            }
          }
        }
        return;
      }

      if (key === 'ArrowRight') {
        if (swimlanes.length > 0) {
          event.preventDefault();
          const newIndex =
            currentSwimlaneIndex < swimlanes.length - 1 ? currentSwimlaneIndex + 1 : 0;
          useUiStore.getState().setSelectedSwimlaneIndex(newIndex);
          const newSwimlane = swimlanes[newIndex];
          if (newSwimlane) {
            const currentCardIndex = cardIndexMap.get(newSwimlane.id) ?? 0;
            useUiStore.getState().setSelectedCardIndex(newSwimlane.id, currentCardIndex);
            const agentsInLane = useAgentStore.getState().getAgentsByLane(newSwimlane.id);
            if (agentsInLane.length > 0) {
              const cardIndex = Math.min(currentCardIndex, agentsInLane.length - 1);
              const agent = agentsInLane[cardIndex];
              if (agent) {
                useUiStore.getState().selectAgent(agent.id);
                useUiStore.getState().setSelectedCardIndex(newSwimlane.id, cardIndex);
                scrollAgentIntoView(agent.id);
              }
            }
          }
        }
        return;
      }

      if (key === 'ArrowUp') {
        if (swimlanes.length > 0 && currentSwimlaneIndex < swimlanes.length) {
          const currentSwimlane = swimlanes[currentSwimlaneIndex];
          if (currentSwimlane) {
            const agentsInLane = useAgentStore.getState().getAgentsByLane(currentSwimlane.id);
            if (agentsInLane.length > 0) {
              event.preventDefault();
              const currentCardIndex = cardIndexMap.get(currentSwimlane.id) ?? 0;
              const newCardIndex =
                currentCardIndex > 0 ? currentCardIndex - 1 : agentsInLane.length - 1;
              useUiStore.getState().setSelectedCardIndex(currentSwimlane.id, newCardIndex);
              const agent = agentsInLane[newCardIndex];
              if (agent) {
                useUiStore.getState().selectAgent(agent.id);
                scrollAgentIntoView(agent.id);
              }
            }
          }
        }
        return;
      }

      if (key === 'ArrowDown') {
        if (swimlanes.length > 0 && currentSwimlaneIndex < swimlanes.length) {
          const currentSwimlane = swimlanes[currentSwimlaneIndex];
          if (currentSwimlane) {
            const agentsInLane = useAgentStore.getState().getAgentsByLane(currentSwimlane.id);
            if (agentsInLane.length > 0) {
              event.preventDefault();
              const currentCardIndex = cardIndexMap.get(currentSwimlane.id) ?? 0;
              const newCardIndex =
                currentCardIndex < agentsInLane.length - 1 ? currentCardIndex + 1 : 0;
              useUiStore.getState().setSelectedCardIndex(currentSwimlane.id, newCardIndex);
              const agent = agentsInLane[newCardIndex];
              if (agent) {
                useUiStore.getState().selectAgent(agent.id);
                scrollAgentIntoView(agent.id);
              }
            }
          }
        }
        return;
      }

      if (key === 'Enter') {
        if (selectedAgentId) {
          event.preventDefault();
          useUiStore.getState().openDetailPanel(selectedAgentId);
        }
        return;
      }

      if (key === 'Backspace' || key === 'Delete') {
        if (selectedAgentId) {
          event.preventDefault();
          useAgentStore.getState().stopAgent(selectedAgentId);
        }
        return;
      }
    },
    [navigate],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
