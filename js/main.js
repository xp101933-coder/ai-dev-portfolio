import { PROJECTS, CATEGORY_LABELS } from "./data.js";
function escapeHtml(raw) {
    return raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
const ALLOWED_URL_SCHEMES = /^https?:\/\//i;
function sanitizeUrl(url) {
    return ALLOWED_URL_SCHEMES.test(url) ? url : "#";
}
function getEl(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`#${id} not found`);
    return el;
}
function buildTagsHtml(tags) {
    return tags.map(t => `<li class="tag">${escapeHtml(t)}</li>`).join("");
}
function buildCardHtml(p) {
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
function attachCardListeners(grid) {
    grid.querySelectorAll(".card").forEach(card => {
        const raw = card.dataset["id"];
        const id = raw !== undefined ? parseInt(raw, 10) : NaN;
        if (Number.isNaN(id))
            return;
        card.addEventListener("click", () => openModal(id));
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openModal(id);
            }
        });
    });
}
function animateCards(grid) {
    grid.querySelectorAll(".card").forEach((card, i) => {
        card.classList.remove("card--visible");
        card.style.transitionDelay = `${i * 40}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("card--visible")));
    });
}
export function renderCards(filter) {
    const grid = getEl("projects-grid");
    const list = filter === "all"
        ? PROJECTS
        : PROJECTS.filter(p => p.category === filter);
    grid.innerHTML = list.map(buildCardHtml).join("");
    attachCardListeners(grid);
    animateCards(grid);
}
export function initFilters() {
    const nav = getEl("filter-nav");
    let current = "all";
    Object.keys(CATEGORY_LABELS).forEach(key => {
        const btn = document.createElement("button");
        btn.className = "filter-btn" + (key === "all" ? " filter-btn--active" : "");
        btn.dataset["filter"] = key;
        btn.textContent = CATEGORY_LABELS[key];
        btn.addEventListener("click", () => {
            if (current === key)
                return;
            current = key;
            nav.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("filter-btn--active"));
            btn.classList.add("filter-btn--active");
            renderCards(key);
        });
        nav.appendChild(btn);
    });
}
function populateModal(p) {
    getEl("modal-img").src = p.image;
    getEl("modal-img").alt = p.title;
    getEl("modal-emoji").textContent = p.emoji;
    getEl("modal-title").textContent = p.title;
    const catEl = getEl("modal-cat");
    catEl.textContent = CATEGORY_LABELS[p.category];
    catEl.className = `modal__cat cat--${p.category}`;
    getEl("modal-description").textContent = p.description;
    getEl("modal-tags").innerHTML = buildTagsHtml(p.tags);
    populateModalLinks(p);
}
function populateModalLinks(p) {
    const linksEl = getEl("modal-links");
    linksEl.innerHTML = "";
    const defs = [
        { url: p.links.github, label: "GitHub", cls: "modal__link--github" },
        { url: p.links.x, label: "X (Twitter)", cls: "modal__link--x" },
    ];
    defs.filter(d => d.url).forEach(({ url, label, cls }) => {
        const a = document.createElement("a");
        a.href = sanitizeUrl(url);
        a.className = `modal__link ${cls}`;
        a.textContent = label;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        linksEl.appendChild(a);
    });
}
function trapFocus(e) {
    if (e.key !== "Tab")
        return;
    const modal = getEl("modal");
    const focusable = Array.from(modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !("disabled" in el && el.disabled));
    if (!focusable.length)
        return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
        if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
        }
    }
    else {
        if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
}
let lastFocusedEl = null;
function openModal(id) {
    const p = PROJECTS.find(x => x.id === id);
    if (!p)
        return;
    lastFocusedEl = document.activeElement;
    populateModal(p);
    const modal = getEl("modal");
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.removeEventListener("keydown", trapFocus);
    document.addEventListener("keydown", trapFocus);
    getEl("modal-close").focus();
}
function closeModal() {
    const modal = getEl("modal");
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", trapFocus);
    lastFocusedEl === null || lastFocusedEl === void 0 ? void 0 : lastFocusedEl.focus();
    lastFocusedEl = null;
}
export function initModal() {
    getEl("modal-close").addEventListener("click", closeModal);
    getEl("modal").addEventListener("click", (e) => {
        if (e.target === e.currentTarget)
            closeModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !getEl("modal").hasAttribute("hidden"))
            closeModal();
    });
}
document.addEventListener("DOMContentLoaded", () => {
    initFilters();
    initModal();
    renderCards("all");
    const yearEl = document.getElementById("footer-year");
    if (yearEl)
        yearEl.textContent = String(new Date().getFullYear());
});
