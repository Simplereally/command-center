import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import {
  pushModal as pushModalStack,
  popModal as popModalStack,
  topModal as topModalStack,
  getModalStack,
} from '../lib/modal-stack.js';

enableMapSet();

export type ViewMode = 'board' | 'terminal' | 'focus';
export type SidePanelMode = 'closed' | 'detail' | 'terminal';

export interface UiState {
  sidePanelMode: SidePanelMode;
  sidePanelWidth: number;
  selectedAgentId: string | null;
  viewMode: ViewMode;
  commandPaletteOpen: boolean;
  collapsedLanes: Set<string>;
  createAgentDialogOpen: boolean;
  selectedSwimlaneIndex: number;
  selectedCardIndexByLane: Map<string, number>;
  modalStack: string[];
  searchQuery: string;
  statusFilters: Set<string>;

  openDetailPanel: (agentId: string) => void;
  openTerminalPanel: (agentId: string) => void;
  closeSidePanel: () => void;
  setSidePanelWidth: (width: number) => void;
  selectAgent: (agentId: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleCommandPalette: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleLaneCollapse: (swimlaneId: string) => void;
  isLaneCollapsed: (swimlaneId: string) => boolean;
  openCreateAgentDialog: () => void;
  closeCreateAgentDialog: () => void;
  setSelectedSwimlaneIndex: (index: number) => void;
  setSelectedCardIndex: (swimlaneId: string, index: number) => void;
  setSearchQuery: (query: string) => void;
  toggleStatusFilter: (status: string) => void;
  clearFilters: () => void;
  pushModal: (id: string) => void;
  popModal: () => string | undefined;
  topModal: () => string | undefined;
}

export const useUiStore = create<UiState>()(
  immer((set, get) => ({
    sidePanelMode: 'closed',
    sidePanelWidth: 40,
    selectedAgentId: null,
    viewMode: 'board',
    commandPaletteOpen: false,
    collapsedLanes: new Set<string>(),
    createAgentDialogOpen: false,
    selectedSwimlaneIndex: 0,
    selectedCardIndexByLane: new Map<string, number>(),
    modalStack: [...getModalStack()],
    searchQuery: '',
    statusFilters: new Set<string>(),

    openDetailPanel: (agentId: string) => {
      set((state) => {
        state.sidePanelMode = 'detail';
        state.selectedAgentId = agentId;
      });
    },

    openTerminalPanel: (agentId: string) => {
      set((state) => {
        state.sidePanelMode = 'terminal';
        state.selectedAgentId = agentId;
      });
    },

    closeSidePanel: () => {
      set((state) => {
        state.sidePanelMode = 'closed';
      });
    },

    setSidePanelWidth: (width: number) => {
      set((state) => {
        state.sidePanelWidth = Math.min(Math.max(width, 20), 80);
      });
    },

    selectAgent: (agentId: string | null) => {
      set((state) => {
        state.selectedAgentId = agentId;
      });
    },

    setViewMode: (mode: ViewMode) => {
      set((state) => {
        state.viewMode = mode;
      });
    },

    toggleCommandPalette: () => {
      set((state) => {
        state.commandPaletteOpen = !state.commandPaletteOpen;
      });
    },

    openCommandPalette: () => {
      set((state) => {
        state.commandPaletteOpen = true;
      });
    },

    closeCommandPalette: () => {
      set((state) => {
        state.commandPaletteOpen = false;
      });
    },

    toggleLaneCollapse: (swimlaneId: string) => {
      set((state) => {
        if (state.collapsedLanes.has(swimlaneId)) {
          state.collapsedLanes.delete(swimlaneId);
        } else {
          state.collapsedLanes.add(swimlaneId);
        }
      });
    },

    isLaneCollapsed: (swimlaneId: string) => {
      return get().collapsedLanes.has(swimlaneId);
    },

    openCreateAgentDialog: () => {
      set((state) => {
        state.createAgentDialogOpen = true;
      });
    },

    closeCreateAgentDialog: () => {
      set((state) => {
        state.createAgentDialogOpen = false;
      });
    },

    setSelectedSwimlaneIndex: (index: number) => {
      set((state) => {
        state.selectedSwimlaneIndex = index;
      });
    },

    setSelectedCardIndex: (swimlaneId: string, index: number) => {
      set((state) => {
        state.selectedCardIndexByLane.set(swimlaneId, index);
      });
    },

    setSearchQuery: (query: string) => {
      set((state) => {
        state.searchQuery = query;
      });
    },

    toggleStatusFilter: (status: string) => {
      set((state) => {
        if (state.statusFilters.has(status)) {
          state.statusFilters.delete(status);
        } else {
          state.statusFilters.add(status);
        }
      });
    },

    clearFilters: () => {
      set((state) => {
        state.searchQuery = '';
        state.statusFilters = new Set<string>();
      });
    },

    pushModal: (id: string) => {
      pushModalStack(id);
      set((state) => {
        state.modalStack = [...getModalStack()];
      });
    },

    popModal: () => {
      const top = popModalStack();
      set((state) => {
        state.modalStack = [...getModalStack()];
      });
      return top;
    },

    topModal: () => {
      return topModalStack();
    },
  })),
);
