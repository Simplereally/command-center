export const SWIMLANE_STATUS_MAP = {
  'not-started': 'idle',
  'in-progress': 'running',
  'review': 'paused',
  'done': 'completed',
} as const;

export const SWIMLANE_DEFINITIONS = [
  { slug: 'not-started', name: 'Not Started', position: 0, color: 'hsl(240 3% 46%)' },
  { slug: 'in-progress', name: 'In Progress', position: 1, color: 'hsl(217 91% 60%)' },
  { slug: 'review', name: 'Review', position: 2, color: 'hsl(38 92% 55%)' },
  { slug: 'done', name: 'Done', position: 3, color: 'hsl(152 60% 52%)' },
] as const;
