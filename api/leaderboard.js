// api/leaderboard.js — GET /api/leaderboard?gamemode=Sword&region=EU
// Reads ONLY the `profiles` table (the real ranking system). Strike/Defense
// data lives in a separate `strike_players` table the bot owns and is never
// exposed here. Also intentionally does not return discord_id/username —
// the site shows IGNs only.
const { sql, GAMEMODES, tierRank, cors } = require("./_lib");

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!sql) {
    return res.status(503).json({ error: "DATABASE_URL is not configured on this deployment." });
  }

  const gamemode = req.query.gamemode || "Sword";
  const region = req.query.region || null; // null = all regions
  if (!GAMEMODES.includes(gamemode)) {
    return res.status(400).json({ error: `Unknown gamemode "${gamemode}".` });
  }

  const tierCol = `${gamemode.toLowerCase()}_tier`;
  const peakCol = `${gamemode.toLowerCase()}_peak_tier`;

  const baseQuery = `
    SELECT p.mc_username, p.region, p.${tierCol} AS tier, p.${peakCol} AS peak_tier
    FROM profiles p
    WHERE p.${tierCol} IS NOT NULL
  `;

  try {
    const rows = region
      ? await sql(`${baseQuery} AND p.region = $1`, [region])
      : await sql(baseQuery);

    rows.sort((a, b) => tierRank(a.tier) - tierRank(b.tier));

    res.status(200).json({ gamemode, region, players: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load leaderboard." });
  }
};
