export function formatRelativeTime(date: string | number | Date): string {
  const timestamp = date instanceof Date ? date.getTime() : typeof date === 'number' ? date : new Date(date).getTime();
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffS = Math.floor(diffMs / 1000);

  if (diffS < 60) return 'just now';

  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;

  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(timestamp);
}
