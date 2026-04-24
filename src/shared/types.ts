export type ProviderKind = "vercel" | "github";

export type ProviderMode = "live" | "mock";

export interface DeploymentItem {
  id: string;
  provider: ProviderKind;
  project: string;
  branch: string;
  commitMessage: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  creator: string;
  repo?: string;
  previewUrl?: string;
  externalUrl?: string;
  workflowName?: string;
}

export interface ProviderSnapshot {
  kind: ProviderKind;
  mode: ProviderMode;
  notice: string;
  items: DeploymentItem[];
}

export interface AppSnapshot {
  updatedAt: string;
  providers: Record<ProviderKind, ProviderSnapshot>;
}

export interface DeplogApi {
  getSnapshot: () => Promise<AppSnapshot>;
  subscribe: (listener: (snapshot: AppSnapshot) => void) => () => void;
  openExternal: (url: string) => Promise<void>;
  quit: () => Promise<void>;
}
