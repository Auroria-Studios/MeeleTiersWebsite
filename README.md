# MeleeTiers Website

A live leaderboard + player-profile site that reads straight from the same
Neon Postgres database your Discord bot writes to. Static frontend
(`index.html` / `style.css` / `app.js`) + two tiny serverless functions
under `api/` that query the DB. No build step.

## 1. Database (free — Neon)

If you don't already have a Neon project (your bot's `db.js` expects one),
create one at neon.tech (free tier). Then run `schema.sql` against it once,
either via the Neon SQL editor (paste the file's contents) or:

```bash
psql "$DATABASE_URL" -f schema.sql
```

This adds `sword_strike` / `sword_defense` / `speed_strike` / ... columns
for the Strike & Defense system alongside the existing tier columns.

## 2. Deploy the site (free — Vercel)

1. Push this folder to a GitHub repo.
2. Go to vercel.com → **Add New Project** → import that repo. Vercel
   auto-detects the `api/*.js` files as serverless functions and serves
   `index.html` as the static site — no config needed.
3. In the project's **Settings → Environment Variables**, add:
   - `DATABASE_URL` = the same Neon connection string your bot uses.
4. Deploy. You'll get a free `https://your-project.vercel.app` URL.

(Netlify works the same way if you'd rather use that — put the two files
from `api/` into a `netlify/functions/` folder instead; the frontend code
doesn't need to change since it calls relative `/api/...` paths either way,
just add a `netlify.toml` redirect from `/api/*` to `/.netlify/functions/*`.)

## 3. What it shows

- A leaderboard per gamemode (Sword / Speed / Stray), filterable by region,
  grouped by tier with the same tier icons/order as the Discord bot.
- Click any player to see their full profile: tier + Strike Score +
  Defense Score for all three gamemodes.
- If a gamemode/region has no ranked players yet, it shows an empty state
  instead of erroring.

## 4. Keeping it wired to the bot

Nothing else to do — as long as your bot writes tiers to
`profiles.sword_tier` / `speed_tier` / `stray_tier` (as `db.js` already
does) and, once you add the Strike & Defense commands, to the new
`*_strike` / `*_defense` columns, the site updates automatically. There's
no caching layer, so results appear the moment the bot writes them.
