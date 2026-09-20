// Trustline browser extension — content script (prototype).
//
// Detects seller/host elements annotated with data-trustline-subject on
// supported pages, fetches each subject's *public* trust summary (only claims
// the subject chose to publish, re-verified against the ledger), and shows a
// small shield that expands into a panel. It never reads page content beyond
// those attributes and sends nothing about the viewer anywhere.
(() => {
  "use strict";

  const API_ORIGIN = window.location.origin;
  const cache = new Map();
  let root = null;
  let shadow = null;
  let lastKey = "";

  // Tell the page the real extension is present so its web preview steps aside.
  document.documentElement.dataset.trustlineExtension = "active";

  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
    .shield { display:flex; align-items:center; gap:8px; height:48px; padding:0 16px 0 6px; border-radius:999px;
      background:#fff; border:1px solid #e8e6e0; color:#16171a; cursor:pointer;
      box-shadow:0 24px 60px -20px rgba(22,23,26,.28),0 2px 8px rgba(22,23,26,.06);
      transform:translateY(12px) scale(.9); opacity:0; transition:transform .35s cubic-bezier(.22,1,.36,1), opacity .35s; }
    .shield.in { transform:none; opacity:1; }
    .mark { position:relative; width:36px; height:36px; border-radius:11px; background:#16171a; display:flex; align-items:center; justify-content:center; }
    .dot { position:absolute; top:-2px; right:-2px; width:12px; height:12px; border-radius:50%; border:2px solid #fff; }
    .label { font-size:13.5px; font-weight:600; }
    .panel { width:340px; max-width:calc(100vw - 24px); background:#fff; border:1px solid #e8e6e0; border-radius:22px; color:#16171a;
      box-shadow:0 24px 60px -20px rgba(22,23,26,.28),0 2px 8px rgba(22,23,26,.06);
      transform:translateX(24px); opacity:0; transition:transform .35s cubic-bezier(.22,1,.36,1), opacity .3s; }
    .panel.in { transform:none; opacity:1; }
    .head { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #e8e6e0; }
    .brand { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; }
    .close { width:36px; height:36px; border-radius:50%; border:0; background:transparent; cursor:pointer; font-size:18px; color:#6a6c73; }
    .close:hover { background:#f1f0eb; }
    .body { padding:18px 20px 20px; }
    .title { font-size:17px; font-weight:600; display:flex; align-items:center; gap:8px; margin:0; }
    .row { display:flex; justify-content:space-between; align-items:baseline; margin-top:10px; font-size:14px; color:#6a6c73; }
    .row b { font-size:20px; color:#16171a; font-variant-numeric:tabular-nums; }
    .ok { margin-top:14px; padding:8px 12px; border-radius:12px; background:#e7f3ec; color:#12774a; font-size:13px; font-weight:500; }
    .warn { margin-top:14px; padding:8px 12px; border-radius:12px; background:#fbf3e5; color:#95580b; font-size:12.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; }
    .note { margin-top:8px; font-size:12.5px; line-height:1.5; color:#6a6c73; }
    .host { margin-top:14px; padding-top:12px; border-top:1px solid #e8e6e0; }
    .host:first-child { margin-top:0; padding-top:0; border-top:0; }
    .btn { margin-top:16px; display:flex; align-items:center; justify-content:center; height:44px; border-radius:999px; border:1px solid #e8e6e0;
      font-size:14px; font-weight:500; color:#16171a; text-decoration:none; }
    .btn:hover { background:#f1f0eb; }
    .foot { margin-top:10px; text-align:center; font-size:11px; color:#9d9ea4; }
  `;

  const LOGO =
    '<svg width="22" height="22" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#16171a"/><circle cx="10" cy="16" r="3.2" fill="#fff"/><circle cx="22" cy="16" r="3.2" fill="#8d97ee"/><path d="M13.2 16h5.6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  async function fetchTrust(id) {
    if (!/^TL-[0-9A-F]{4}$/.test(id)) return null;
    if (!cache.has(id)) {
      cache.set(
        id,
        fetch(`${API_ORIGIN}/api/trust/${id}`, { credentials: "omit" })
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => (j && j.trust) || null)
          .catch(() => null),
      );
    }
    return cache.get(id);
  }

  function subjects() {
    const ids = new Set();
    document.querySelectorAll("[data-trustline-subject]").forEach((el) => {
      const id = el.getAttribute("data-trustline-subject");
      if (id) ids.add(id.toUpperCase());
    });
    return [...ids];
  }

  function hostBlock(t) {
    if (t.status === "VERIFIED") {
      const h = t.hosting;
      return `<div class="host">
        <p class="title">Seller verified <span style="color:#12774a">✓</span></p>
        ${h ? `<div class="row">Completed bookings <b>${escapeHtml(h.completedBookings)}</b></div>
        <div class="row">Completion <b>${escapeHtml(h.completionRate)}%</b></div>
        <div class="row">Cancellations <b>${escapeHtml(h.cancellations)}</b></div>` : ""}
        <div class="ok">✓ Credential verified</div>
        <a class="btn" href="${API_ORIGIN}/t/${escapeHtml(t.trustlineId)}" target="_blank" rel="noopener">View Trustline</a>
      </div>`;
    }
    return `<div class="host">
      <p class="title"><span style="color:#b7791f">⚠</span> Limited verification</p>
      <div class="row">Verified transaction history <b>0</b></div>
      <div class="row">Verified credentials <b>${escapeHtml(t.verifiedCredentials)}</b></div>
      <div class="warn">Limited verified history</div>
      <p class="note">Not an accusation — no platform has issued verified history for this account yet.</p>
      <a class="btn" href="${API_ORIGIN}/t/${escapeHtml(t.trustlineId)}" target="_blank" rel="noopener">View Trustline</a>
    </div>`;
  }

  function mount() {
    if (root) return;
    root = document.createElement("div");
    root.id = "trustline-extension-root";
    shadow = root.attachShadow({ mode: "closed" });
    document.documentElement.appendChild(root);
  }

  function unmount() {
    if (root) root.remove();
    root = null;
    shadow = null;
  }

  function renderShield(trusts) {
    const anyLimited = trusts.some((t) => t.status !== "VERIFIED");
    const single = trusts.length === 1;
    const label = single ? (anyLimited ? "Limited history" : "Seller verified") : `${trusts.length} sellers checked`;
    shadow.innerHTML = `<style>${STYLE}</style>
      <button class="shield" aria-label="Open Trustline">
        <span class="mark">${LOGO}<span class="dot" style="background:${anyLimited ? "#d99a2b" : "#12774a"}"></span></span>
        <span class="label">${escapeHtml(label)}</span>
      </button>`;
    const btn = shadow.querySelector(".shield");
    requestAnimationFrame(() => requestAnimationFrame(() => btn.classList.add("in")));
    btn.addEventListener("click", () => renderPanel(trusts));
  }

  function renderPanel(trusts) {
    shadow.innerHTML = `<style>${STYLE}</style>
      <aside class="panel" role="dialog" aria-label="Trustline">
        <div class="head"><span class="brand">${LOGO} Trustline</span><button class="close" aria-label="Close">×</button></div>
        <div class="body">${trusts.map(hostBlock).join("")}
          <p class="foot">Trustline extension · prototype · public claims only</p>
        </div>
      </aside>`;
    const panel = shadow.querySelector(".panel");
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add("in")));
    shadow.querySelector(".close").addEventListener("click", () => renderShield(trusts));
  }

  async function scan() {
    const ids = subjects();
    const key = ids.join(",") + location.pathname;
    if (key === lastKey) return;
    lastKey = key;
    if (ids.length === 0) return unmount();
    const trusts = (await Promise.all(ids.map(fetchTrust))).filter(Boolean);
    if (trusts.length === 0) return unmount();
    mount();
    // A short delay so the shield "arrives" after the page settles.
    setTimeout(() => renderShield(trusts), 600);
  }

  let timer = 0;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(scan, 250);
  }).observe(document.body, { childList: true, subtree: true });
  scan();
})();
