export function EmptyLane() {
  return (
    <div
      data-testid="empty-lane"
      className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border"
    >
      <span className="text-sm text-text-tertiary">Drag an agent here</span>
    </div>
  );
}
