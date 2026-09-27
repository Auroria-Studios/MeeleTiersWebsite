// api/profile.js — GET /api/profile?ign=<mc_username>
// Looked up by IGN, not Discord ID — the site never exposes Discord
// identity, only Minecraft usernames.
const { sql, cors } = require("./_lib");

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!sql) {
    return res.status(503).json({ error: "DATABASE_URL is not configured on this deployment." });
  }

  const ign = req.query.ign;
  if (!ign) return res.status(400).json({ error: "Missing ?ign=<minecraft username>." });

  try {
    const rows = await sql`
      SELECT mc_username, region, sword_tier, speed_tier, stray_tier
      FROM profiles
      WHERE lower(mc_username) = lower(${ign})
    `;
    if (!rows[0]) return res.status(404).json({ error: "Player not found." });
    res.status(200).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load profile." });
  }
};
