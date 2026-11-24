// Builds the static AJCL website into dist/.
//   data/league.json  <- pushed automatically by the AJCL bot
//   content.json      <- league text you edit by hand
//   public/           <- stylesheet, AJCL logo, team logos (logos/<ABBR>.png)
// Set SITE_BASE=/ajcl-website when hosting under a GitHub Pages project path.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const render = require('./src/render');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');

const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

// Turn the bot's flat data (teams referenced by slug) into linked objects + standings.
function hydrate(raw) {
  const teams = raw.teams.map(t => ({
    ...t,
    logo: fs.existsSync(path.join(PUBLIC, 'logos', `${t.abbr}.png`)) ? `/logos/${t.abbr}.png` : null,
  }));
  const bySlug = Object.fromEntries(teams.map(t => [t.slug, t]));
  const matches = raw.matches
    .filter(m => bySlug[m.home] && bySlug[m.away])
    .map(m => ({ ...m, home: bySlug[m.home], away: bySlug[m.away] }));

  const rows = Object.fromEntries(teams.map(t => [t.slug, { team: t, w: 0, l: 0, mw: 0, ml: 0 }]));
  for (const m of matches) {
    if (m.status !== 'final' || !m.result) continue;
    const h = rows[m.home.slug], a = rows[m.away.slug];
    h.mw += m.result.homeMaps; h.ml += m.result.awayMaps;
    a.mw += m.result.awayMaps; a.ml += m.result.homeMaps;
    if (m.result.winner === m.home.slug) { h.w++; a.l++; } else { a.w++; h.l++; }
  }
  const standings = {};
  for (const div of ['Premier', 'Academy']) {
    standings[div] = Object.values(rows)
      .filter(r => r.team.division === div)
      .map(r => ({ ...r, diff: r.mw - r.ml }))
      .sort((x, y) => y.w - x.w || y.diff - x.diff || x.l - y.l || x.team.name.localeCompare(y.team.name));
  }
  return { ...raw, teams, matches, standings };
}

function write(rel, html) {
  const file = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function build() {
  const league = hydrate(readJson('data/league.json'));
  const content = readJson('content.json');
  // Cache-busting tag covering the stylesheet and the account script.
  const assetHash = crypto.createHash('sha1')
    .update(fs.readFileSync(path.join(PUBLIC, 'style.css')))
    .update(fs.readFileSync(path.join(PUBLIC, 'account.js')));
  render.configure({
    base: process.env.SITE_BASE || '',
    cssVersion: assetHash.digest('hex').slice(0, 8),
    // Public OAuth2 client ID for "Log in with Discord" (the bot publishes it).
    discordClientId: process.env.DISCORD_CLIENT_ID || league.discordClientId || content.discordClientId || '',
  });

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.cpSync(PUBLIC, DIST, { recursive: true });

  write('index.html', render.home(league, content));
  write('schedule/index.html', render.schedulePage(league, content));
  write('standings/index.html', render.standingsPage(league, content));
  write('teams/index.html', render.teamsPage(league, content));
  for (const team of league.teams) write(`teams/${team.slug}/index.html`, render.teamPage(league, team, content));
  write('join/index.html', render.joinPage(league, content));
  write('stats/index.html', render.statsPage(league, content));
  write('auth/index.html', render.authPage(content));
  write('404.html', render.notFound(content));
  // Hashed member -> team index used after "Log in with Discord" (no raw Discord IDs).
  fs.writeFileSync(path.join(DIST, 'members.json'), JSON.stringify({
    teams: Object.fromEntries(league.teams.map(t => [t.slug, t.name])),
    members: league.members || {},
  }));
  fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

  console.log(`Built ${league.teams.length} teams, ${league.matches.length} matches -> dist/ (data from ${league.generatedAt ? new Date(league.generatedAt).toISOString() : 'unknown'})`);
}

if (require.main === module) build();
module.exports = { build };
