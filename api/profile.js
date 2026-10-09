// api/profile.js — GET /api/profile?id=<discordId>
const { sql, cors } = require("./_lib");

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!sql) {
    return res.status(503).json({ error: "DATABASE_URL is not configured on this deployment." });
  }

  const id = req.query.id;
  if (!id) return res.status(400).json({ error: "Missing ?id=<discordId>." });

  try {
    // Strike Score / Defense Score live only in the separate strike_players
    // table (the Discord-only Strike & Defense system) — `profiles` only
    // has tier + peak_tier per gamemode, which is all the website shows.
    const rows = await sql`
      SELECT u.discord_id, u.username, u.avatar_url, p.mc_username, p.mc_uuid, p.region,
             p.sword_tier, p.sword_peak_tier,
             p.speed_tier, p.speed_peak_tier,
             p.stray_tier, p.stray_peak_tier
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      WHERE u.discord_id = ${id}
    `;
    if (!rows[0]) return res.status(404).json({ error: "Player not found." });
    res.status(200).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load profile." });
  }
};
