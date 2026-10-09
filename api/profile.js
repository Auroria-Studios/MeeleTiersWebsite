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
    const rows = await sql`
      SELECT u.discord_id, u.username, u.avatar_url, p.mc_username, p.region,
             p.sword_tier, p.sword_strike, p.sword_defense,
             p.speed_tier, p.speed_strike, p.speed_defense,
             p.stray_tier, p.stray_strike, p.stray_defense
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
