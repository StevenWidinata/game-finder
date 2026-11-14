# Game Finder

A simple, phone-friendly directory of daily web games (Wordle, Krillion, Globle, Flagle and ~60 more).

## Features
- **Search** by name *or* by what the game is ("flag", "country", "math") — handy when you forget the name.
- **Filters:** category, ★ Favorites, Not played today, and fun tier (S / A / B / C / D / Unrated).
- **Fun tiers:** tap a game's badge to rate it, or use the **🏆 Tier board** tab and drag games into rows
  (on a phone: press and hold, then drag).
- **★ Favorites** are pinned to the top.
- **✓ Played today:** games tick themselves off when you open them from the site; resets every day.
- **🎲 Random game:** picks something you haven't played today (better-rated games come up more often).
- **🔗 Share my tier list:** makes a link that shows your tiers to anyone (read-only; they can copy them).
- **🔄 Sync between devices** (⚙️ → Sync) — see setup below.
- **Add / edit / remove** games, **Export / Import / Reset** in ⚙️ Settings.

## One-time setup for sync (free)
Sync uses a small free database (Upstash Redis) through Vercel:
1. Vercel dashboard → your **game-finder** project → **Storage** tab.
2. **Create Database** → **Upstash for Redis** (free plan) → **Connect** it to this project.
3. **Deployments** → latest deployment → **⋯ → Redeploy** (so the site sees the new database).
4. On the site: ⚙️ → **Turn on sync**, then type the code shown into ⚙️ on your other device.

Without step 1–3 everything else still works; sync just says it isn't set up yet.
The sync code acts like a password — anyone with it can see and change your list. Only a hash of it is stored.

## Add a game for everyone
Edit `games.js`, add an entry, commit and push — Vercel redeploys automatically.

## Files
- `index.html`, `style.css`, `app.js` — the site
- `games.js` — the starter game list
- `api/sync.js` — Vercel serverless function for sync
