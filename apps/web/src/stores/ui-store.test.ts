import { useUiStore } from './ui-store.js';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({
      sidePanelMode: 'closed',
      sidePanelWidth: 40,
      selectedAgentId: null,
      viewMode: 'board',
      commandPaletteOpen: false,
      collapsedLanes: new Set(),
    });
  });

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useUiStore.getState();
      expect(state.sidePanelMode).toBe('closed');
      expect(state.sidePanelWidth).toBe(40);
      expect(state.selectedAgentId).toBeNull();
      expect(state.viewMode).toBe('board');
      expect(state.commandPaletteOpen).toBe(false);
      expect(state.collapsedLanes.size).toBe(0);
    });
  });

  describe('side panel', () => {
    it('opens detail panel and selects agent', () => {
      const { openDetailPanel } = useUiStore.getState();
      openDetailPanel('agent-1');

      const state = useUiStore.getState();
      expect(state.sidePanelMode).toBe('detail');
      expect(state.selectedAgentId).toBe('agent-1');
    });

    it('switches from terminal to detail mode', () => {
      useUiStore.setState({ sidePanelMode: 'terminal', selectedAgentId: 'agent-1' });

      const { openDetailPanel } = useUiStore.getState();
      openDetailPanel('agent-2');

      const state = useUiStore.getState();
      expect(state.sidePanelMode).toBe('detail');
      expect(state.selectedAgentId).toBe('agent-2');
    });

    it('opens terminal panel and selects agent', () => {
      const { openTerminalPanel } = useUiStore.getState();
      openTerminalPanel('agent-2');

      const state = useUiStore.getState();
      expect(state.sidePanelMode).toBe('terminal');
      expect(state.selectedAgentId).toBe('agent-2');
    });

    it('switches from detail to terminal mode', () => {
      useUiStore.setState({ sidePanelMode: 'detail', selectedAgentId: 'agent-1' });

      const { openTerminalPanel } = useUiStore.getState();
      openTerminalPanel('agent-2');

      const state = useUiStore.getState();
      expect(state.sidePanelMode).toBe('terminal');
      expect(state.selectedAgentId).toBe('agent-2');
    });

    it('closes side panel but keeps selected agent', () => {
      useUiStore.setState({ sidePanelMode: 'detail', selectedAgentId: 'agent-1' });
      const { closeSidePanel } = useUiStore.getState();
      closeSidePanel();

      const state = useUiStore.getState();
      expect(state.sidePanelMode).toBe('closed');
      expect(state.selectedAgentId).toBe('agent-1');
    });

    it('clamps side panel width to minimum of 20', () => {
      const { setSidePanelWidth } = useUiStore.getState();
      setSidePanelWidth(10);
      expect(useUiStore.getState().sidePanelWidth).toBe(20);
    });

    it('clamps side panel width to maximum of 80', () => {
      const { setSidePanelWidth } = useUiStore.getState();
      setSidePanelWidth(90);
      expect(useUiStore.getState().sidePanelWidth).toBe(80);
    });

    it('accepts valid width within range', () => {
      const { setSidePanelWidth } = useUiStore.getState();
      setSidePanelWidth(50);
      expect(useUiStore.getState().sidePanelWidth).toBe(50);
    });

    it('accepts exact boundary values', () => {
      const { setSidePanelWidth } = useUiStore.getState();

      setSidePanelWidth(20);
      expect(useUiStore.getState().sidePanelWidth).toBe(20);

      setSidePanelWidth(80);
      expect(useUiStore.getState().sidePanelWidth).toBe(80);
    });
  });

  describe('selection', () => {
    it('selects an agent', () => {
      const { selectAgent } = useUiStore.getState();
      selectAgent('agent-3');

      expect(useUiStore.getState().selectedAgentId).toBe('agent-3');
    });

    it('clears selection with null', () => {
      useUiStore.setState({ selectedAgentId: 'agent-1' });
      const { selectAgent } = useUiStore.getState();
      selectAgent(null);

      expect(useUiStore.getState().selectedAgentId).toBeNull();
    });

    it('replaces previous selection', () => {
      useUiStore.setState({ selectedAgentId: 'agent-1' });

      const { selectAgent } = useUiStore.getState();
      selectAgent('agent-2');

      expect(useUiStore.getState().selectedAgentId).toBe('agent-2');
    });
  });

  describe('view mode', () => {
    it('sets view mode to terminal', () => {
      const { setViewMode } = useUiStore.getState();
      setViewMode('terminal');

      expect(useUiStore.getState().viewMode).toBe('terminal');
    });

    it('sets view mode to focus', () => {
      const { setViewMode } = useUiStore.getState();
      setViewMode('focus');

      expect(useUiStore.getState().viewMode).toBe('focus');
    });

    it('sets view mode back to board', () => {
      useUiStore.setState({ viewMode: 'terminal' });

      const { setViewMode } = useUiStore.getState();
      setViewMode('board');

      expect(useUiStore.getState().viewMode).toBe('board');
    });
  });

  describe('command palette', () => {
    it('toggles command palette open and closed', () => {
      const { toggleCommandPalette } = useUiStore.getState();
      expect(useUiStore.getState().commandPaletteOpen).toBe(false);

      toggleCommandPalette();
      expect(useUiStore.getState().commandPaletteOpen).toBe(true);

      toggleCommandPalette();
      expect(useUiStore.getState().commandPaletteOpen).toBe(false);
    });

    it('opens command palette', () => {
      const { openCommandPalette } = useUiStore.getState();
      openCommandPalette();

      expect(useUiStore.getState().commandPaletteOpen).toBe(true);
    });

    it('openCommandPalette is idempotent', () => {
      useUiStore.setState({ commandPaletteOpen: true });

      const { openCommandPalette } = useUiStore.getState();
      openCommandPalette();

      expect(useUiStore.getState().commandPaletteOpen).toBe(true);
    });

    it('closes command palette', () => {
      useUiStore.setState({ commandPaletteOpen: true });
      const { closeCommandPalette } = useUiStore.getState();
      closeCommandPalette();

      expect(useUiStore.getState().commandPaletteOpen).toBe(false);
    });

    it('closeCommandPalette is idempotent', () => {
      const { closeCommandPalette } = useUiStore.getState();
      closeCommandPalette();

      expect(useUiStore.getState().commandPaletteOpen).toBe(false);
    });
  });

  describe('lane collapse', () => {
    it('toggles lane collapse on and off', () => {
      const { toggleLaneCollapse } = useUiStore.getState();

      toggleLaneCollapse('lane-1');
      expect(useUiStore.getState().collapsedLanes.has('lane-1')).toBe(true);

      toggleLaneCollapse('lane-1');
      expect(useUiStore.getState().collapsedLanes.has('lane-1')).toBe(false);
    });

    it('handles multiple lanes independently', () => {
      const { toggleLaneCollapse } = useUiStore.getState();
      toggleLaneCollapse('lane-1');
      toggleLaneCollapse('lane-2');

      const state = useUiStore.getState();
      expect(state.collapsedLanes.has('lane-1')).toBe(true);
      expect(state.collapsedLanes.has('lane-2')).toBe(true);
      expect(state.collapsedLanes.size).toBe(2);
    });

    it('toggling one lane does not affect others', () => {
      useUiStore.setState({ collapsedLanes: new Set(['lane-1', 'lane-2']) });

      const { toggleLaneCollapse } = useUiStore.getState();
      toggleLaneCollapse('lane-1');

      const state = useUiStore.getState();
      expect(state.collapsedLanes.has('lane-1')).toBe(false);
      expect(state.collapsedLanes.has('lane-2')).toBe(true);
    });

    it('isLaneCollapsed returns false for non-collapsed lane', () => {
      const { isLaneCollapsed } = useUiStore.getState();
      expect(isLaneCollapsed('lane-1')).toBe(false);
    });

    it('isLaneCollapsed returns true for collapsed lane', () => {
      useUiStore.setState({ collapsedLanes: new Set(['lane-2']) });
      const { isLaneCollapsed } = useUiStore.getState();

      expect(isLaneCollapsed('lane-1')).toBe(false);
      expect(isLaneCollapsed('lane-2')).toBe(true);
    });

    it('isLaneCollapsed reflects toggle state', () => {
      useUiStore.setState({ collapsedLanes: new Set(['lane-1']) });

      const { toggleLaneCollapse, isLaneCollapsed } = useUiStore.getState();
      expect(isLaneCollapsed('lane-1')).toBe(true);

      toggleLaneCollapse('lane-1');
      expect(isLaneCollapsed('lane-1')).toBe(false);
    });
  });
});
