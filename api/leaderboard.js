// api/leaderboard.js — GET /api/leaderboard?gamemode=Sword&region=EU
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

  const tierCol    = `${gamemode.toLowerCase()}_tier`;
  const strikeCol  = `${gamemode.toLowerCase()}_strike`;
  const defenseCol = `${gamemode.toLowerCase()}_defense`;

  // Column names come only from GAMEMODES (validated above), never raw
  // user input, so building the query string this way is safe — the same
  // pattern the bot's own db.js already uses for dynamic gamemode columns.
  const baseQuery = `
    SELECT u.discord_id, u.username, u.avatar_url,
           p.mc_username, p.region,
           p.${tierCol}    AS tier,
           p.${strikeCol}  AS strike,
           p.${defenseCol} AS defense
    FROM profiles p
    JOIN users u ON u.id = p.user_id
    WHERE p.${tierCol} IS NOT NULL
  `;

  try {
    const rows = region
      ? await sql(`${baseQuery} AND p.region = $1`, [region])
      : await sql(baseQuery);

    rows.sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || (b.strike ?? 0) - (a.strike ?? 0));

    res.status(200).json({ gamemode, region, players: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load leaderboard." });
  }
};
