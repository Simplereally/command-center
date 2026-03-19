export interface TmuxSession {
  id: string;
  name: string;
  windows: TmuxWindow[];
  createdAt: Date;
  attached: boolean;
}

export interface TmuxWindow {
  index: number;
  name: string;
  panes: TmuxPane[];
  active: boolean;
}

export interface TmuxPane {
  id: string;
  index: number;
  width: number;
  height: number;
  active: boolean;
  command: string;
  pid: number;
}

export interface TmuxClientOptions {
  socketName?: string;
  socketPath?: string;
  configPath?: string;
}
