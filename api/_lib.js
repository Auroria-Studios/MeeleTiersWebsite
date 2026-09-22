// api/_lib.js — shared helpers for the serverless functions
const { neon } = require("@neondatabase/serverless");

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

// Best (top) to worst (bottom). Used for sorting and for the tier-divider order.
const TIER_ORDER = [
  "HT1", "MT1", "LT1",
  "HT2", "MT2", "LT2",
  "HT3", "LT3",
  "HT4", "LT4",
  "HT5", "LT5",
  "Unranked",
];

const GAMEMODES = ["Sword", "Speed", "Stray"];

const EMOJI = {
  Sword:    "1546582682966822974",
  Speed:    "1546582719725568241",
  Stray:    "1551737033607880774",
  LT3:      "1520918543959461980",
  HT3:      "1520918576469643296",
  LT2:      "1520918614918565958",
  MT2:      "1546581978688651274",
  HT2:      "1527083538522964068",
  LT1:      "1527083571750371348",
  MT1:      "1546579794865426532",
  HT1:      "1527083599889830048",
};

function emojiUrl(key) {
  const id = EMOJI[key];
  return id ? `https://cdn.discordapp.com/emojis/${id}.png?size=48` : null;
}

function tierRank(tier) {
  if (tier === "Retired") return TIER_ORDER.length + 1; // shown last, own section
  const i = TIER_ORDER.indexOf(tier);
  return i === -1 ? TIER_ORDER.length : i; // unknown/null → treated as Unranked
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

module.exports = { sql, TIER_ORDER, GAMEMODES, EMOJI, emojiUrl, tierRank, cors };
