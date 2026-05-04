import { PROJECTS, CATEGORY_LABELS } from "./data.js";
import type { Project, FilterKey } from "./types.js";

// ── Security ──────────────────────────────────────────────
function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const ALLOWED_URL_SCHEMES = /^https?:\/\//i;

function sanitizeUrl(url: string): string {
  return ALLOWED_URL_SCHEMES.test(url) ? url : "#";
}

// ── DOM helpers ───────────────────────────────────────────
function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id) as T | null;
  if (!el) throw new Error(`#${id} not found`);
  return el;
}

// ── Card rendering ─────────────────────────────────────────
function buildTagsHtml(tags: readonly string[]): string {
  return tags.map(t => `<li class="tag">${escapeHtml(t)}</li>`).join("");
}

function buildCardHtml(p: Project): string {
  const label = escapeHtml(CATEGORY_LABELS[p.category]);
  return `
    <article class="card" data-id="${p.id}" tabindex="0" role="listitem"
             aria-label="${escapeHtml(p.title)}の詳細を見る">
      <div class="card__img-wrap">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}"
             loading="lazy" width="400" height="300" decoding="async"/>
        <span class="card__cat cat--${escapeHtml(p.category)}">${label}</span>
      </div>
      <div class="card__body">
        <h3 class="card__title">${escapeHtml(p.emoji)} ${escapeHtml(p.title)}</h3>
        <p class="card__summary">${escapeHtml(p.summary)}</p>
        <ul class="card__tags" aria-label="技術タグ">${buildTagsHtml(p.tags)}</ul>
      </div>
    </article>`;
}

function attachCardListeners(grid: HTMLElement): void {
  grid.querySelectorAll<HTMLElement>(".card").forEach(card => {
    const raw = card.dataset["id"];
    const id  = raw !== undefined ? parseInt(raw, 10) : NaN;
    if (Number.isNaN(id)) return;
    card.addEventListener("click", () => openModal(id));
    card.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(id);
      }
    });
  });
}

function animateCards(grid: HTMLElement): void {
  grid.querySelectorAll<HTMLElement>(".card").forEach((card, i) => {
    card.classList.remove("card--visible");
    card.style.transitionDelay = `${i * 40}ms`;
    // ダブルrAFでリフロー後に確実にアニメーション開始させる
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("card--visible")));
  });
}

export function renderCards(filter: FilterKey): void {
  const grid = getEl<HTMLDivElement>("projects-grid");
  const list = filter === "all"
    ? PROJECTS
    : PROJECTS.filter(p => p.category === filter);

  grid.innerHTML = list.map(buildCardHtml).join("");
  attachCardListeners(grid);
  animateCards(grid);
}

// ── Filter ─────────────────────────────────────────────────
export function initFilters(): void {
  const nav = getEl<HTMLElement>("filter-nav");
  let current: FilterKey = "all";

  (Object.keys(CATEGORY_LABELS) as FilterKey[]).forEach(key => {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (key === "all" ? " filter-btn--active" : "");
    btn.dataset["filter"] = key;
    btn.textContent = CATEGORY_LABELS[key];
    btn.addEventListener("click", () => {
      if (current === key) return;
      current = key;
      nav.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("filter-btn--active"));
      btn.classList.add("filter-btn--active");
      renderCards(key);
    });
    nav.appendChild(btn);
  });
}

// ── Modal ──────────────────────────────────────────────────
function populateModal(p: Project): void {
  getEl<HTMLImageElement>("modal-img").src = p.image;
  getEl<HTMLImageElement>("modal-img").alt = p.title;
  getEl<HTMLElement>("modal-emoji").textContent = p.emoji;
  getEl<HTMLElement>("modal-title").textContent = p.title;

  const catEl = getEl<HTMLElement>("modal-cat");
  catEl.textContent = CATEGORY_LABELS[p.category];
  catEl.className = `modal__cat cat--${p.category}`;

  getEl<HTMLElement>("modal-description").textContent = p.description;
  getEl<HTMLElement>("modal-tags").innerHTML = buildTagsHtml(p.tags);
  populateModalLinks(p);
}

function populateModalLinks(p: Project): void {
  const linksEl = getEl<HTMLElement>("modal-links");
  linksEl.innerHTML = "";

  const defs: Array<{ url: string; label: string; cls: string }> = [
    { url: p.links.github, label: "GitHub",     cls: "modal__link--github" },
    { url: p.links.x,      label: "X (Twitter)", cls: "modal__link--x"      },
  ];

  defs.filter(d => d.url).forEach(({ url, label, cls }) => {
    const a = document.createElement("a");
    a.href       = sanitizeUrl(url);   // javascript: URLを排除
    a.className  = `modal__link ${cls}`;
    a.textContent = label;
    a.target     = "_blank";
    a.rel        = "noopener noreferrer";
    linksEl.appendChild(a);
  });
}

function trapFocus(e: KeyboardEvent): void {
  if (e.key !== "Tab") return;
  const modal = getEl<HTMLElement>("modal");
  const focusable = Array.from(
    modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => !("disabled" in el && (el as HTMLButtonElement).disabled));

  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
  }
}

let lastFocusedEl: HTMLElement | null = null;

function openModal(id: number): void {
  const p = PROJECTS.find(x => x.id === id);
  if (!p) return;

  lastFocusedEl = document.activeElement as HTMLElement;
  populateModal(p);

  const modal = getEl<HTMLElement>("modal");
  modal.removeAttribute("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  // 重複登録を防ぐため先に除去してから登録
  document.removeEventListener("keydown", trapFocus);
  document.addEventListener("keydown", trapFocus);
  getEl<HTMLButtonElement>("modal-close").focus();
}

function closeModal(): void {
  const modal = getEl<HTMLElement>("modal");
  modal.setAttribute("hidden", "");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  document.removeEventListener("keydown", trapFocus);
  // モーダルを開いた要素にフォーカスを戻す
  lastFocusedEl?.focus();
  lastFocusedEl = null;
}

export function initModal(): void {
  getEl<HTMLButtonElement>("modal-close").addEventListener("click", closeModal);

  getEl<HTMLElement>("modal").addEventListener("click", (e: MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && !getEl("modal").hasAttribute("hidden")) closeModal();
  });
}

// ── Entry point ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initFilters();
  initModal();
  renderCards("all");

  const yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
});
