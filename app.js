const EMOJI = {
  Sword: "1546582682966822974", Speed: "1546582719725568241", Stray: "1551737033607880774",
  LT3: "1520918543959461980", HT3: "1520918576469643296", LT2: "1520918614918565958",
  MT2: "1546581978688651274", HT2: "1527083538522964068", LT1: "1527083571750371348",
  MT1: "1546579794865426532", HT1: "1527083599889830048",
};
const TIER_ORDER = ["HT1","MT1","LT1","HT2","MT2","LT2","HT3","LT3","HT4","LT4","HT5","LT5","Unranked"];

function tierIconUrl(tier) {
  const id = EMOJI[tier];
  return id ? `https://cdn.discordapp.com/emojis/${id}.png?size=48` : null;
}
function tierBadge(tier, size = 20, peakTier = null) {
  const icon = tierIconUrl(tier);
  // "Peak tiers show up if you hover over the tier" — native title tooltip.
  const title = peakTier && peakTier !== tier ? ` title="Peak: ${peakTier}"` : "";
  if (tier === "Retired") return `<span class="emoji-fallback" style="font-size:${size}px"${title}>🛡️</span>`;
  if (icon) return `<img src="${icon}" width="${size}" height="${size}" alt="${tier}"${title}>`;
  return `<span class="emoji-fallback"${title}>${tier || "Unranked"}</span>`;
}

// Rank position encodes prestige visually — HT1 glows brightest gold, LT5
// barely at all, Retired reads violet, Unranked is flat and quiet.
function tierStyle(tier) {
  if (tier === "Retired") return { color: "var(--violet)", glow: 0.75 };
  const rankedTiers = TIER_ORDER.slice(0, -1); // exclude "Unranked"
  const i = rankedTiers.indexOf(tier);
  if (i === -1) return { color: "var(--muted-dim)", glow: 0 };
  const glow = Math.max(0.32, 1 - i * 0.06);
  return { color: "var(--gold)", glow };
}

let state = { gamemode: "Sword", region: "" };

document.getElementById("gamemode-tabs").addEventListener("click", e => {
  const btn = e.target.closest(".gm-tab");
  if (!btn) return;
  document.querySelectorAll(".gm-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  state.gamemode = btn.dataset.gamemode;
  load();
});

document.getElementById("region-pills").addEventListener("click", e => {
  const btn = e.target.closest(".region-pill");
  if (!btn) return;
  document.querySelectorAll(".region-pill").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  state.region = btn.dataset.region;
  load();
});

// ── Theme toggle ────────────────────────────────────────────────────────────
const THEME_KEY = "meleetiers-theme";
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "classic") root.setAttribute("data-theme", "classic");
  else root.removeAttribute("data-theme");
  document.getElementById("theme-toggle").textContent = theme === "classic" ? "Dark" : "Classic";
}
(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (_) {}
  applyTheme(saved === "classic" ? "classic" : "dark");
})();
document.getElementById("theme-toggle").addEventListener("click", () => {
  const isClassic = document.documentElement.getAttribute("data-theme") === "classic";
  const next = isClassic ? "dark" : "classic";
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
});

// ── Export menu ─────────────────────────────────────────────────────────────
const exportToggle = document.getElementById("export-toggle");
const exportMenu = document.getElementById("export-menu");
exportToggle.addEventListener("click", e => {
  e.stopPropagation();
  const open = !exportMenu.hidden;
  exportMenu.hidden = open;
  exportToggle.setAttribute("aria-expanded", String(!open));
});
document.addEventListener("click", () => { exportMenu.hidden = true; exportToggle.setAttribute("aria-expanded", "false"); });
function exportUrl(format) {
  const params = new URLSearchParams({ format, gamemode: state.gamemode });
  return `/api/export?${params}`;
}
document.getElementById("export-csv").addEventListener("click", e => { e.preventDefault(); window.location.href = exportUrl("csv"); });
document.getElementById("export-json").addEventListener("click", e => { e.preventDefault(); window.location.href = exportUrl("json"); });

// ── Leaderboard ─────────────────────────────────────────────────────────────
async function load() {
  const board = document.getElementById("board");
  const hero = document.getElementById("spotlight");
  const meta = document.getElementById("board-meta");
  const empty = document.getElementById("empty-state");

  const params = new URLSearchParams({ gamemode: state.gamemode });
  if (state.region) params.set("region", state.region);

  let data;
  try {
    const res = await fetch(`/api/leaderboard?${params}`);
    data = await res.json();
  } catch (e) {
    board.innerHTML = ""; hero.innerHTML = ""; meta.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "Couldn't reach the leaderboard API. Is DATABASE_URL set on this deployment?";
    return;
  }

  const players = data.players || [];
  if (players.length === 0) {
    board.innerHTML = ""; hero.innerHTML = ""; meta.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "No ranked players yet for this gamemode / region. Once the bot posts a result, they'll show up here.";
    return;
  }
  empty.hidden = true;

  // Hero = #1 player (excluding Retired)
  const top = players.find(p => p.tier !== "Retired");
  hero.innerHTML = top ? `
    <div class="hero-card">
      <img class="avatar" src="${mcAvatarUrl(top.mc_username) || fallbackAvatar(top.username)}" alt="" onerror="this.src='${fallbackAvatar(top.username)}'">
      <div class="hero-text">
        <p class="hero-label">Top ${state.gamemode}${state.region ? " — " + state.region : ""}</p>
        <p class="hero-name">${escapeHtml(top.mc_username || "Unverified")}</p>
        <p class="hero-sub">${top.region || "—"}</p>
      </div>
      <div class="hero-tier">
        ${tierBadge(top.tier, 32, top.peak_tier)}
        <span>${top.tier}</span>
      </div>
    </div>` : "";

  const high3Plus = players.filter(p => {
    const i = TIER_ORDER.indexOf(p.tier);
    return p.tier === "Retired" || (i !== -1 && i <= TIER_ORDER.indexOf("HT3"));
  }).length;
  meta.innerHTML = `<span><strong>${players.length}</strong> ranked</span><span>·</span><span><strong>${high3Plus}</strong> HT3 or better</span>`;

  // Group by tier, in TIER_ORDER, Retired last
  const groups = new Map();
  for (const p of players) {
    const key = p.tier || "Unranked";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const orderedKeys = [...TIER_ORDER.filter(t => groups.has(t)), ...(groups.has("Retired") ? ["Retired"] : [])];

  let rank = 1;
  board.innerHTML = orderedKeys.map(tier => {
    const list = groups.get(tier);
    const { color, glow } = tierStyle(tier);
    const rows = list.map(p => {
      const r = tier === "Retired" ? "—" : rank++;
      const peakNote = p.peak_tier && p.peak_tier !== p.tier ? `<span class="peak-tag" title="Peak tier">Peak: ${p.peak_tier}</span>` : "";
      return `
        <div class="row" data-id="${p.discord_id}" tabindex="0" role="button">
          <span class="rank">${r}</span>
          <img class="avatar" src="${mcAvatarUrl(p.mc_username)}" alt="" onerror="this.style.visibility='hidden'">
          <span class="ign">${escapeHtml(p.mc_username || "Unverified")}</span>
          ${peakNote}
          <span class="region-tag">${p.region || "—"}</span>
        </div>`;
    }).join("");

    return `
      <div class="tier-group">
        <div class="tier-divider" style="--tier-color:${color}; --tier-glow:${glow}">
          ${tierBadge(tier, 20)}
          <span class="tier-name">${tier}</span>
          <span class="tier-count">${list.length}</span>
        </div>
        ${rows}
      </div>`;
  }).join("");

  board.querySelectorAll(".row").forEach(row => {
    row.addEventListener("click", () => openProfile(row.dataset.id));
    row.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProfile(row.dataset.id); } });
  });
}

async function openProfile(discordId) {
  const overlay = document.getElementById("profile-overlay");
  const card = document.getElementById("profile-card");
  overlay.hidden = false;
  card.innerHTML = `<p style="color:var(--muted)">Loading…</p>`;

  let p;
  try {
    const res = await fetch(`/api/profile?id=${discordId}`);
    p = await res.json();
  } catch (e) {
    card.innerHTML = `<p style="color:var(--muted)">Couldn't load this profile.</p>`;
    return;
  }
  if (p.error) {
    card.innerHTML = `<p style="color:var(--muted)">${escapeHtml(p.error)}</p>`;
    return;
  }

  const gamemodes = [
    { key: "sword", label: "Sword", icon: EMOJI.Sword },
    { key: "speed", label: "Speed", icon: EMOJI.Speed },
    { key: "stray", label: "Stray", icon: EMOJI.Stray },
  ];

  card.innerHTML = `
    <div class="p-head">
      <img class="p-avatar" src="${mcAvatarUrl(p.mc_username) || fallbackAvatar(p.username)}" alt="" onerror="this.src='${fallbackAvatar(p.username)}'">
      <div>
        <p class="p-name">${escapeHtml(p.mc_username || "Unverified")}</p>
        <p class="p-sub">${p.region || "—"}</p>
      </div>
      <button class="p-close" aria-label="Close">×</button>
    </div>
    ${gamemodes.map(gm => {
      const tier = p[`${gm.key}_tier`];
      const peakTier = p[`${gm.key}_peak_tier`];
      const hasTier = !!tier;
      return `
        <div class="p-gamemode-row${hasTier ? "" : " is-empty"}">
          <img class="gm-icon" src="https://cdn.discordapp.com/emojis/${gm.icon}.png?size=48" alt="">
          <span class="gm-name">${gm.label}</span>
          <span class="gm-tier">${tierBadge(tier || "Unranked", 18, peakTier)} ${tier || "Unranked"}</span>
        </div>`;
    }).join("")}
  `;

  card.querySelector(".p-close").addEventListener("click", () => { overlay.hidden = true; });
}

document.getElementById("profile-overlay").addEventListener("click", e => {
  if (e.target.id === "profile-overlay") e.target.hidden = true;
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") document.getElementById("profile-overlay").hidden = true;
});

function mcAvatarUrl(mcUsername) {
  return mcUsername ? `https://mc-heads.net/avatar/${encodeURIComponent(mcUsername)}/40` : fallbackAvatar(mcUsername || "?");
}
function fallbackAvatar(seed) {
  const hue = [...(seed || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' rx='9' fill='hsl(${hue},40%25,22%25)'/></svg>`)}`;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

load();
