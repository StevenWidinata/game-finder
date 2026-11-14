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
- **Add / edit / remove** games, **Export / Import / Reset** in ⚙️ Settings.

It's a plain static site — no server, no database. Your list is saved in your browser;
to move it to another device, use ⚙️ → Export, then Import the file there.

## Add a game for everyone
Edit `games.js`, add an entry, commit and push — Vercel redeploys automatically.

## Files
- `index.html`, `style.css`, `app.js` — the site
- `games.js` — the starter game list
