import dotenv from "dotenv";
import path from "node:path";
import type { AppSnapshot, DeploymentItem, ProviderKind, ProviderMode, ProviderSnapshot } from "../src/shared/types";

const { app, BrowserWindow, ipcMain, nativeImage, shell, Tray } = require("electron");

dotenv.config();

const isDev = !app.isPackaged;
const rendererUrl = "http://127.0.0.1:5173";

let tray: Tray | null = null;
let panel: BrowserWindow | null = null;
let pollInterval: NodeJS.Timeout | null = null;
let snapshot: AppSnapshot = createMockSnapshot();

function createTrayIcon() {
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
        <rect x="2" y="2" width="14" height="14" rx="4" fill="black"/>
        <path d="M6 11.5V6.5h2.1c1.9 0 3 1 3 2.5s-1.1 2.5-3 2.5H6Zm2-1.6h.9c.9 0 1.5-.4 1.5-1.4s-.6-1.4-1.5-1.4H8v2.8Z" fill="white"/>
      </svg>`
    ).toString("base64")}`
  );
}

function createWindow() {
  panel = new BrowserWindow({
    width: 820,
    height: 720,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: true,
    resizable: false,
    fullscreenable: false,
    movable: false,
    skipTaskbar: true,
    vibrancy: "menu",
    visualEffectState: "active",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panel.on("blur", () => {
    panel?.hide();
  });

  panel.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    void panel.loadURL(rendererUrl);
  } else {
    void panel.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

function positionWindow() {
  if (!tray || !panel) {
    return;
  }

  const trayBounds = tray.getBounds();
  const windowBounds = panel.getBounds();
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
  const y = Math.round(trayBounds.y + trayBounds.height + 10);

  panel.setPosition(x, y, false);
}

function toggleWindow() {
  if (!panel) {
    return;
  }

  if (panel.isVisible()) {
    panel.hide();
    return;
  }

  positionWindow();
  panel.show();
  panel.focus();
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip("Deplog Menu Bar");
  tray.on("click", toggleWindow);
  tray.on("right-click", toggleWindow);
}

async function fetchJson<T>(input: string, init: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function createMockSnapshot(): AppSnapshot {
  const now = new Date();
  const makeDate = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();

  const vercelItems: DeploymentItem[] = [
    {
      id: "v1",
      provider: "vercel",
      project: "deplog-web",
      repo: "deplog-web",
      branch: "main",
      commitMessage: "feat: add status filtering",
      status: "building",
      statusLabel: "Building...",
      createdAt: makeDate(2),
      updatedAt: makeDate(1),
      creator: "yedmrblt",
      previewUrl: "https://deplog-web.vercel.app",
      externalUrl: "https://vercel.com/dashboard"
    },
    {
      id: "v2",
      provider: "vercel",
      project: "deplog-web",
      repo: "deplog-web",
      branch: "main",
      commitMessage: "fix: resolve sync issue",
      status: "ready",
      statusLabel: "10 minutes ago",
      createdAt: makeDate(10),
      updatedAt: makeDate(10),
      creator: "yedmrblt",
      previewUrl: "https://deplog-web.vercel.app",
      externalUrl: "https://vercel.com/dashboard"
    },
    {
      id: "v3",
      provider: "vercel",
      project: "side-project",
      repo: "side-project",
      branch: "main",
      commitMessage: "chore: update packages",
      status: "error",
      statusLabel: "2 hours ago",
      createdAt: makeDate(120),
      updatedAt: makeDate(120),
      creator: "yedmrblt",
      previewUrl: "https://side-project.vercel.app",
      externalUrl: "https://vercel.com/dashboard"
    },
    {
      id: "v4",
      provider: "vercel",
      project: "deplog-web",
      repo: "deplog-web",
      branch: "main",
      commitMessage: "feat: improve UI clarity",
      status: "ready",
      statusLabel: "5 days ago",
      createdAt: makeDate(60 * 24 * 5),
      updatedAt: makeDate(60 * 24 * 5),
      creator: "yedmrblt",
      previewUrl: "https://deplog-web.vercel.app",
      externalUrl: "https://vercel.com/dashboard"
    }
  ];

  const githubItems: DeploymentItem[] = [
    {
      id: "g1",
      provider: "github",
      project: "deplog-web",
      repo: "jacobmajors/deplog-web",
      branch: "main",
      commitMessage: "Deploy Preview",
      status: "running",
      statusLabel: "Running now",
      createdAt: makeDate(3),
      updatedAt: makeDate(1),
      creator: "jacobmajors",
      externalUrl: "https://github.com",
      workflowName: "Deploy Preview"
    },
    {
      id: "g2",
      provider: "github",
      project: "side-project",
      repo: "jacobmajors/side-project",
      branch: "main",
      commitMessage: "CI",
      status: "completed",
      statusLabel: "12 minutes ago",
      createdAt: makeDate(12),
      updatedAt: makeDate(12),
      creator: "jacobmajors",
      externalUrl: "https://github.com",
      workflowName: "CI"
    }
  ];

  return {
    updatedAt: now.toISOString(),
    providers: {
      vercel: {
        kind: "vercel",
        mode: "mock",
        notice: "Showing polished mock data. Add Vercel env vars to fetch live deployments.",
        items: vercelItems
      },
      github: {
        kind: "github",
        mode: "mock",
        notice: "Showing polished mock data. Add GitHub env vars to fetch live workflow runs.",
        items: githubItems
      }
    }
  };
}

function getRelativeTime(dateLike: string) {
  const elapsed = Date.now() - new Date(dateLike).getTime();
  const minutes = Math.round(elapsed / 60_000);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function normalizeVercelStatus(state: string | undefined) {
  switch ((state ?? "").toUpperCase()) {
    case "BUILDING":
      return { status: "building", label: "Building..." };
    case "READY":
      return { status: "ready", label: "Ready" };
    case "ERROR":
    case "CANCELED":
      return { status: "error", label: "Failed" };
    case "QUEUED":
    case "INITIALIZING":
      return { status: "queued", label: "Queued" };
    default:
      return { status: "unknown", label: "Unknown" };
  }
}

async function getVercelSnapshot(): Promise<ProviderSnapshot> {
  const token = process.env.VERCEL_TOKEN;

  if (!token) {
    return createMockSnapshot().providers.vercel;
  }

  try {
    const teamId = process.env.VERCEL_TEAM_ID;
    const projectIds = process.env.VERCEL_PROJECT_IDS?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];

    const url = new URL("https://api.vercel.com/v6/deployments");
    url.searchParams.set("limit", "12");
    if (teamId) {
      url.searchParams.set("teamId", teamId);
    }
    if (projectIds.length > 0) {
      url.searchParams.set("projectIds", projectIds.join(","));
    }

    const payload = await fetchJson<{ deployments: Array<Record<string, any>> }>(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const items: DeploymentItem[] = payload.deployments.map((deployment) => {
      const normalized = normalizeVercelStatus(deployment.state);
      const createdAt = new Date(deployment.createdAt ?? Date.now()).toISOString();
      const updatedAt = new Date(deployment.readyStateAt ?? deployment.createdAt ?? Date.now()).toISOString();
      const branch = deployment.meta?.githubCommitRef ?? deployment.meta?.gitlabCommitRef ?? "unknown";
      const commitMessage = deployment.meta?.githubCommitMessage ?? deployment.meta?.githubCommitSubject ?? deployment.name ?? "Untitled deployment";
      const project = deployment.name ?? deployment.project?.name ?? "Unnamed project";
      const previewUrl = deployment.url ? `https://${deployment.url}` : undefined;

      return {
        id: deployment.uid ?? deployment.id ?? crypto.randomUUID(),
        provider: "vercel",
        project,
        repo: project,
        branch,
        commitMessage,
        status: normalized.status,
        statusLabel: normalized.status === "building" ? "Building..." : getRelativeTime(updatedAt),
        createdAt,
        updatedAt,
        creator: deployment.creator?.username ?? deployment.creator?.email ?? "Unknown",
        previewUrl,
        externalUrl: deployment.inspectorUrl ?? previewUrl ?? "https://vercel.com/dashboard"
      };
    });

    return {
      kind: "vercel",
      mode: "live",
      notice: teamId
        ? "Live Vercel deployments loaded from your configured team."
        : "Live Vercel deployments loaded from your personal account.",
      items
    };
  } catch (error) {
    const fallback = createMockSnapshot().providers.vercel;
    return {
      ...fallback,
      notice: `Vercel API failed, showing mock data instead. ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

function normalizeGitHubStatus(status: string | null, conclusion: string | null) {
  if (status === "in_progress" || status === "queued") {
    return { status: "running", label: "Running now" };
  }

  if (conclusion === "success") {
    return { status: "completed", label: "Succeeded" };
  }

  if (conclusion === "failure" || conclusion === "cancelled" || conclusion === "timed_out") {
    return { status: "error", label: "Failed" };
  }

  return { status: "unknown", label: "Unknown" };
}

async function getGitHubSnapshot(): Promise<ProviderSnapshot> {
  const token = process.env.GITHUB_TOKEN;
  const repos = process.env.GITHUB_REPOS?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];

  if (!token || repos.length === 0) {
    return createMockSnapshot().providers.github;
  }

  try {
    const results = await Promise.all(
      repos.map(async (repo) => {
        const [owner, name] = repo.split("/");
        const url = `https://api.github.com/repos/${owner}/${name}/actions/runs?per_page=5`;

        const payload = await fetchJson<{ workflow_runs: Array<Record<string, any>> }>(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "deplog-menubar",
            Accept: "application/vnd.github+json"
          }
        });

        return payload.workflow_runs.map((run) => {
          const normalized = normalizeGitHubStatus(run.status, run.conclusion);
          const updatedAt = run.updated_at ?? run.created_at ?? new Date().toISOString();
          return {
            id: String(run.id),
            provider: "github" as const,
            project: name,
            repo,
            branch: run.head_branch ?? "unknown",
            commitMessage: run.display_title ?? run.name ?? "Workflow run",
            status: normalized.status,
            statusLabel: normalized.status === "running" ? "Running now" : getRelativeTime(updatedAt),
            createdAt: run.created_at ?? new Date().toISOString(),
            updatedAt,
            creator: run.actor?.login ?? "Unknown",
            externalUrl: run.html_url ?? `https://github.com/${repo}/actions`,
            workflowName: run.name ?? "Workflow"
          } satisfies DeploymentItem;
        });
      })
    );

    return {
      kind: "github",
      mode: "live",
      notice: "Live GitHub Actions runs loaded from your configured repositories.",
      items: results.flat().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    };
  } catch (error) {
    const fallback = createMockSnapshot().providers.github;
    return {
      ...fallback,
      notice: `GitHub API failed, showing mock data instead. ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function refreshSnapshot() {
  const [vercel, github] = await Promise.all([getVercelSnapshot(), getGitHubSnapshot()]);
  snapshot = {
    updatedAt: new Date().toISOString(),
    providers: { vercel, github }
  };

  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("deplog:snapshot-updated", snapshot);
  });
}

function registerIpc() {
  ipcMain.handle("deplog:get-snapshot", async () => snapshot);
  ipcMain.handle("deplog:open-external", async (_event, url: string) => {
    await shell.openExternal(url);
  });
  ipcMain.handle("deplog:quit", async () => {
    app.quit();
  });
}

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

app.whenReady().then(async () => {
  createWindow();
  createTray();
  registerIpc();
  await refreshSnapshot();
  pollInterval = setInterval(() => {
    void refreshSnapshot();
  }, 30_000);
});

app.on("before-quit", () => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
