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
function tierBadge(tier, size = 20) {
  const icon = tierIconUrl(tier);
  if (tier === "Retired") return `<span style="font-size:${size}px">🛡️</span>`;
  if (icon) return `<img src="${icon}" width="${size}" height="${size}" alt="${tier}">`;
  return `<span>${tier || "Unranked"}</span>`;
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

async function load() {
  const board = document.getElementById("board");
  const spotlight = document.getElementById("spotlight");
  const empty = document.getElementById("empty-state");

  const params = new URLSearchParams({ gamemode: state.gamemode });
  if (state.region) params.set("region", state.region);

  let data;
  try {
    const res = await fetch(`/api/leaderboard?${params}`);
    data = await res.json();
  } catch (e) {
    board.innerHTML = "";
    spotlight.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "Couldn't reach the leaderboard API. Is DATABASE_URL set on this deployment?";
    return;
  }

  const players = data.players || [];
  if (players.length === 0) {
    board.innerHTML = "";
    spotlight.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "No ranked players yet for this gamemode / region. Once the bot posts a result, they'll show up here.";
    return;
  }
  empty.hidden = true;

  // Spotlight = #1 player (excluding Retired)
  const top = players.find(p => p.tier !== "Retired");
  spotlight.innerHTML = top ? `
    <div class="spotlight-card">
      <img class="avatar" src="${top.avatar_url || fallbackAvatar(top.username)}" alt="">
      <div>
        <p class="spotlight-label">Top ${state.gamemode}${state.region ? " · " + state.region : ""}</p>
        <p class="spotlight-name">${escapeHtml(top.mc_username || top.username)}</p>
        <p class="spotlight-sub">${escapeHtml(top.username)} · ${top.region || "—"}</p>
      </div>
      <div class="spotlight-tier">
        ${tierBadge(top.tier, 30)}
        <span>${top.tier}</span>
      </div>
    </div>` : "";

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
    const rows = list.map(p => {
      const r = tier === "Retired" ? "—" : rank++;
      return `
        <div class="row" data-id="${p.discord_id}">
          <span class="rank">${r}</span>
          <img class="avatar" src="${p.avatar_url || fallbackAvatar(p.username)}" alt="">
          <span><span class="ign">${escapeHtml(p.mc_username || "—")}</span><span class="discord-name">${escapeHtml(p.username)}</span></span>
          <span class="region-tag">${p.region || "—"}</span>
          <span class="score strike">⚔ ${p.strike ?? 0}</span>
          <span class="score">🛡 ${p.defense ?? 0}</span>
        </div>`;
    }).join("");

    return `
      <div class="tier-group">
        <div class="tier-divider">
          ${tierBadge(tier, 20)}
          <span class="tier-name">${tier}</span>
          <span class="tier-count">${list.length}</span>
        </div>
        ${rows}
      </div>`;
  }).join("");

  board.querySelectorAll(".row").forEach(row => {
    row.addEventListener("click", () => openProfile(row.dataset.id));
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
      <img class="p-avatar" src="${p.avatar_url || fallbackAvatar(p.username)}" alt="">
      <div>
        <p class="p-name">${escapeHtml(p.mc_username || p.username)}</p>
        <p class="p-sub">${escapeHtml(p.username)} · ${p.region || "—"}</p>
      </div>
      <button class="p-close" aria-label="Close">×</button>
    </div>
    ${gamemodes.map(gm => {
      const tier = p[`${gm.key}_tier`] || "Unranked";
      const strike = p[`${gm.key}_strike`] ?? 0;
      const defense = p[`${gm.key}_defense`] ?? 0;
      return `
        <div class="p-gamemode-row">
          <img class="gm-icon" src="https://cdn.discordapp.com/emojis/${gm.icon}.png?size=48" alt="">
          <span class="gm-name">${gm.label}</span>
          <span class="gm-tier">${tierBadge(tier, 18)} ${tier}</span>
          <div class="p-bars">
            <div class="p-bar-track"><div class="p-bar-fill strike" style="width:${Math.min(100, strike / 20 * 100)}%"></div></div>
            <div class="p-bar-track"><div class="p-bar-fill defense" style="width:${Math.min(100, defense / 20 * 100)}%"></div></div>
          </div>
        </div>`;
    }).join("")}
  `;

  card.querySelector(".p-close").addEventListener("click", () => { overlay.hidden = true; });
}

document.getElementById("profile-overlay").addEventListener("click", e => {
  if (e.target.id === "profile-overlay") e.target.hidden = true;
});

function fallbackAvatar(seed) {
  const hue = [...(seed || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' rx='9' fill='hsl(${hue},40%25,22%25)'/></svg>`)}`;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

load();
