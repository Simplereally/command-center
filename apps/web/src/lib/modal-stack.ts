let stack: string[] = [];

export function pushModal(id: string): void {
  if (!stack.includes(id)) {
    stack.push(id);
  }
}

export function popModal(): string | undefined {
  return stack.pop();
}

export function topModal(): string | undefined {
  return stack.length > 0 ? stack[stack.length - 1] : undefined;
}

export function getModalStack(): readonly string[] {
  return stack;
}

export function clearModalStack(): void {
  stack = [];
}
