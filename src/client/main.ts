// cc-session-viewer frontend
// Minimal SPA: list screen at /, detail screen at /sessions/:id

import type { ProjectInfo, SessionDetail, SessionMeta } from "../types.ts";

const app = document.getElementById("app");
if (!app) throw new Error("#app element not found");

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

function escapeHtml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function renderLoading() {
  app!.innerHTML = `<div class="loading">Loading...</div>`;
}

function renderError(msg: string) {
  app!.innerHTML = `<div class="error">${escapeHtml(msg)}</div>`;
}

// --- List screen (placeholder — to be filled in 5.3) ---
async function renderList() {
  renderLoading();
  try {
    const [projects, sessions] = await Promise.all([
      fetchJSON<ProjectInfo[]>("/api/projects"),
      fetchJSON<SessionMeta[]>("/api/sessions"),
    ]);
    app!.innerHTML = `
      <div class="list-layout">
        <aside class="sidebar">
          <h3>Projects (${projects.length})</h3>
        </aside>
        <section class="session-list">
          <div class="session-list-header">
            <h2>Sessions (${sessions.length})</h2>
          </div>
          <div class="empty-state">List UI coming in step 5.3</div>
        </section>
      </div>
    `;
  } catch (err) {
    renderError(`Failed to load: ${errorMessage(err)}`);
  }
}

// --- Detail screen (placeholder — to be filled in 5.4–5.8) ---
async function renderDetail(sessionId: string) {
  renderLoading();
  try {
    const detail = await fetchJSON<SessionDetail>(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
    );
    const m = detail.meta ?? ({} as Partial<SessionMeta>);
    app!.innerHTML = `
      <div class="detail-layout">
        <div class="detail-header">
          <h1>${escapeHtml(m.sessionId ?? sessionId)}</h1>
          <div class="detail-header-meta">
            ${m.cwd ? `<span>${escapeHtml(m.cwd)}</span>` : ""}
            ${
      m.gitBranch
        ? `<span class="branch">${escapeHtml(m.gitBranch)}</span>`
        : ""
    }
            <span>${detail.events?.length ?? 0} events</span>
          </div>
        </div>
        <div class="empty-state">Timeline UI coming in step 5.4</div>
      </div>
    `;
  } catch (err) {
    renderError(`Failed to load session: ${errorMessage(err)}`);
  }
}

// --- Router ---
type Route =
  | { name: "list" }
  | { name: "detail"; sessionId: string }
  | { name: "notfound" };

function matchRoute(pathname: string): Route {
  if (pathname === "/" || pathname === "") {
    return { name: "list" };
  }
  const m = pathname.match(/^\/sessions\/([^/]+)$/);
  if (m) {
    return { name: "detail", sessionId: decodeURIComponent(m[1]) };
  }
  return { name: "notfound" };
}

function render() {
  const route = matchRoute(location.pathname);
  if (route.name === "list") {
    renderList();
  } else if (route.name === "detail") {
    renderDetail(route.sessionId);
  } else {
    app!.innerHTML = `<div class="error">404 Not Found</div>`;
  }
}

function navigate(href: string) {
  if (href === location.pathname) return;
  history.pushState({}, "", href);
  render();
}

// Intercept clicks on internal links with [data-link]
document.addEventListener("click", (e: MouseEvent) => {
  const target = e.target as Element | null;
  const a = target?.closest<HTMLAnchorElement>("a[data-link]");
  if (!a) return;
  const href = a.getAttribute("href");
  if (!href || href.startsWith("http")) return;
  e.preventDefault();
  navigate(href);
});

globalThis.addEventListener("popstate", render);

// Initial render
render();
