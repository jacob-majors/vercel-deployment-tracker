import { useEffect, useMemo, useState } from "react";
import type { AppSnapshot, DeploymentItem, ProviderKind } from "./shared/types";

const providerLabels: Record<ProviderKind, string> = {
  vercel: "Vercel",
  github: "GitHub"
};

function formatRelative(dateLike: string) {
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

function statusTone(status: string) {
  switch (status) {
    case "building":
    case "queued":
    case "running":
      return "status-dot status-warm";
    case "ready":
    case "completed":
      return "status-dot status-good";
    case "error":
      return "status-dot status-bad";
    default:
      return "status-dot status-muted";
  }
}

const emptySnapshot: AppSnapshot = {
  updatedAt: new Date().toISOString(),
  providers: {
    vercel: {
      kind: "vercel",
      mode: "mock",
      notice: "Loading Vercel deployments...",
      items: []
    },
    github: {
      kind: "github",
      mode: "mock",
      notice: "Loading GitHub workflow runs...",
      items: []
    }
  }
};

export default function App() {
  const [provider, setProvider] = useState<ProviderKind>("vercel");
  const [selected, setSelected] = useState<DeploymentItem | null>(null);
  const [snapshot, setSnapshot] = useState<AppSnapshot>(emptySnapshot);

  useEffect(() => {
    let mounted = true;

    void window.deplog.getSnapshot().then((nextSnapshot) => {
      if (mounted) {
        setSnapshot(nextSnapshot);
      }
    });

    const unsubscribe = window.deplog.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const items = snapshot.providers[provider].items;
    if (!selected) {
      return;
    }

    const nextSelected = items.find((item) => item.id === selected.id);
    if (!nextSelected) {
      setSelected(null);
    } else {
      setSelected(nextSelected);
    }
  }, [provider, selected, snapshot]);

  const providerSnapshot = snapshot.providers[provider];
  const items = useMemo(
    () => [...providerSnapshot.items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [providerSnapshot.items]
  );

  return (
    <main className="shell">
      <section className="panel">
        <div className="topbar">
          <div className="topbar-left">
            {selected ? (
              <button className="ghost-button" onClick={() => setSelected(null)}>
                <span className="back-icon">‹</span>
                Back
              </button>
            ) : null}
            <div className="segmented">
              {(["vercel", "github"] as ProviderKind[]).map((kind) => (
                <button
                  key={kind}
                  className={kind === provider ? "segment active" : "segment"}
                  onClick={() => {
                    setProvider(kind);
                    setSelected(null);
                  }}
                >
                  {providerLabels[kind]}
                </button>
              ))}
            </div>
          </div>
          <button className="ghost-button quit-button" onClick={() => void window.deplog.quit()}>
            <span className="power-icon">◔</span>
            Quit
          </button>
        </div>

        {selected ? (
          <DetailView item={selected} providerNotice={providerSnapshot.notice} onOpen={() => selected.externalUrl && window.deplog.openExternal(selected.externalUrl)} />
        ) : (
          <>
            <div className="header-row">
              <div>
                <p className="eyebrow">Monitor GitHub and Vercel on your Mac</p>
                <h1>Deployments</h1>
              </div>
              <button className="menu-label" onClick={() => window.deplog.openExternal(provider === "vercel" ? "https://vercel.com/dashboard" : "https://github.com/actions")}>
                Menu
                <span>⌄</span>
              </button>
            </div>

            <div className="notice-bar">
              <span className={providerSnapshot.mode === "live" ? "mode-pill live" : "mode-pill mock"}>
                {providerSnapshot.mode === "live" ? "Live" : "Mock"}
              </span>
              <p>{providerSnapshot.notice}</p>
            </div>

            <div className="list">
              {items.map((item) => (
                <button key={item.id} className="card" onClick={() => setSelected(item)}>
                  <div className="card-main">
                    <div className={statusTone(item.status)} />
                    <div className="card-copy">
                      <div className="card-title-row">
                        <h2>{item.commitMessage}</h2>
                        <div className="branch-pill">
                          <span className="branch-icon">⑂</span>
                          {item.branch}
                        </div>
                      </div>
                      <div className="card-meta-row">
                        <p>{item.project}</p>
                        <p>{item.status === "building" || item.status === "running" ? item.statusLabel : formatRelative(item.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {items.length === 0 ? (
                <div className="empty-state">
                  <h2>No items yet</h2>
                  <p>Add your API tokens in `.env` to load live deployment and workflow activity here.</p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function DetailView({
  item,
  providerNotice,
  onOpen
}: {
  item: DeploymentItem;
  providerNotice: string;
  onOpen: () => void;
}) {
  return (
    <section className="detail">
      <div className="detail-status">
        <div className={statusTone(item.status)} />
        <h1>{item.statusLabel}</h1>
      </div>

      <div className="detail-grid">
        <DetailField label="Name" value={item.project} />
        <DetailField
          label={item.provider === "vercel" ? "Preview URL" : "Workflow"}
          value={item.provider === "vercel" ? item.previewUrl ?? "Unavailable" : item.workflowName ?? "Workflow"}
          isLink={Boolean(item.provider === "vercel" ? item.previewUrl : item.externalUrl)}
          onClick={() => void window.deplog.openExternal(item.provider === "vercel" ? item.previewUrl ?? item.externalUrl ?? "https://vercel.com" : item.externalUrl ?? "https://github.com")}
        />
        <DetailField label="Git Branch" value={item.branch} />
        <DetailField label="Commit Message" value={item.commitMessage} />
        <hr />
        <DetailField label="Created" value={formatRelative(item.createdAt)} />
        <DetailField label="Creator" value={item.creator} />
        <DetailField label="Source" value={providerNotice} />
      </div>

      <button className="primary-button" onClick={onOpen}>
        {item.provider === "vercel" ? "Inspect on Vercel" : "Open on GitHub"}
      </button>
    </section>
  );
}

function DetailField({
  label,
  value,
  isLink = false,
  onClick
}: {
  label: string;
  value: string;
  isLink?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      {isLink && onClick ? (
        <button className="linkish" onClick={onClick}>
          {value}
        </button>
      ) : (
        <strong>{value}</strong>
      )}
    </div>
  );
}
