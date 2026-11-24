# AJCL Website

The website for Average Joe's CoD League. It's a static site hosted free on GitHub Pages.

## How it stays up to date

1. The AJCL bot builds the league data (rosters, schedule, match times, results, map pool) whenever something changes.
2. **Instantly** (~1s): the bot sends it to the `ajcl-live` Cloudflare Worker (`live/`). Every open page is connected to it by WebSocket and re-renders itself in place (`public/live.js`, using the same templates bundled into `app.js`). Pages also fetch the latest data from it when they load.
3. **Permanently** (~10s): the bot commits it to `data/league.json` here, which triggers the **Build & deploy website** GitHub Action (about 1 minute). That's what the static pages contain, so the site still works if the Worker is ever down.

Don't edit `data/league.json` by hand: the bot overwrites it.

## Editing the site

| What | Where |
| --- | --- |
| League text, join steps, format, Discord invite, rulebook link, stats embeds (one per division) | `content.json` |
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

## Log in with Discord

Visitors can log in with Discord (`identify` scope only) to see their name and avatar in
the top bar, their team highlighted across the site, and a "You" tag on their roster.
It runs entirely in the browser (`public/account.js`, OAuth2 implicit grant); the token is
used once and discarded. Teams are matched with `members.json`, which the bot fills with
salted hashes of Discord IDs, never raw IDs.

The Discord application must allow these redirect URLs (Developer Portal → OAuth2 → Redirects):

- `https://cameronabrooks.github.io/ajcl-website/auth/`
- `http://localhost:3000/auth/` (local preview)

If you add a custom domain, add `https://<your-domain>/auth/` too.

## Live feed (Cloudflare Worker)

`live/` holds the `ajcl-live` Worker (https://ajcl-live.ajcl-live.workers.dev), set in `content.json` as `liveUrl`.

- `PUT /league`: bot only (`Authorization: Bearer <LIVE_SECRET>`)
- `GET /league.json`: latest data, never cached
- `GET /ws`: WebSocket that receives the data whenever it changes

Deploy changes with `cd live && npx wrangler deploy`. The secret is set with
`npx wrangler secret put LIVE_SECRET` and must match the bot's `WEBSITE_LIVE_SECRET`.
