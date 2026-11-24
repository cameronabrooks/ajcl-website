# AJCL Website

The website for Average Joe's CoD League. It's a static site hosted free on GitHub Pages.

## How it stays up to date

1. The AJCL bot builds the league data (rosters, schedule, match times, results, map pool).
2. Every 5 minutes, if anything changed, the bot commits it to `data/league.json` in this repo.
3. That commit triggers the **Build & deploy website** GitHub Action, which rebuilds and publishes the site (about 1 minute).

Don't edit `data/league.json` by hand: the bot overwrites it.

## Editing the site

| What | Where |
| --- | --- |
| League text, join steps, format, Discord invite, rulebook link | `content.json` |
| Colors, fonts, layout | `public/style.css` |
| Page templates | `src/render.js` |
| AJCL logo | `public/ajcl-logo.png` |
| Team logos | `public/logos/<ABBR>.png` (e.g. `CCC.png` for Calgary Cobra Chickens) |

Push to `main` and the site rebuilds automatically.

## Local preview

```
npm run dev
```

Opens at http://localhost:3000 and rebuilds whenever you save a file. No dependencies needed, just Node 18+.
