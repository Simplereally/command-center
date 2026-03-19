export class TmuxError extends Error {
  constructor(
    public readonly command: string,
    public readonly exitCode: number,
    public readonly stderr: string,
  ) {
    super(`tmux command failed: ${command} (exit ${exitCode}): ${stderr}`);
    this.name = 'TmuxError';
  }
}
