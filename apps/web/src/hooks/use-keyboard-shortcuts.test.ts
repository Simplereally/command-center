import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './use-keyboard-shortcuts.js';
import { useUiStore } from '../stores/ui-store.js';
import { useAgentStore } from '../stores/agent-store.js';
import { AgentStatus } from '@command-center/shared';
import type { AgentResponse } from '@command-center/shared';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal: () => Promise<typeof import('react-router')>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockBoardState = {
  swimlanes: [
    {
      id: 'lane-1',
      slug: 'not-started',
      name: 'Not Started',
      boardId: 'board-1',
      position: 0,
      agentCount: 2,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'lane-2',
      slug: 'running',
      name: 'Running',
      boardId: 'board-1',
      position: 1,
      agentCount: 2,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'lane-3',
      slug: 'completed',
      name: 'Completed',
      boardId: 'board-1',
      position: 2,
      agentCount: 2,
      createdAt: '',
      updatedAt: '',
    },
  ],
  getState: () => mockBoardState,
  setState: () => {},
  subscribe: () => () => {},
};

vi.mock('../stores/board-store.js', () => ({
  useBoardStore: Object.assign(
    (selector?: (state: typeof mockBoardState) => unknown) => {
      if (selector) return selector(mockBoardState);
      return mockBoardState;
    },
    {
      getState: () => mockBoardState,
      setState: () => {},
      subscribe: () => () => {},
    },
  ),
}));

function dispatchKey(target: Element | null, key: string, init: Partial<KeyboardEvent> = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  (target ?? document.body).dispatchEvent(event);
  return event;
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    useUiStore.setState({
      sidePanelMode: 'closed',
      sidePanelWidth: 40,
      selectedAgentId: null,
      viewMode: 'board',
      commandPaletteOpen: false,
      collapsedLanes: new Set(),
      createAgentDialogOpen: false,
      selectedSwimlaneIndex: 0,
      selectedCardIndexByLane: new Map(),
    });

    useAgentStore.setState({
      agents: new Map(),
      logs: new Map(),
      loading: false,
      error: null,
    });
  });

  it('toggles command palette on ⌘K', () => {
    renderHook(() => useKeyboardShortcuts());

    expect(useUiStore.getState().commandPaletteOpen).toBe(false);

    dispatchKey(document.body, 'k', { metaKey: true });
    expect(useUiStore.getState().commandPaletteOpen).toBe(true);

    dispatchKey(document.body, 'k', { metaKey: true });
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it('toggles command palette on Ctrl+K', () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'k', { ctrlKey: true });
    expect(useUiStore.getState().commandPaletteOpen).toBe(true);
  });

  it('closes side panel on Escape', () => {
    useUiStore.setState({ sidePanelMode: 'detail', selectedAgentId: 'agent-1' });
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'Escape');
    expect(useUiStore.getState().sidePanelMode).toBe('closed');
  });

  it('ignores shortcuts when target is an input', () => {
    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement('input');
    document.body.appendChild(input);

    dispatchKey(input, 'k', { metaKey: true });
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);

    dispatchKey(input, 'Escape');
    expect(useUiStore.getState().sidePanelMode).toBe('closed');

    document.body.removeChild(input);
  });

  it('ignores shortcuts when target is a textarea', () => {
    renderHook(() => useKeyboardShortcuts());

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    dispatchKey(textarea, 'k', { metaKey: true });
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);

    document.body.removeChild(textarea);
  });

  it('opens terminal panel on T when agent selected', () => {
    useUiStore.setState({ selectedAgentId: 'agent-1' });
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 't');
    expect(useUiStore.getState().sidePanelMode).toBe('terminal');
    expect(useUiStore.getState().selectedAgentId).toBe('agent-1');
  });

  it('does not open terminal panel on T when no agent selected', () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 't');
    expect(useUiStore.getState().sidePanelMode).toBe('closed');
  });

  it('stops running agent on Space', async () => {
    const stopAgent = vi.fn().mockResolvedValue(undefined);
    useAgentStore.setState({
      agents: new Map([
        ['agent-1', { id: 'agent-1', status: AgentStatus.RUNNING } as AgentResponse],
      ]),
      stopAgent,
      getAgentById: (id: string) => useAgentStore.getState().agents.get(id),
    } as never);
    useUiStore.setState({ selectedAgentId: 'agent-1' });

    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, ' ');
    expect(stopAgent).toHaveBeenCalledWith('agent-1');
  });

  it('starts stopped agent on Space', async () => {
    const startAgent = vi.fn().mockResolvedValue(undefined);
    useAgentStore.setState({
      agents: new Map([
        ['agent-1', { id: 'agent-1', status: AgentStatus.STOPPED } as AgentResponse],
      ]),
      startAgent,
      getAgentById: (id: string) => useAgentStore.getState().agents.get(id),
    } as never);
    useUiStore.setState({ selectedAgentId: 'agent-1' });

    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, ' ');
    expect(startAgent).toHaveBeenCalledWith('agent-1');
  });

  it('restarts agent on R when agent selected', () => {
    const restartAgent = vi.fn().mockResolvedValue(undefined);
    useAgentStore.setState({
      agents: new Map([
        ['agent-1', { id: 'agent-1', status: AgentStatus.RUNNING } as AgentResponse],
      ]),
      restartAgent,
      getAgentById: (id: string) => useAgentStore.getState().agents.get(id),
    } as never);
    useUiStore.setState({ selectedAgentId: 'agent-1' });

    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'r');
    expect(restartAgent).toHaveBeenCalledWith('agent-1');
  });

  it('does not restart on R when no agent selected', () => {
    const restartAgent = vi.fn();
    useAgentStore.setState({ restartAgent } as never);

    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'r');
    expect(restartAgent).not.toHaveBeenCalled();
  });

  it('opens create agent dialog on ⌘N', () => {
    renderHook(() => useKeyboardShortcuts());

    expect(useUiStore.getState().createAgentDialogOpen).toBe(false);
    dispatchKey(document.body, 'n', { metaKey: true });
    expect(useUiStore.getState().createAgentDialogOpen).toBe(true);
  });

  it('opens create agent dialog on Ctrl+N', () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'n', { ctrlKey: true });
    expect(useUiStore.getState().createAgentDialogOpen).toBe(true);
  });

  it('sets board view on ⌘1', () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, '1', { metaKey: true });
    expect(useUiStore.getState().viewMode).toBe('board');
  });

  it('sets terminal view on ⌘2', () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, '2', { metaKey: true });
    expect(useUiStore.getState().viewMode).toBe('terminal');
  });

  it('sets focus view on ⌘3', () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, '3', { metaKey: true });
    expect(useUiStore.getState().viewMode).toBe('focus');
  });

  it('navigates to settings on ⌘,', () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, ',', { metaKey: true });
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('closes create dialog on Escape when dialog is open', () => {
    useUiStore.setState({ createAgentDialogOpen: true });
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'Escape');
    expect(useUiStore.getState().createAgentDialogOpen).toBe(false);
  });

  it('opens detail panel on Enter when agent selected', () => {
    useUiStore.setState({ selectedAgentId: 'agent-1' });
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'Enter');
    expect(useUiStore.getState().sidePanelMode).toBe('detail');
    expect(useUiStore.getState().selectedAgentId).toBe('agent-1');
  });

  it('does not open detail panel on Enter when no agent selected', () => {
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'Enter');
    expect(useUiStore.getState().sidePanelMode).toBe('closed');
  });

  it('stops agent on Delete when agent selected', () => {
    const stopAgent = vi.fn().mockResolvedValue(undefined);
    useAgentStore.setState({
      agents: new Map([
        ['agent-1', { id: 'agent-1', status: AgentStatus.RUNNING } as AgentResponse],
      ]),
      stopAgent,
    } as never);
    useUiStore.setState({ selectedAgentId: 'agent-1' });
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'Delete');
    expect(stopAgent).toHaveBeenCalledWith('agent-1');
  });

  it('stops agent on Backspace when agent selected', () => {
    const stopAgent = vi.fn().mockResolvedValue(undefined);
    useAgentStore.setState({
      agents: new Map([
        ['agent-1', { id: 'agent-1', status: AgentStatus.RUNNING } as AgentResponse],
      ]),
      stopAgent,
    } as never);
    useUiStore.setState({ selectedAgentId: 'agent-1' });
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'Backspace');
    expect(stopAgent).toHaveBeenCalledWith('agent-1');
  });

  it('navigates to previous swimlane on ArrowLeft', () => {
    useUiStore.setState({ selectedSwimlaneIndex: 2 });
    useAgentStore.setState({
      agents: new Map([
        ['agent-1', { id: 'agent-1', swimlaneId: 'lane-3', position: 0 } as AgentResponse],
        ['agent-2', { id: 'agent-2', swimlaneId: 'lane-1', position: 0 } as AgentResponse],
      ]),
      getAgentsByLane: (swimlaneId: string) =>
        Array.from(useAgentStore.getState().agents.values())
          .filter((a: AgentResponse) => a.swimlaneId === swimlaneId)
          .sort((a: AgentResponse, b: AgentResponse) => a.position - b.position),
    } as never);
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'ArrowLeft');
    expect(useUiStore.getState().selectedSwimlaneIndex).toBe(1);
  });

  it('navigates to next swimlane on ArrowRight', () => {
    useUiStore.setState({ selectedSwimlaneIndex: 0 });
    useAgentStore.setState({
      agents: new Map([
        ['agent-1', { id: 'agent-1', swimlaneId: 'lane-1', position: 0 } as AgentResponse],
        ['agent-2', { id: 'agent-2', swimlaneId: 'lane-2', position: 0 } as AgentResponse],
      ]),
      getAgentsByLane: (swimlaneId: string) =>
        Array.from(useAgentStore.getState().agents.values())
          .filter((a: AgentResponse) => a.swimlaneId === swimlaneId)
          .sort((a: AgentResponse, b: AgentResponse) => a.position - b.position),
    } as never);
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'ArrowRight');
    expect(useUiStore.getState().selectedSwimlaneIndex).toBe(1);
  });

  it('wraps swimlane navigation from first to last on ArrowLeft', () => {
    useUiStore.setState({ selectedSwimlaneIndex: 0 });
    useAgentStore.setState({
      agents: new Map(),
      getAgentsByLane: () => [],
    } as never);
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'ArrowLeft');
    expect(useUiStore.getState().selectedSwimlaneIndex).toBe(2);
  });

  it('wraps swimlane navigation from last to first on ArrowRight', () => {
    useUiStore.setState({ selectedSwimlaneIndex: 2 });
    useAgentStore.setState({
      agents: new Map(),
      getAgentsByLane: () => [],
    } as never);
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'ArrowRight');
    expect(useUiStore.getState().selectedSwimlaneIndex).toBe(0);
  });

  it('navigates up within swimlane on ArrowUp', () => {
    useUiStore.setState({
      selectedSwimlaneIndex: 0,
      selectedCardIndexByLane: new Map([['lane-1', 1]]),
    });
    useAgentStore.setState({
      agents: new Map([
        ['agent-1', { id: 'agent-1', swimlaneId: 'lane-1', position: 0 } as AgentResponse],
        ['agent-2', { id: 'agent-2', swimlaneId: 'lane-1', position: 1 } as AgentResponse],
        ['agent-3', { id: 'agent-3', swimlaneId: 'lane-1', position: 2 } as AgentResponse],
      ]),
      getAgentsByLane: (swimlaneId: string) =>
        Array.from(useAgentStore.getState().agents.values())
          .filter((a: AgentResponse) => a.swimlaneId === swimlaneId)
          .sort((a: AgentResponse, b: AgentResponse) => a.position - b.position),
    } as never);
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'ArrowUp');
    expect(useUiStore.getState().selectedAgentId).toBe('agent-1');
  });

  it('navigates down within swimlane on ArrowDown', () => {
    useUiStore.setState({
      selectedSwimlaneIndex: 0,
      selectedCardIndexByLane: new Map([['lane-1', 1]]),
    });
    useAgentStore.setState({
      agents: new Map([
        ['agent-1', { id: 'agent-1', swimlaneId: 'lane-1', position: 0 } as AgentResponse],
        ['agent-2', { id: 'agent-2', swimlaneId: 'lane-1', position: 1 } as AgentResponse],
        ['agent-3', { id: 'agent-3', swimlaneId: 'lane-1', position: 2 } as AgentResponse],
      ]),
      getAgentsByLane: (swimlaneId: string) =>
        Array.from(useAgentStore.getState().agents.values())
          .filter((a: AgentResponse) => a.swimlaneId === swimlaneId)
          .sort((a: AgentResponse, b: AgentResponse) => a.position - b.position),
    } as never);
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'ArrowDown');
    expect(useUiStore.getState().selectedAgentId).toBe('agent-3');
  });

  it('wraps card navigation from first to last on ArrowUp', () => {
    useUiStore.setState({
      selectedSwimlaneIndex: 0,
      selectedCardIndexByLane: new Map([['lane-1', 0]]),
    });
    useAgentStore.setState({
      agents: new Map([
        ['agent-1', { id: 'agent-1', swimlaneId: 'lane-1', position: 0 } as AgentResponse],
        ['agent-2', { id: 'agent-2', swimlaneId: 'lane-1', position: 1 } as AgentResponse],
      ]),
      getAgentsByLane: (swimlaneId: string) =>
        Array.from(useAgentStore.getState().agents.values())
          .filter((a: AgentResponse) => a.swimlaneId === swimlaneId)
          .sort((a: AgentResponse, b: AgentResponse) => a.position - b.position),
    } as never);
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'ArrowUp');
    expect(useUiStore.getState().selectedAgentId).toBe('agent-2');
  });

  it('wraps card navigation from last to first on ArrowDown', () => {
    useUiStore.setState({
      selectedSwimlaneIndex: 0,
      selectedCardIndexByLane: new Map([['lane-1', 1]]),
    });
    useAgentStore.setState({
      agents: new Map([
        ['agent-1', { id: 'agent-1', swimlaneId: 'lane-1', position: 0 } as AgentResponse],
        ['agent-2', { id: 'agent-2', swimlaneId: 'lane-1', position: 1 } as AgentResponse],
      ]),
      getAgentsByLane: (swimlaneId: string) =>
        Array.from(useAgentStore.getState().agents.values())
          .filter((a: AgentResponse) => a.swimlaneId === swimlaneId)
          .sort((a: AgentResponse, b: AgentResponse) => a.position - b.position),
    } as never);
    renderHook(() => useKeyboardShortcuts());

    dispatchKey(document.body, 'ArrowDown');
    expect(useUiStore.getState().selectedAgentId).toBe('agent-1');
  });

  it('cleans up event listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardShortcuts());

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });
});
