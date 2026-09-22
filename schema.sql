-- MeleeTiers — full schema, fresh install.
-- Run this against a CLEAN Neon database (after you've deleted/reset it).
-- Only covers Sword / Speed / Stray — the old NethPot/DiaPot/OGV gamemodes
-- are gone for good with this reset.

DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  discord_id   TEXT UNIQUE NOT NULL,
  username     TEXT NOT NULL,
  avatar_url   TEXT
);

CREATE TABLE profiles (
  user_id          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mc_username      TEXT,
  region           TEXT,                 -- EU, ME, NA, SA, AS, AU

  sword_tier       TEXT,                 -- Unranked, LT5, HT5, LT4, HT4, LT3,
  sword_strike     INTEGER DEFAULT 0,    -- HT3, LT2, MT2, HT2, LT1, MT1, HT1, Retired
  sword_defense    INTEGER DEFAULT 0,
  sword_ranked_at  TIMESTAMPTZ,

  speed_tier       TEXT,
  speed_strike     INTEGER DEFAULT 0,
  speed_defense    INTEGER DEFAULT 0,
  speed_ranked_at  TIMESTAMPTZ,

  stray_tier       TEXT,
  stray_strike     INTEGER DEFAULT 0,
  stray_defense    INTEGER DEFAULT 0,
  stray_ranked_at  TIMESTAMPTZ
);

CREATE INDEX idx_profiles_sword ON profiles (sword_tier);
CREATE INDEX idx_profiles_speed ON profiles (speed_tier);
CREATE INDEX idx_profiles_stray ON profiles (stray_tier);
CREATE INDEX idx_profiles_region ON profiles (region);
