// api/export.js — GET /api/export?format=json|csv&gamemode=Sword (optional)
//
// Dumps the real ranking system (`profiles`, the same table the leaderboard
// reads) as a flat file. With no `gamemode`, every player's tier + peak tier
// across all three gamemodes comes back in one row per player. With a
// `gamemode`, only players ranked in that gamemode come back, one row each,
// with a plain `tier` / `peak_tier` pair instead of three prefixed sets.
//
// IGN-only, per the site's display rule: Discord identity is left out of
// the export entirely, not just hidden in the UI.
const { sql, GAMEMODES, cors } = require("./_lib");

function csvValue(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows, columns) {
  const header = columns.join(",");
  const lines = rows.map(r => columns.map(c => csvValue(r[c])).join(","));
  return [header, ...lines].join("\n");
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!sql) {
    return res.status(503).json({ error: "DATABASE_URL is not configured on this deployment." });
  }

  const format = (req.query.format || "json").toLowerCase();
  if (format !== "json" && format !== "csv") {
    return res.status(400).json({ error: `Unknown format "${format}". Use "json" or "csv".` });
  }
  const gamemode = req.query.gamemode || null;
  if (gamemode && !GAMEMODES.includes(gamemode)) {
    return res.status(400).json({ error: `Unknown gamemode "${gamemode}".` });
  }

  try {
    const rows = await sql`
      SELECT p.mc_username AS ign, p.mc_uuid AS uuid, p.region,
             p.sword_tier, p.sword_peak_tier,
             p.speed_tier, p.speed_peak_tier,
             p.stray_tier, p.stray_peak_tier
      FROM profiles p
      WHERE p.sword_tier IS NOT NULL OR p.speed_tier IS NOT NULL OR p.stray_tier IS NOT NULL
      ORDER BY p.mc_username NULLS LAST
    `;

    let players;
    if (gamemode) {
      const col = `${gamemode.toLowerCase()}_tier`;
      const peakCol = `${gamemode.toLowerCase()}_peak_tier`;
      players = rows
        .filter(r => r[col])
        .map(r => ({ ign: r.ign, uuid: r.uuid, region: r.region, gamemode, tier: r[col], peak_tier: r[peakCol] }));
    } else {
      players = rows;
    }

    if (format === "csv") {
      const columns = gamemode
        ? ["ign", "uuid", "region", "gamemode", "tier", "peak_tier"]
        : ["ign", "uuid", "region",
           "sword_tier", "sword_peak_tier", "speed_tier", "speed_peak_tier", "stray_tier", "stray_peak_tier"];
      const csv = toCsv(players, columns);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="meleetiers-export${gamemode ? "-" + gamemode.toLowerCase() : ""}.csv"`);
      return res.status(200).send(csv);
    }

    res.status(200).json({
      exported_at: new Date().toISOString(),
      gamemode: gamemode || "all",
      count: players.length,
      players,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to export player data." });
  }
};
