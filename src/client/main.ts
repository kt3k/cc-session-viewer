// cc-session-viewer frontend
// Minimal SPA: list screen at /, detail screen at /sessions/:id

import { type Context, mount, register } from "@kt3k/cell";
import type { ProjectInfo, SessionDetail, SessionMeta } from "../types.ts";

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

async function renderList(el: HTMLElement) {
  el.innerHTML = `<div class="loading">Loading...</div>`;
  try {
    const [projects, sessions] = await Promise.all([
      fetchJSON<ProjectInfo[]>("/api/projects"),
      fetchJSON<SessionMeta[]>("/api/sessions"),
    ]);
    el.innerHTML = `
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
    el.innerHTML = `<div class="error">Failed to load: ${
      escapeHtml(errorMessage(err))
    }</div>`;
  }
}

async function renderDetail(el: HTMLElement, sessionId: string) {
  el.innerHTML = `<div class="loading">Loading...</div>`;
  try {
    const detail = await fetchJSON<SessionDetail>(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
    );
    const m = detail.meta ?? ({} as Partial<SessionMeta>);
    el.innerHTML = `
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
    el.innerHTML = `<div class="error">Failed to load session: ${
      escapeHtml(errorMessage(err))
    }</div>`;
  }
}

function render(el: HTMLElement) {
  const pathname = location.pathname;
  if (pathname === "/" || pathname === "") {
    renderList(el);
    return;
  }
  const m = pathname.match(/^\/sessions\/([^/]+)$/);
  if (m) {
    renderDetail(el, decodeURIComponent(m[1]));
    return;
  }
  el.innerHTML = `<div class="error">404 Not Found</div>`;
}

function navigate(el: HTMLElement, href: string) {
  if (href === location.pathname) return;
  history.pushState({}, "", href);
  render(el);
}

function App({ el }: Context) {
  document.addEventListener("click", (e) => {
    const target = e.target as Element | null;
    const a = target?.closest<HTMLAnchorElement>("a[data-link]");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("http")) return;
    e.preventDefault();
    navigate(el, href);
  });

  globalThis.addEventListener("popstate", () => render(el));

  render(el);
}

register(App, "app");
mount();
