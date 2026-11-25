// HTML templates for the AJCL website. Pure functions: league data in, HTML out.
// All links go through u() so the site works both at a domain root and under
// a GitHub Pages project path like /ajcl-website/.

let BASE = '';
let CSS_VERSION = '1';
let DISCORD_CLIENT_ID = '';
let LIVE_URL = '';
let DATA_VERSION = 0;
function configure({ base = '', cssVersion = '1', discordClientId = '', liveUrl = '', dataVersion = 0, siteUrl = '' } = {}) {
  SITE_URL = (siteUrl || '').replace(/\/+$/, '');
  LIVE_URL = (liveUrl || '').replace(/\/+$/, '');
  DATA_VERSION = dataVersion || 0;
  BASE = base.replace(/\/+$/, '');
  CSS_VERSION = cssVersion;
  DISCORD_CLIENT_ID = discordClientId || '';
}
const u = p => BASE + p;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtDate(ts, opts) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', ...opts }).format(new Date(ts));
}
// All times are shown in Eastern (EST/EDT) for every viewer, matching league scheduling.
function timeTag(ts) {
  const et = fmtDate(ts, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return `<time datetime="${new Date(ts).toISOString()}">${esc(et)}</time>`;
}

// morph=true marks the crest so the page-transition script can make it glide between
// the Teams grid and that team's page. The transition name is only assigned at
// navigation time, to the one team involved (see TRANSITION_SCRIPT).
function crest(team, size = 'md', morph = false) {
  const vt = morph ? ` data-morph="${esc(team.slug)}"` : '';
  if (team.logo) return `<img class="crest crest-${size}" src="${esc(u(team.logo))}" alt=""${vt}${morph ? '' : ' loading="lazy"'}>`;
  return `<span class="crest crest-${size} crest-fallback" aria-hidden="true"${vt}>${esc(team.abbr)}</span>`;
}

const teamHref = team => u(`/teams/${team.slug}/`);

// Always use HTTPS on the real site. Over http:// the browser disables the APIs
// Discord login needs, and Discord rejects the http:// return address. Runs first
// in <head>, before anything renders. Local previews (localhost) are left alone.
// (account.js also sends Discord the official https address, see content.json siteUrl.)
const HTTPS_SCRIPT = `<script>
if (location.protocol === 'http:' && !/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(location.hostname)) {
  location.replace('https:' + location.href.slice(5));
}
</script>`;
let SITE_URL = '';

// Cross-document view transitions: give only the navigated team's crest a shared
// name on both the outgoing and incoming page, so it alone morphs and everything
// else moves together with the page.
const TRANSITION_SCRIPT = `<script>
(function () {
  function teamSlug(url) {
    var m = /\\/teams\\/([a-z0-9-]+)\\/?$/.exec(new URL(url, location.href).pathname);
    return m ? m[1] : null;
  }
  function tag(slug, vt) {
    if (!vt) return;
    // A skipped transition (e.g. clicking again mid-animation) rejects these; that's expected.
    vt.ready.catch(function () {});
    if (!slug) return;
    var el = document.querySelector('[data-morph="' + slug + '"]');
    if (!el) return;
    el.style.viewTransitionName = 'team-crest';
    var clear = function () { el.style.viewTransitionName = ''; };
    vt.finished.then(clear, clear);
  }
  addEventListener('pageswap', function (e) {
    if (!e.viewTransition) return;
    var to = e.activation && e.activation.entry ? teamSlug(e.activation.entry.url) : null;
    tag(to || teamSlug(location.href), e.viewTransition);
  });
  addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    var from = window.navigation && navigation.activation && navigation.activation.from;
    tag(teamSlug(location.href) || (from && teamSlug(from.url)), e.viewTransition);
  });
})();
</script>`;

function layout({ title, active, body, c, script = '', page = '' }) {
  const nav = [
    ['/', 'Home', 'home'],
    ['/schedule/', 'Schedule', 'schedule'],
    ['/standings/', 'Standings', 'standings'],
    ['/teams/', 'Teams', 'teams'],
    ['/players/', 'Players', 'players'],
    ['/draft/', 'Draft', 'draft'],
    ['/stats/', 'Stats', 'stats'],
    ['/8s/', '8s', 'eights'],
    ['/settings/', 'Settings', 'settings'],
    ['/join/', 'Join', 'join'],
  ].map(([href, label, key]) => `<a href="${u(href)}"${key === active ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const discord = c.discordInvite
    ? `<a class="btn btn-gold btn-sm" href="${esc(c.discordInvite)}" target="_blank" rel="noopener">Discord</a>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${HTTPS_SCRIPT}
<title>${esc(title ? `${title} · AJCL` : "Average Joe's CoD League")}</title>
<meta name="description" content="${esc(c.tagline || '')}">
<link rel="icon" href="${u('/ajcl-logo.png')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Teko:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${u('/style.css')}?v=${CSS_VERSION}">
<link rel="expect" href="#page-end" blocking="render">
<meta name="ajcl-base" content="${esc(BASE)}">
<meta name="ajcl-discord-client" content="${esc(DISCORD_CLIENT_ID)}">
<meta name="ajcl-live-url" content="${esc(LIVE_URL)}">
<meta name="ajcl-site-url" content="${esc(SITE_URL)}">
<meta name="ajcl-data-version" content="${DATA_VERSION}">
${TRANSITION_SCRIPT}
</head>
<body data-page="${esc(page)}">
<header class="topbar">
  <div class="wrap topbar-inner">
    <a class="brand" href="${u('/')}"><img src="${u('/ajcl-logo.png')}" alt=""><span><strong>AJCL</strong><small>Average Joe's CoD League</small></span></a>
    <nav class="nav">${nav}</nav>
    ${discord}
    <div class="account" data-account></div>
  </div>
</header>
<main>${body}<span id="page-end"></span></main>
<footer class="footer">
  <div class="wrap footer-inner">
    <span>© ${new Date().getFullYear()} Average Joe's CoD League · <a href="${u('/staff/')}">League staff</a></span>
    <span class="muted">Schedules, results and rosters update automatically from the AJCL Discord.</span>
  </div>
</footer>
${script}
<script src="${u('/account.js')}?v=${CSS_VERSION}" defer></script>
<script>
// LIVE NOW: a scheduled match (no result yet) is live from its start time for up to 4h.
(function () {
  function mark() {
    var now = Date.now();
    document.querySelectorAll('[data-start]').forEach(function (el) {
      var start = Number(el.getAttribute('data-start'));
      var live = start && now >= start && now < start + ${LIVE_WINDOW_MS};
      if (live && !el.classList.contains('pill-now')) {
        el.classList.add('pill-now');
        el.innerHTML = '<span class="live-dot"></span>LIVE NOW';
        var card = el.closest('.match'); if (card) card.classList.add('is-live');
      }
    });
  }
  mark();
  setInterval(mark, 30000);
  document.addEventListener('ajcl:league', function () { setTimeout(mark, 0); });
})();
</script>
${page && LIVE_URL ? `<script src="${u('/app.js')}?v=${CSS_VERSION}" defer></script>
<script src="${u('/live.js')}?v=${CSS_VERSION}" defer></script>` : ''}
</body>
</html>`;
}

function pageHead(eyebrow, title, sub) {
  return `<section class="pagehead"><div class="wrap">
  <p class="eyebrow">${esc(eyebrow)}</p>
  <h1>${esc(title)}</h1>
  ${sub ? `<p class="lede">${esc(sub)}</p>` : ''}
</div></section>`;
}

// Rank role badge (Obsidian, Kyanite, Amethyst, Amber, Ruby, Emerald).
const rankTag = r => `<span class="tier tier-${esc(String(r).toLowerCase())}" title="Rank">${esc(r)}</span>`;

// Stable id/URL for a match: /matches/w1-atl-sfs/
const matchId = m => `w${m.week}-${m.home.slug}-${m.away.slug}`;
const matchHref = m => u(`/matches/${matchId(m)}/`);
// A scheduled match counts as live from its start time until a result is
// reported (capped at 4 hours). LIVE_SCRIPT re-checks this in the browser.
const LIVE_WINDOW_MS = 4 * 60 * 60 * 1000;

function statusPill(m) {
  const r = m.result;
  if (m.status === 'final') return `<span class="pill pill-final">Final${r?.forfeit ? ' · FF' : ''}</span>`;
  if (m.status === 'scheduled') return `<span class="pill pill-live" data-start="${m.time}">${timeTag(m.time)}</span>`;
  return `<span class="pill">Awaiting time</span>`;
}

function matchCard(m, { showDivision = true } = {}) {
  const r = m.result;
  // Team rows aren't separate links: the whole card opens the match page
  // (which links to both teams).
  const side = (team, maps, won) => `
    <div class="mc-team${r ? (won ? ' won' : ' lost') : ''}">
      ${crest(team, 'sm')}<span class="mc-name">${esc(team.name)}</span>
      ${r ? `<span class="mc-score">${maps}</span>` : ''}
    </div>`;
  return `<article class="match" data-teams="${esc(m.home.slug)} ${esc(m.away.slug)}">
    <a class="mc-link" href="${matchHref(m)}" aria-label="${esc(m.home.name)} vs ${esc(m.away.name)}: match details"></a>
    <div class="mc-meta">${showDivision ? `<span class="div-tag div-${m.division.toLowerCase()}">${esc(m.division)}</span>` : ''}<span class="muted">Week ${m.week}</span>${statusPill(m)}</div>
    ${side(m.home, r?.homeMaps, r?.winner === m.home.slug)}
    ${side(m.away, r?.awayMaps, r?.winner === m.away.slug)}
  </article>`;
}

const MODE_LABELS = { hardpoint: 'Hardpoint', search_and_destroy: 'Search & Destroy', hijack: 'Hijack' };
// Map pictures: public/maps/<map-name>.jpg (e.g. "Reactor U92" -> reactor-u92.jpg).
const mapImage = name => u(`/maps/${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`);

// Match page: teams + score, time / LIVE status, caster, and picks & bans.
function matchPage(league, m, c) {
  const r = m.result;
  const bySlug = Object.fromEntries(league.teams.map(t => [t.slug, t]));
  const teamName = slug => (bySlug[slug] ? bySlug[slug].name : slug);
  const side = (team, maps, won) => `
    <a class="mp-team${r ? (won ? ' won' : ' lost') : ''}" href="${teamHref(team)}">
      ${crest(team, 'xl')}
      <strong>${esc(team.name)}</strong>
      <span class="muted">${esc(team.division)}</span>
    </a>`;
  const center = r
    ? `<div class="mp-score"><span class="${r.winner === m.home.slug ? 'won' : ''}">${r.homeMaps}</span><span class="muted">–</span><span class="${r.winner === m.away.slug ? 'won' : ''}">${r.awayMaps}</span></div>`
    : `<div class="mp-vs">VS</div>`;

  // Caster
  const caster = m.caster ? `
    <div class="panel mp-caster">
      <p class="eyebrow">Casting</p>
      <h3>${esc(m.caster.name)}</h3>
      ${m.caster.stream ? `<a class="btn btn-gold btn-sm" href="${esc(m.caster.stream)}" target="_blank" rel="noopener">Watch the stream ↗</a>` : '<p class="muted">Stream link coming soon.</p>'}
    </div>` : `
    <div class="panel mp-caster"><p class="eyebrow">Casting</p><p class="muted" style="margin:0">No caster yet.</p></div>`;

  // Picks & bans
  let pb = '';
  if (m.picksBans) {
    const p = m.picksBans;
    const picks = p.actions.filter(a => a.action === 'pick').sort((a, b) => (a.slot || 0) - (b.slot || 0));
    const bans = team => p.actions.filter(a => a.action === 'ban' && a.team === team);
    const label = slug => (slug === p.teamA ? 'Team A' : slug === p.teamB ? 'Team B' : '');
    pb = `
    <h2 class="panel-title">Picks &amp; bans${p.inProgress ? ' <span class="pill pill-live">In progress</span>' : ''}</h2>
    <ol class="mapset">${picks.map(a => `<li class="map-card" style="--map-img:url('${mapImage(a.map)}')">
      <span class="map-slot">Map ${a.slot || '?'}</span>
      <span class="map-name"><strong>${esc(a.map)}</strong><span>${esc(MODE_LABELS[a.mode] || a.mode)}</span></span>
      <span class="map-by">${a.team ? `${esc(teamName(a.team))} pick` : 'Decider'}</span>
    </li>`).join('') || '<li class="panel muted">No maps picked yet.</li>'}</ol>
    <div class="mp-bans">${[p.teamA, p.teamB].map(t => `<div class="panel">
      <h4>${esc(teamName(t))} bans <span class="muted">(${label(t)})</span></h4>
      <ul>${bans(t).map(a => `<li><span class="ban-thumb" style="background-image:url('${mapImage(a.map)}')"></span><span class="ban-map">${esc(a.map)}</span><span class="muted">${esc(MODE_LABELS[a.mode] || a.mode)}</span></li>`).join('') || '<li class="muted">None yet</li>'}</ul>
    </div>`).join('')}</div>`;
  } else {
    pb = `
    <h2 class="panel-title">Picks &amp; bans</h2>
    <div class="panel"><p class="muted" style="margin:0">Maps will show here once the GMs finish picks &amp; bans.</p></div>`;
  }

  const when = m.status === 'scheduled' ? timeTag(m.time) : m.status === 'final' ? 'Final' : 'Time not set yet';
  const body = `
<section class="pagehead mp-head"><div class="wrap">
  <p class="eyebrow"><span class="div-tag div-${m.division.toLowerCase()}">${esc(m.division)}</span> Week ${m.week} · ${statusPill(m)}</p>
  <div class="mp-teams">
    ${side(m.home, r?.homeMaps, r?.winner === m.home.slug)}
    ${center}
    ${side(m.away, r?.awayMaps, r?.winner === m.away.slug)}
  </div>
  <p class="mp-when muted">${when}${r?.forfeit ? ' · Forfeit' : ''}</p>
</div></section>
<section class="wrap section mp-layout">
  <div>${pb}</div>
  <div>${caster}</div>
</section>`;
  return layout({ title: `${m.home.abbr} vs ${m.away.abbr}`, active: 'schedule', body, c, page: `match:${matchId(m)}` });
}

function standingsTable(rows, { compact = false } = {}) {
  return `<div class="table-wrap"><table class="standings">
  <thead><tr><th>#</th><th class="left">Team</th><th>W-L</th>${compact ? '' : '<th>Maps</th>'}<th>Diff</th></tr></thead>
  <tbody>${rows.map((r, i) => `<tr data-team="${esc(r.team.slug)}">
    <td class="rank">${i + 1}</td>
    <td class="left"><a class="team-cell" href="${teamHref(r.team)}">${crest(r.team, 'xs')}<span>${esc(r.team.name)}</span></a></td>
    <td><strong>${r.w}-${r.l}</strong></td>
    ${compact ? '' : `<td>${r.mw}-${r.ml}</td>`}
    <td class="${r.diff > 0 ? 'pos' : r.diff < 0 ? 'neg' : ''}">${r.diff > 0 ? '+' : ''}${r.diff}</td>
  </tr>`).join('')}</tbody>
</table></div>`;
}

// The week to feature: the first week that still has unplayed matches.
function currentWeek(league) {
  const open = league.matches.find(m => m.status !== 'final');
  return open ? open.week : league.weeks[league.weeks.length - 1];
}

function home(league, c) {
  const week = currentWeek(league);
  const weekMatches = league.matches.filter(m => m.week === week);
  const played = league.matches.filter(m => m.status === 'final').length;
  // Most recently reported finals first (falls back to latest week), up to 6.
  const latestResults = league.matches.filter(m => m.status === 'final' && m.result)
    .sort((x, y) => (y.result.reportedAt || 0) - (x.result.reportedAt || 0) || y.week - x.week)
    .slice(0, 6);
  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div class="hero-copy">
      <p class="eyebrow">${esc(c.season || '')} · Premier &amp; Academy</p>
      <h1>Average Joe's<br><span>CoD League</span></h1>
      <p class="lede">${esc(c.tagline || '')}</p>
      <div class="cta-row">
        <a class="btn btn-gold" href="${u('/schedule/')}">Match Schedule</a>
        <a class="btn" href="${u('/standings/')}">Standings</a>
        <a class="btn" href="${u('/teams/')}">Teams</a>
        ${c.discordInvite ? `<a class="btn" href="${esc(c.discordInvite)}" target="_blank" rel="noopener">Join the Discord</a>` : ''}
        <a class="btn btn-ghost" href="${u('/join/')}">How to Join →</a>
      </div>
    </div>
    <img class="hero-logo" src="${u('/ajcl-logo.png')}" alt="Average Joe's CoD League logo">
  </div>
</section>

<section class="wrap stats-strip">
  <div><strong>${league.teams.length}</strong><span>Teams</span></div>
  <div><strong>2</strong><span>Divisions</span></div>
  <div><strong>${league.weeks.length}</strong><span>Regular season weeks</span></div>
  <div><strong>${played}</strong><span>Series played</span></div>
</section>
${(league.staff || []).some(g => (g.members || []).length) ? `
<section class="wrap section">
  <div class="section-head"><h2>Meet Our Staff</h2><a href="${u('/staff/')}">Staff page →</a></div>
  <p class="muted staff-intro">The people who keep Average Joe's CoD League running.</p>
  ${staffGroups(league)}
</section>` : ''}
${(league.announcements || []).length ? `
<section class="wrap section">
  <div class="section-head"><h2>Announcements</h2><a href="${u('/announcements/')}">All announcements →</a></div>
  <div class="announce-list">${league.announcements.slice(0, 3).map(a => announcementCard(a, { clamp: true })).join('')}</div>
</section>` : ''}

<section class="wrap section">
  <div class="section-head"><h2>Latest Results</h2><a href="${u('/schedule/')}">All results →</a></div>
  ${latestResults.length
    ? `<div class="match-grid">${latestResults.map(m => matchCard(m)).join('')}</div>`
    : '<div class="panel"><p class="muted" style="margin:0">No results yet — final scores will show here as matches are reported.</p></div>'}
</section>

<section class="wrap section">
  <div class="section-head"><h2>Week ${week} Matchups</h2><a href="${u('/schedule/')}#week-${week}">Full schedule →</a></div>
  <div class="match-grid">${weekMatches.map(m => matchCard(m)).join('')}</div>
</section>

<section class="wrap section">
  <div class="section-head"><h2>Standings</h2><a href="${u('/standings/')}">Full standings →</a></div>
  <div class="two-col">
    ${['Premier', 'Academy'].map(d => `<div class="panel"><h3 class="panel-title div-${d.toLowerCase()}-text">${d}</h3>${standingsTable(league.standings[d], { compact: true })}</div>`).join('')}
  </div>
</section>
${hasPowerRankings(league) ? `
<section class="wrap section">
  <div class="section-head"><h2>Power Rankings</h2><a href="${u('/power-rankings/')}">Full power rankings →</a></div>
  <div class="two-col">
    ${['Premier', 'Academy'].filter(d => league.powerRankings[d]).map(d => `<div class="panel"><h3 class="panel-title div-${d.toLowerCase()}-text">${d}</h3>${powerTable(league, d)}</div>`).join('')}
  </div>
</section>` : ''}

<section class="wrap section">
  <div class="about panel">
    <div><p class="eyebrow">About the league</p><h2>Built for the average joe</h2><p>${esc(c.about || '')}</p></div>
    <div class="cta-row" style="margin-top:0">
      ${c.discordInvite ? `<a class="btn btn-gold" href="${esc(c.discordInvite)}" target="_blank" rel="noopener">Join the Discord</a>` : ''}
      <a class="btn" href="${u('/join/')}">How to join</a>
    </div>
  </div>
</section>
`;

  return layout({ title: '', active: 'home', body, c, page: 'home' });
}

function teamsPage(league, c) {
  const body = pageHead(c.season || 'Franchises', 'Teams', 'Every franchise competing this season, by division.') + `
<section class="wrap section">
  ${['Premier', 'Academy'].map(d => {
    const teams = league.teams.filter(t => t.division === d);
    const rec = Object.fromEntries(league.standings[d].map(r => [r.team.slug, r]));
    return `<div class="div-block">
      <div class="section-head"><h2 class="div-${d.toLowerCase()}-text">${d} Division</h2><span class="muted">${teams.length} teams</span></div>
      <div class="team-grid">${teams.map(t => `<a class="team-card" data-team="${esc(t.slug)}" href="${teamHref(t)}">
        ${crest(t, 'lg', true)}
        <h3>${esc(t.name)}</h3>
        <p class="muted">${rec[t.slug].w}-${rec[t.slug].l} · Diff ${rec[t.slug].diff > 0 ? '+' : ''}${rec[t.slug].diff}</p>
      </a>`).join('')}</div>
    </div>`;
  }).join('')}
</section>`;
  return layout({ title: 'Teams', active: 'teams', body, c, page: 'teams' });
}

function teamPage(league, team, c) {
  const rows = league.standings[team.division];
  const row = rows.find(r => r.team.slug === team.slug);
  const rank = rows.indexOf(row) + 1;
  const games = league.matches.filter(m => m.home.slug === team.slug || m.away.slug === team.slug);

  let rosterHtml;
  if (!team.roster) {
    rosterHtml = '<p class="muted">Roster coming soon.</p>';
  } else {
    // K/D badge = current season (SZN X) only, from the cod-stats season embeds.
    // No badge until a player has played this season.
    const kd = team.roster.kd || {};
    const seasonLabel = c.season || 'this season';
    const links = team.roster.links || {};
    const nameHtml = n => links[n]
      ? `<a class="member-name" href="${u(`/players/${links[n]}/`)}">${esc(n)}</a>`
      : `<span class="member-name">${esc(n)}</span>`;
    const ranks = team.roster.ranks || {};
    const member = n => `<li data-member="${esc(n)}">${nameHtml(n)}${ranks[n] ? rankTag(ranks[n]) : ''}${kd[n] ? `<span class="kd" title="${esc(seasonLabel)} K/D (cod-stats.com)">${esc(kd[n])} K/D</span>` : ''}</li>`;
    const group = (label, names) => names.length ? `<div class="roster-group"><h4>${label}</h4><ul>${names.map(member).join('')}</ul></div>` : '';
    rosterHtml = (group('General Manager', team.roster.gms) + group('Coach', team.roster.coaches) +
      group('Players', team.roster.players) + group('Non-Playing', team.roster.nonPlaying)) ||
      '<p class="muted">No players rostered yet.</p>';
  }

  const body = `
<section class="pagehead team-head"><div class="wrap team-head-inner">
  ${crest(team, 'xl', true)}
  <div>
    <p class="eyebrow"><span class="div-tag div-${team.division.toLowerCase()}">${esc(team.division)}</span></p>
    <h1>${esc(team.name)}</h1>
    <div class="team-stats">
      <div><strong>${row.w}-${row.l}</strong><span>Series</span></div>
      <div><strong>${row.mw}-${row.ml}</strong><span>Maps</span></div>
      <div><strong>${row.diff > 0 ? '+' : ''}${row.diff}</strong><span>Diff</span></div>
      <div><strong>#${rank}</strong><span>${esc(team.division)}</span></div>
    </div>
  </div>
</div></section>
<section class="wrap section team-layout">
  <div class="panel"><h2 class="panel-title">Roster</h2>${rosterHtml}</div>
  <div>
    <h2 class="panel-title">Schedule</h2>
    <div class="match-list">${games.map(m => matchCard(m, { showDivision: false })).join('')}</div>
  </div>
</section>`;
  return layout({ title: team.name, active: 'teams', body, c, page: `team:${team.slug}` });
}

// Static page holding every week; a small script shows one week + division at a time.
// URL hash keeps it linkable: #week-3 or #week-3-academy. Without JS, everything shows.
function schedulePage(league, c) {
  const week = currentWeek(league);
  const weekTabs = league.weeks.map(w => `<a class="tab" href="#week-${w}" data-week="${w}">Week ${w}</a>`).join('');
  const divTabs = [['all', 'All'], ['premier', 'Premier'], ['academy', 'Academy']]
    .map(([d, label]) => `<a class="tab tab-sm" href="#" data-div="${d}">${label}</a>`).join('');

  const panels = league.weeks.map(w => {
    const list = league.matches.filter(m => m.week === w);
    const deadline = list[0]?.deadline;
    return `<div class="week-panel" data-week="${w}">
      <h2 class="sub week-label">Week ${w}${deadline ? ` <span class="muted deadline">Scheduling deadline: ${timeTag(deadline)}</span>` : ''}</h2>
      ${['Premier', 'Academy'].map(d => {
        const dl = list.filter(m => m.division === d);
        return dl.length ? `<div class="div-panel" data-div="${d.toLowerCase()}"><h3 class="sub div-${d.toLowerCase()}-text">${d}</h3><div class="match-grid">${dl.map(m => matchCard(m, { showDivision: false })).join('')}</div></div>` : '';
      }).join('') || '<p class="muted">No matches this week.</p>'}
    </div>`;
  }).join('');

  const script = `<script>
(function () {
  var current = ${week};
  function apply() {
    var m = /^#week-(\\d+)(?:-(premier|academy))?$/.exec(location.hash);
    var week = m ? Number(m[1]) : current, div = m && m[2] ? m[2] : 'all';
    document.querySelectorAll('.week-panel').forEach(function (p) { p.hidden = Number(p.dataset.week) !== week; });
    document.querySelectorAll('.div-panel').forEach(function (p) { p.hidden = div !== 'all' && p.dataset.div !== div; });
    document.querySelectorAll('.tab[data-week]').forEach(function (t) {
      t.classList.toggle('active', Number(t.dataset.week) === week);
      t.href = '#week-' + t.dataset.week + (div !== 'all' ? '-' + div : '');
    });
    document.querySelectorAll('.tab[data-div]').forEach(function (t) {
      t.classList.toggle('active', t.dataset.div === div);
      t.href = '#week-' + week + (t.dataset.div !== 'all' ? '-' + t.dataset.div : '');
    });
  }
  document.documentElement.classList.add('js');
  addEventListener('hashchange', apply);
  apply();
})();
</script>`;

  const body = pageHead(c.season || 'Match Center', 'Schedule & Results', 'Weekly matchups, confirmed match times and final scores. All times Eastern.') + `
<section class="wrap section schedule">
  <div class="tabs">${weekTabs}</div>
  <div class="tabs-row"><div class="tabs">${divTabs}</div></div>
  ${panels}
</section>`;
  return layout({ title: 'Schedule', active: 'schedule', body, c, script, page: 'schedule' });
}

// Competitive settings (content.json -> competitiveSettings) + map pool (bot's ajcl_modes).
// Tabs per mode (#hardpoint / #search-destroy / #hijack); without JS all show.
function settingsPage(league, c) {
  const modes = (c.competitiveSettings && c.competitiveSettings.modes) || [];
  const pool = league.mapPool || {};
  const poolFor = mode => pool[mode] || pool[Object.keys(pool).find(k => keyOf(k) === keyOf(mode))] || [];
  const tabs = modes.map(m => `<a class="tab" href="#${keyOf(m.mode)}" data-mode-tab="${keyOf(m.mode)}">${esc(m.mode)}</a>`).join('');
  const panels = modes.map(m => `<div class="mode-panel" data-mode="${keyOf(m.mode)}">
    <h2 class="sub">${esc(m.mode)}</h2>
    ${poolFor(m.mode).length ? `<div class="panel mode-maps"><h4>Map pool</h4><div class="map-chips">${poolFor(m.mode).map(x => `<span class="map-chip has-thumb"><span class="ban-thumb" style="background-image:url('${mapImage(x)}')"></span>${esc(x)}</span>`).join('')}</div></div>` : ''}
    <div class="settings-grid">${m.sections.map(s => `<div class="panel settings-card">
      <h4>${esc(s.name)}</h4>
      <dl>${s.settings.map(x => `<div><dt>${esc(x.name)}</dt><dd class="${/^on$/i.test(x.value) ? 'on' : /^off$/i.test(x.value) ? 'off' : ''}">${esc(x.value)}</dd></div>`).join('')}</dl>
    </div>`).join('')}</div>
  </div>`).join('');
  // Every map in the pool once, with its picture and the modes it's played in.
  const allMaps = [];
  for (const [mode, maps] of Object.entries(pool)) for (const x of maps) {
    let e = allMaps.find(y => keyOf(y.map) === keyOf(x));
    if (!e) allMaps.push(e = { map: x, modes: [] });
    e.modes.push(MODE_LABELS[mode] || mode);
  }
  const poolSummary = allMaps.length ? `
  <div class="map-gallery">${allMaps.map(e => `<figure class="map-tile" style="--map-img:url('${mapImage(e.map)}')">
    <figcaption><strong>${esc(e.map)}</strong><span>${e.modes.map(esc).join(' · ')}</span></figcaption>
  </figure>`).join('')}</div>` : '';
  const script = modes.length > 1 ? `<script>
(function () {
  function apply() {
    var keys = [].map.call(document.querySelectorAll('[data-mode-tab]'), function (t) { return t.dataset.modeTab; });
    var cur = keys.indexOf(location.hash.slice(1)) >= 0 ? location.hash.slice(1) : keys[0];
    document.querySelectorAll('[data-mode]').forEach(function (p) { p.hidden = p.dataset.mode !== cur; });
    document.querySelectorAll('[data-mode-tab]').forEach(function (t) { t.classList.toggle('active', t.dataset.modeTab === cur); });
  }
  document.documentElement.classList.add('js');
  addEventListener('hashchange', apply);
  apply();
})();
</script>` : '';
  const body = pageHead(c.season || 'Settings', 'Competitive Settings', 'The map pool and private match settings used for every AJCL series.') + `
<section class="wrap section">
  <h2 class="panel-title">Map pool</h2>
  ${poolSummary || '<p class="muted">Map pool coming soon.</p>'}
</section>
<section class="wrap section settings">
  <h2 class="panel-title">Game settings</h2>
  ${modes.length > 1 ? `<div class="tabs game-tabs">${tabs}</div>` : ''}
  ${panels || '<p class="muted">Settings coming soon.</p>'}
</section>`;
  return layout({ title: 'Competitive Settings', active: 'settings', body, c, script, page: 'settings' });
}

// ---- Power rankings (from the bot's /powerrankings votes: 5/3/1 points) ----
// Updates live: each vote reaches open pages within seconds via the live feed.
const hasPowerRankings = league => !!(league.powerRankings && (league.powerRankings.Premier || league.powerRankings.Academy));

function powerTable(league, division, { top } = {}) {
  const pr = league.powerRankings && league.powerRankings[division];
  if (!pr) return '<p class="muted">No power rankings yet.</p>';
  const bySlug = Object.fromEntries(league.teams.map(t => [t.slug, t]));
  // Shared rank for tied points (e.g. 1, 1, 3).
  let rank = 0, prev = null;
  const rows = pr.teams.map((e, i) => { if (e.points !== prev) { rank = i + 1; prev = e.points; } return { ...e, rank }; });
  const shown = top ? rows.slice(0, top) : rows;
  const max = Math.max(1, ...rows.map(r => r.points));
  return `<ol class="power-list">${shown.map(e => {
    const t = bySlug[e.team];
    if (!t) return '';
    return `<li class="${e.rank <= 3 && e.points ? `power-top power-${e.rank}` : ''}" data-team="${esc(t.slug)}">
      <span class="power-rank">${e.rank}</span>
      <a class="team-cell" href="${teamHref(t)}">${crest(t, 'xs')}<span>${esc(t.name)}</span></a>
      <span class="power-bar"><span style="width:${Math.round((e.points / max) * 100)}%"></span></span>
      <span class="power-pts"><strong>${e.points}</strong> pts</span>
    </li>`;
  }).join('')}</ol>
  <p class="muted power-meta">${pr.status === 'open' ? '<span class="pill pill-live"><span class="live-dot"></span>Voting open</span> ' : '<span class="pill">Final</span> '}${pr.voters} voter${pr.voters === 1 ? '' : 's'}</p>`;
}

const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)] || 'th');

function powerRankingsPage(league, c) {
  // Describe the scoring the bot actually uses (sent with the data).
  const pts = ((league.powerRankings && (league.powerRankings.Premier || league.powerRankings.Academy)) || {}).points || [8, 7, 6, 5, 4, 3, 2, 1];
  const scoring = pts.length > 3
    ? `each voter ranks all ${pts.length} teams (1st = ${pts[0]} pts, down to ${ordinal(pts.length)} = ${pts[pts.length - 1]} pt${pts[pts.length - 1] === 1 ? '' : 's'})`
    : `each voter ranks their top ${pts.length} teams (${pts.map((p, i) => `${ordinal(i + 1)} = ${p} pt${p === 1 ? '' : 's'}`).join(', ')})`;
  const body = pageHead(c.season || 'Power Rankings', 'Power Rankings', `Voted on in the AJCL Discord: ${scoring}. Updates live as votes come in.`) + `
<section class="wrap"><div class="tabs page-tabs"><a class="tab" href="${u('/standings/')}">Standings</a><a class="tab active" href="${u('/power-rankings/')}">Power Rankings</a></div></section>
<section class="wrap section two-col">
  ${hasPowerRankings(league)
    ? ['Premier', 'Academy'].map(d => `<div class="panel"><h2 class="panel-title div-${d.toLowerCase()}-text">${d} Division</h2>${powerTable(league, d)}</div>`).join('')
    : '<p class="muted">Power rankings voting hasn\'t started yet.</p>'}
</section>`;
  return layout({ title: 'Power Rankings', active: 'standings', body, c, page: 'power-rankings' });
}

function standingsPage(league, c) {
  const body = pageHead(c.season || 'Standings', 'Standings', 'Ranked by series wins, then map differential.') + `
<section class="wrap"><div class="tabs page-tabs"><a class="tab active" href="${u('/standings/')}">Standings</a><a class="tab" href="${u('/power-rankings/')}">Power Rankings</a></div></section>` + `
<section class="wrap section two-col">
  ${['Premier', 'Academy'].map(d => `<div class="panel"><h2 class="panel-title div-${d.toLowerCase()}-text">${d} Division</h2>${standingsTable(league.standings[d])}</div>`).join('')}
</section>`;
  return layout({ title: 'Standings', active: 'standings', body, c, page: 'standings' });
}

function joinPage(league, c) {
  const pool = league.mapPool || {};
  const steps = (c.joinSteps || []).map((s, i) => `<li class="step"><span class="step-num">${i + 1}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div></li>`).join('');
  const body = pageHead('Enlist', 'How to Join AJCL', c.about) + `
<section class="wrap section join-layout">
  <div>
    <h2 class="panel-title">Getting started</h2>
    <ol class="steps">${steps}</ol>
    <div class="cta-row">
      ${c.discordInvite ? `<a class="btn btn-gold" href="${esc(c.discordInvite)}" target="_blank" rel="noopener">Join the Discord</a>` : ''}
      ${c.rulebookUrl ? `<a class="btn" href="${esc(c.rulebookUrl)}" target="_blank" rel="noopener">Read the rulebook</a>` : ''}
    </div>
  </div>
  <div>
    <h2 class="panel-title">League format</h2>
    <div class="format-list">${(c.format || []).map(f => `<div class="panel format"><h3>${esc(f.title)}</h3><p>${esc(f.body)}</p></div>`).join('')}</div>
    ${Object.keys(pool).length ? `<h2 class="panel-title">Map pool</h2>
    <div class="panel pool">${Object.entries(pool).map(([mode, maps]) => `<div><h4>${esc(mode)}</h4><p>${maps.map(esc).join(' · ')}</p></div>`).join('')}</div>` : ''}
  </div>
</section>`;
  return layout({ title: 'Join', active: 'join', body, c, page: 'join' });
}

// cod-stats.com player-stats embeds, grouped by game then season
// (content.json -> statsGames: [{ game: "MW4", seasons: [{ name, url }] }]).
// Game tabs on top, season tabs below; only the shown embed loads (lazy iframes).
// Hash keeps it linkable, e.g. #bo7/season-9-premier. Without JS everything shows.
const keyOf = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function statsPage(league, c) {
  const games = (c.statsGames || [])
    .map(g => ({ ...g, key: keyOf(g.game), seasons: (g.seasons || []).filter(s => s && s.url).map(s => ({ ...s, key: keyOf(s.name) })) }))
    .filter(g => g.seasons.length);

  const gameTabs = games.map(g => `<a class="tab" href="#${g.key}" data-game-tab="${g.key}">${esc(g.game)}</a>`).join('');
  const panels = games.map(g => `<div class="game-panel" data-game="${g.key}">
    <div class="tabs season-tabs">${g.seasons.map(s => `<a class="tab tab-sm" href="#${g.key}/${s.key}" data-season-tab="${g.key}/${s.key}">${esc(s.name)}</a>`).join('')}</div>
    ${g.seasons.map(s => `<div class="stats-panel" data-season="${g.key}/${s.key}">
      <h2 class="sub">${esc(g.game)} · ${esc(s.name)}</h2>
      <div class="panel stats-embed"><iframe src="${esc(s.url)}" title="AJCL ${esc(g.game)} ${esc(s.name)} player stats" loading="lazy"></iframe></div>
    </div>`).join('')}
  </div>`).join('');

  const script = games.length ? `<script>
(function () {
  function apply() {
    var games = [].map.call(document.querySelectorAll('[data-game-tab]'), function (t) { return t.dataset.gameTab; });
    var parts = location.hash.slice(1).split('/');
    var game = games.indexOf(parts[0]) >= 0 ? parts[0] : games[0];
    var seasons = [].map.call(document.querySelectorAll('[data-game="' + game + '"] [data-season-tab]'), function (t) { return t.dataset.seasonTab; });
    var season = seasons.indexOf(game + '/' + parts[1]) >= 0 ? game + '/' + parts[1] : seasons[0];
    document.querySelectorAll('[data-game]').forEach(function (p) { p.hidden = p.dataset.game !== game; });
    document.querySelectorAll('[data-game-tab]').forEach(function (t) { t.classList.toggle('active', t.dataset.gameTab === game); });
    document.querySelectorAll('[data-season]').forEach(function (p) { p.hidden = p.dataset.season !== season; });
    document.querySelectorAll('[data-season-tab]').forEach(function (t) { t.classList.toggle('active', t.dataset.seasonTab === season); });
  }
  document.documentElement.classList.add('js');
  addEventListener('hashchange', apply);
  apply();
})();
</script>` : '';
  const body = pageHead(c.season || 'Stat Leaders', 'Player Stats', 'Player stats for every AJCL season, by game, powered by cod-stats.com.') + `
<section class="wrap section stats">
  ${games.length > 1 ? `<div class="tabs game-tabs">${gameTabs}</div>` : ''}
  ${panels || '<p class="muted">Stats are coming soon.</p>'}
</section>`;
  return layout({ title: 'Stats', active: 'stats', body, c, script });
}

// Discord sends people back here after login (OAuth2 implicit grant).
// account.js finishes the login, then returns them to the page they came from.
function authPage(c) {
  const body = pageHead('Discord', 'Connecting your account…', '') + `<section class="wrap section"><p class="muted" data-auth-status>One moment…</p></section>`;
  return layout({ title: 'Connecting', active: '', body, c });
}

const ROLE_LABELS = { gm: 'General Manager', coach: 'Coach', player: 'Player', nonPlaying: 'Non-Playing' };

// Draft results (content.json -> draft): one card per team in draft order, GM first,
// each player with their tier. Names link to player pages when they match a roster name.
function draftPage(league, c) {
  const d = c.draft;
  if (!d || !d.divisions) {
    const body = pageHead('Draft', 'Draft results', '') + `<section class="wrap section"><p class="muted">Draft results are coming soon.</p></section>`;
    return layout({ title: 'Draft', active: 'draft', body, c });
  }
  const byAbbr = Object.fromEntries(league.teams.map(t => [t.abbr, t]));
  const nameKey = s => String(s || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
  const playerByName = {};
  for (const p of league.players || []) playerByName[nameKey(p.name)] = p;
  const person = (name, tier, isGm) => {
    const p = playerByName[nameKey(name)];
    const label = p ? `<a href="${u(`/players/${p.slug}/`)}">${esc(name)}</a>` : esc(name);
    return `<li${isGm ? ' class="draft-gm"' : ''}>
      ${isGm ? '<span class="gm-crown" title="General Manager">♛</span>' : ''}<span class="draft-name">${label}</span>
      ${isGm ? '<span class="pill">GM</span>' : ''}${tier ? `<span class="tier tier-${esc(tier)}">${esc(tier)}</span>` : ''}
    </li>`;
  };
  const sections = d.divisions.map(div => `
  <div class="div-block">
    <div class="section-head"><h2 class="div-${div.division.toLowerCase()}-text">${esc(div.division)}</h2>
      <span class="tier-legend">${(div.tiers || []).map(t => `<span class="tier tier-${esc(t)}">${esc(t)}</span>`).join('')}</span></div>
    <div class="draft-grid">${div.teams.map((entry, i) => {
      const t = byAbbr[entry.team];
      const name = t ? t.name : entry.team;
      return `<article class="panel draft-card">
        <div class="draft-team">
          <span class="draft-order">${i + 1}</span>
          ${t ? `<a href="${teamHref(t)}">${crest(t, 'sm')}</a>` : ''}
          <h3>${t ? `<a href="${teamHref(t)}">${esc(name)}</a>` : esc(name)}</h3>
        </div>
        <ul class="draft-list">${person(entry.gm.name, entry.gm.tier, true)}${entry.picks.map(p => person(p.name, p.tier, false)).join('')}</ul>
      </article>`;
    }).join('')}</div>
  </div>`).join('');
  const body = pageHead(d.season || 'Draft', `${d.season || ''} Draft Results`.trim(), 'Every team\'s draft, with each player\'s tier.') + `
<section class="wrap section">${sections}</section>`;
  return layout({ title: 'Draft', active: 'draft', body, c, page: 'draft' });
}

// Searchable list of every rostered player. Filtering is client-side; the search
// listener is delegated so it survives live.js re-rendering <main>.
// ---- League announcements (the bot's posts in #league-announcements) ----
// Safe mini-markdown: escape first, then **bold**, *italic*/_italic_, __underline__,
// ~~strike~~, [text](url), bare links, "# heading" lines, "- " bullets, line breaks.
function discordMarkdown(text) {
  let s = esc(text || '');
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
       .replace(/__([^_\n]+)__/g, '<u>$1</u>')
       .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
       .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
       .replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
  return s.split('\n').map(line => {
    const h = /^#{1,3} (.+)$/.exec(line);
    if (h) return `<strong class="ann-h">${h[1]}</strong>`;
    if (/^[-•*] /.test(line)) return `<span class="ann-li">• ${line.slice(2)}</span>`;
    return line;
  }).join('<br>');
}

function announcementCard(a, { clamp = false } = {}) {
  const when = `<time datetime="${new Date(a.postedAt).toISOString()}">${esc(fmtDate(a.postedAt, { month: 'short', day: 'numeric', year: 'numeric' }))}</time>`;
  return `<article class="panel announce${clamp ? ' is-clamped' : ''}">
    <p class="announce-date muted">${when}</p>
    ${a.title ? `<h3>${esc(a.title)}</h3>` : ''}
    ${a.text ? `<div class="announce-text">${discordMarkdown(a.text)}</div>` : ''}
    ${(a.images || []).length ? `<div class="announce-images">${a.images.map(src => `<img src="${esc(src)}" alt="" loading="lazy">`).join('')}</div>` : ''}
    ${clamp ? `<a class="announce-more" href="${u('/announcements/')}#${esc(a.id)}">Read more →</a>` : ''}
  </article>`;
}

function announcementsPage(league, c) {
  const list = league.announcements || [];
  const body = pageHead('League', 'Announcements', 'The latest from #league-announcements in the AJCL Discord.') + `
<section class="wrap section">
  <div class="announce-list announce-full">${list.map(a => `<div id="${esc(a.id)}">${announcementCard(a)}</div>`).join('') || '<p class="muted">No announcements yet.</p>'}</div>
</section>`;
  return layout({ title: 'Announcements', active: 'home', body, c, page: 'announcements' });
}

// ---- 8s: live queues (live feed only) + leaderboard ----
function eightsPage(league, c) {
  const queues = league.queues; // undefined in the static build until the live feed loads
  const queueCard = q => {
    const m = q.match;
    const pct = Math.min(100, Math.round((q.count / (q.size || 8)) * 100));
    const team = (label, list) => `<div class="q-team"><h5>${label}</h5><ul>${list.map(n => `<li>${esc(n)}</li>`).join('') || '<li class="muted">Picking…</li>'}</ul></div>`;
    return `<article class="panel queue-card">
      <div class="q-head">
        <h3>${esc(q.name)} 8s</h3>
        ${q.locked ? '<span class="pill">Locked</span>' : `<span class="pill pill-live"><span class="live-dot"></span>${q.count}/${q.size || 8} in queue</span>`}
      </div>
      <div class="q-bar"><span style="width:${pct}%"></span></div>
      <div class="q-players">${q.players.map(n => `<span class="map-chip">${esc(n)}</span>`).join('') || '<span class="muted">Queue is empty — join in the AJCL Discord.</span>'}</div>
      ${(league.eightsLeaderboards || []).some(b => b.key === keyOf(q.name)) ? `<a class="q-lb-link" href="#lb-${esc(keyOf(q.name))}">View ${esc(q.name)} leaderboard →</a>` : ''}
      ${m ? `<div class="q-match">
        <div class="q-match-head"><strong>Match ${m.number ? `#${esc(m.number)}` : ''}</strong><span class="pill pill-live">${esc(m.phase)}</span>${m.format ? `<span class="muted">${esc(m.format)}</span>` : ''}</div>
        ${m.maps ? `<div class="q-maps">${m.maps.map((x, i) => `<div class="q-map" style="--map-img:url('${mapImage(x.map)}')"><span>Map ${i + 1}</span><strong>${esc(x.map)}</strong><em>${esc(MODE_LABELS[x.mode] || x.mode || '')}</em></div>`).join('')}</div>` : ''}
        ${(m.teamA.length || m.teamB.length) ? `<div class="q-teams">${team('Team A', m.teamA)}${team('Team B', m.teamB)}</div>` : (m.players.length ? `<div class="q-players">${m.players.map(n => `<span class="map-chip">${esc(n)}</span>`).join('')}</div>` : '')}
      </div>` : ''}
    </article>`;
  };

  // One leaderboard per queue (the bot rates each queue separately), shown as tabs.
  const boards = league.eightsLeaderboards || (league.eightsLeaderboard ? [{ key: '8s', name: '8s', players: league.eightsLeaderboard }] : []);
  const streak = s => (s > 0 ? `<span class="pos">W${s}</span>` : s < 0 ? `<span class="neg">L${-s}</span>` : '<span class="muted">–</span>');
  const table = lb => `<div class="panel table-wrap"><table class="standings lb-table">
    <thead><tr><th>#</th><th class="left">Player</th><th>MMR</th><th>W-L</th><th>Win %</th><th>Streak</th></tr></thead>
    <tbody>${lb.map((r, i) => `<tr class="${i < 3 ? `lb-top lb-${i + 1}` : ''}">
      <td class="rank">${i + 1}</td>
      <td class="left"><span class="lb-name">${esc(r.name)}</span>${r.rank ? ` ${rankTag(r.rank)}` : ''}</td>
      <td><strong>${r.rating}</strong></td>
      <td>${r.wins}-${r.losses}</td>
      <td>${r.winPct}%</td>
      <td>${streak(r.streak)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
  const leaderboard = boards.length ? `
  ${boards.length > 1 ? `<div class="tabs lb-tabs">${boards.map(b => `<a class="tab" href="#lb-${esc(b.key)}" data-lb-tab="${esc(b.key)}">${esc(b.name)}</a>`).join('')}</div>` : ''}
  ${boards.map(b => `<div class="lb-panel" data-lb="${esc(b.key)}">
    <h3 class="sub">${esc(b.name)} leaderboard <span class="muted">· top ${b.players.length} by MMR</span></h3>
    ${table(b.players)}
  </div>`).join('')}` : '<p class="muted">No ratings yet — play some 8s matches in the AJCL Discord!</p>';
  // Tab switching; delegated + re-applied after live updates re-render the page.
  const script = boards.length > 1 ? `<script>
(function () {
  function apply() {
    var keys = [].map.call(document.querySelectorAll('[data-lb-tab]'), function (t) { return t.dataset.lbTab; });
    if (!keys.length) return;
    var want = location.hash.replace(/^#lb-/, '');
    var cur = keys.indexOf(want) >= 0 ? want : keys[0];
    document.querySelectorAll('[data-lb]').forEach(function (p) { p.hidden = p.dataset.lb !== cur; });
    document.querySelectorAll('[data-lb-tab]').forEach(function (t) { t.classList.toggle('active', t.dataset.lbTab === cur); });
    return cur;
  }
  // Bring the chosen queue's leaderboard into view (the tabs sit below the live queues).
  function showChosen() {
    if (!/^#lb-/.test(location.hash)) return;
    var cur = apply();
    var target = document.querySelector('.lb-tabs') || document.querySelector('[data-lb="' + cur + '"]');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.documentElement.classList.add('js');
  addEventListener('hashchange', showChosen);
  // Clicking a link to the tab that's already in the address bar doesn't fire hashchange.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#lb-"]');
    if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); showChosen(); }
  });
  document.addEventListener('ajcl:league', function () { setTimeout(apply, 0); });
  apply();
  if (/^#lb-/.test(location.hash)) setTimeout(showChosen, 300);
})();
</script>` : '';

  const body = pageHead('8s', '8s Queue', 'Live queues from the AJCL Discord and the 8s leaderboard. Updates live.') + `
<section class="wrap section">
  <h2 class="panel-title">Live queues</h2>
  ${queues === undefined ? '<p class="muted" data-queues-loading>Connecting to the live queue…</p>'
    : queues.length ? `<div class="queue-grid">${queues.map(queueCard).join('')}</div>`
    : '<div class="panel"><p class="muted" style="margin:0">No 8s queues are running right now.</p></div>'}
</section>
<section class="wrap section">
  <div class="section-head"><h2>Leaderboards</h2><span class="muted">${boards.length > 1 ? 'Pick a queue' : ''}</span></div>
  ${leaderboard}
</section>`;
  return layout({ title: '8s', active: 'eights', body, c, script, page: '8s' });
}

// ---- Staff: public staff list + staff-only modmail ----
// The modmail section is filled in the browser, only for staff: it asks the AJCL
// Worker with the visitor's Discord login, and the Worker checks they're staff.
// Ticket data is never part of the public site data.
// MFIC → Commissioners → Staff (each person once, under their highest role).
function staffGroups(league) {
  const groups = (league.staff || []).filter(g => (g.members || []).length);
  const person = m => `<div class="staff-person">
    ${m.avatar ? `<img src="${esc(m.avatar)}" alt="" loading="lazy">` : `<span class="acct-initial">${esc(String(m.name).charAt(0))}</span>`}
    <span class="staff-name">${esc(m.name)}</span>${m.rank ? rankTag(m.rank) : ''}
  </div>`;
  return groups.length ? groups.map(g => `<div class="staff-group">
    <h3 class="sub">${esc(g.title === 'Commissioner' ? 'Commissioners' : g.title)}</h3>
    <div class="staff-grid">${g.members.map(person).join('')}</div>
  </div>`).join('') : '<p class="muted">The staff list will appear here shortly.</p>';
}

function staffPage(league, c) {
  const list = staffGroups(league);
  const script = `<script>
(function () {
  var box = document.querySelector('[data-modmail]');
  if (!box) return;
  var LIVE = (document.querySelector('meta[name="ajcl-live-url"]') || {}).content || '';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function ago(ts) { var m = Math.max(0, Math.round((Date.now() - ts) / 60000)); if (m < 1) return 'just now'; if (m < 60) return m + 'm ago'; var h = Math.round(m / 60); if (h < 48) return h + 'h ago'; return Math.round(h / 24) + 'd ago'; }
  function show(html, visible) { box.hidden = !visible; var body = box.querySelector('[data-modmail-body]'); if (body) body.innerHTML = html; }
  async function load() {
    var token = window.ajclDiscordToken && window.ajclDiscordToken();
    if (!LIVE) return show('', false);
    if (!token) return show('<p class="muted">Staff: log in with Discord (top right) to see open modmail tickets. If you logged in before this was added, log out and back in once.</p>', true);
    try {
      var r = await fetch(LIVE + '/private/modmail', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
      if (r.status === 403) return show('', false); // not staff: show nothing
      if (r.status === 401) return show('<p class="muted">Your Discord login expired. Log out and log back in to see modmail.</p>', true);
      if (!r.ok) throw new Error(r.status);
      var d = await r.json();
      var t = d.tickets || [];
      var waiting = t.filter(function (x) { return x.waitingOnStaff; }).length;
      show(
        '<p class="muted modmail-summary">' + t.length + ' open ticket' + (t.length === 1 ? '' : 's') + (waiting ? ' · <strong class="neg">' + waiting + ' waiting on staff</strong>' : '') + (d.updatedAt ? ' · updated ' + ago(d.updatedAt) : '') + '</p>' +
        (t.length ? '<div class="modmail-list">' + t.map(function (x) {
          return '<article class="panel ticket' + (x.waitingOnStaff ? ' is-waiting' : '') + '">' +
            '<div class="ticket-head"><strong>' + esc(x.user) + '</strong>' +
            (x.waitingOnStaff ? '<span class="pill pill-now"><span class="live-dot"></span>Waiting on staff</span>' : '<span class="pill">Staff replied</span>') + '</div>' +
            '<p class="ticket-preview">' + (x.lastBy ? '<span class="muted">' + esc(x.lastBy) + ':</span> ' : '') + esc(x.preview || '') + '</p>' +
            '<div class="ticket-foot muted"><span>Opened ' + ago(x.openedAt) + ' · last activity ' + ago(x.lastAt) + '</span>' +
            '<a class="btn btn-sm" href="' + esc(x.url) + '" target="_blank" rel="noopener">Open in Discord ↗</a></div></article>';
        }).join('') + '</div>' : '<p class="muted">No open tickets. 🎉</p>'), true);
    } catch (e) {
      show('<p class="muted">Couldn\\'t load modmail right now. It will retry in a moment.</p>', true);
    }
  }
  load();
  setInterval(load, 30000);
})();
</script>`;
  const body = pageHead('League', 'Staff', "The people who run Average Joe's CoD League.") + `
<section class="wrap section" id="modmail">
  <div class="panel modmail-panel" data-modmail hidden>
    <div class="section-head"><h2>Open modmail tickets</h2><span class="pill">Staff only</span></div>
    <div data-modmail-body><p class="muted">Loading…</p></div>
  </div>
</section>
<section class="wrap section staff-section">${list}</section>`;
  return layout({ title: 'Staff', active: 'staff', body, c, script }); // no live re-render: keeps loaded tickets
}

const faLabel = p => (p.freeAgent === 'rfa' ? 'Restricted free agent' : 'Free agent');
const RANK_ORDER = ['Obsidian', 'Kyanite', 'Amethyst', 'Amber', 'Ruby', 'Emerald'];

// Free agents (F/A and RFA roles), grouped by rank, highest first.
function freeAgentsPage(league, c) {
  const fas = league.players.filter(p => p.freeAgent);
  const rankIdx = p => (p.rank && RANK_ORDER.includes(p.rank) ? RANK_ORDER.indexOf(p.rank) : RANK_ORDER.length);
  const groups = [...RANK_ORDER, null].map(r => ({ rank: r, players: fas.filter(p => (p.rank || null) === r || (r === null && !RANK_ORDER.includes(p.rank))) }))
    .filter(g => g.players.length);
  const card = p => {
    const g = (p.games || []).find(x => x.total);
    return `<a class="player-row is-fa" href="${u(`/players/${p.slug}/`)}">
      <span class="crest crest-sm crest-fallback" aria-hidden="true">${p.freeAgent === 'rfa' ? 'RFA' : 'FA'}</span>
      <span class="pr-main"><strong>${esc(p.name)}</strong><span class="muted">${esc(faLabel(p))}${g ? ` · ${esc(g.game)} ${esc(g.total.kd || '–')} K/D over ${g.total.maps} maps` : ''}</span></span>
      ${p.rank ? rankTag(p.rank) : ''}
    </a>`;
  };
  const body = pageHead(c.season || 'Free Agents', 'Free Agents', `${fas.length} player${fas.length === 1 ? '' : 's'} with the F/A or RFA role in the AJCL Discord, by rank.`) + `
<section class="wrap"><div class="tabs page-tabs"><a class="tab" href="${u('/players/')}">All players</a><a class="tab active" href="${u('/free-agents/')}">Free agents</a></div></section>
<section class="wrap section">
  ${groups.length ? groups.map(g => `<div class="fa-group">
    <div class="section-head"><h2>${g.rank ? rankTag(g.rank) : 'Unranked'}</h2><span class="muted">${g.players.length}</span></div>
    <div class="player-list">${g.players.sort((a, b) => a.name.localeCompare(b.name)).map(card).join('')}</div>
  </div>`).join('') : '<p class="muted">No free agents right now.</p>'}
</section>`;
  return layout({ title: 'Free Agents', active: 'players', body, c, page: 'free-agents' });
}

function playersPage(league, c) {
  const byName = (a, b) => a.name.localeCompare(b.name);
  const current = league.players.filter(p => !p.former && !p.freeAgent).sort(byName);
  const freeAgents = league.players.filter(p => p.freeAgent).sort(byName);
  const former = league.players.filter(p => p.former).sort(byName);
  const row = p => {
    const t = p.teamObj;
    const roleText = (p.roles || []).map(r => ROLE_LABELS[r] || r).join(', ');
    const sub = t ? `${t.name} · ${roleText}`
      : p.freeAgent ? faLabel(p)
      : `Former player${p.lastTeam ? ` · last played for ${p.lastTeam}` : ''}`;
    const search = [p.name, p.gamertag, ...(p.aliases || []), t && t.name, t && t.abbr, t && t.division, p.lastTeam, p.rank,
      p.former ? 'former' : '', p.freeAgent ? 'free agent fa f/a ' + p.freeAgent : '', roleText].filter(Boolean).join(' ').toLowerCase();
    const best = (p.games || []).map(g => g.game).join(' · ');
    return `<a class="player-row${p.former ? ' is-former' : ''}${p.freeAgent ? ' is-fa' : ''}" href="${u(`/players/${p.slug}/`)}" data-search="${esc(search)}">
      ${t ? crest(t, 'sm') : `<span class="crest crest-sm crest-fallback" aria-hidden="true">${esc(p.freeAgent ? 'FA' : (p.lastTeam || '—'))}</span>`}
      <span class="pr-main"><strong>${esc(p.name)}</strong><span class="muted">${esc(sub)}</span></span>
      ${p.rank ? rankTag(p.rank) : ''}
      ${best ? `<span class="pr-games muted">${esc(best)}</span>` : ''}
      ${p.kd ? `<span class="kd" title="${esc(c.season || 'Season')} K/D">${esc(p.kd)} K/D</span>` : ''}
    </a>`;
  };
  const list = [...current, ...freeAgents, ...former];
  const section = (label, attr, rows) => rows.length ? `<h3 class="sub player-list-head" ${attr}>${label}</h3>${rows.map(row).join('')}` : '';
  const items = current.map(row).join('') + section('Free agents', 'data-fa-head', freeAgents) + section('Former players', 'data-former-head', former);
  const script = `<script>
(function () {
  var q = '';
  function apply() {
    var shown = 0;
    document.querySelectorAll('.player-row').forEach(function (row) {
      var hit = !q || row.dataset.search.indexOf(q) !== -1;
      row.hidden = !hit; if (hit) shown++;
    });
    var none = document.querySelector('[data-no-results]');
    if (none) none.hidden = shown !== 0;
    var fh = document.querySelector('[data-former-head]');
    if (fh) fh.hidden = !document.querySelector('.player-row.is-former:not([hidden])');
    var fah = document.querySelector('[data-fa-head]');
    if (fah) fah.hidden = !document.querySelector('.player-row.is-fa:not([hidden])');
    var count = document.querySelector('[data-result-count]');
    if (count) count.textContent = shown + (shown === 1 ? ' player' : ' players');
  }
  document.addEventListener('input', function (e) {
    if (!e.target.matches('[data-player-search]')) return;
    q = e.target.value.trim().toLowerCase();
    history.replaceState(null, '', q ? '#' + encodeURIComponent(q) : location.pathname);
    apply();
  });
  // Re-apply after a live update re-renders the list.
  document.addEventListener('ajcl:league', function () {
    setTimeout(function () { var i = document.querySelector('[data-player-search]'); if (i) i.value = q; apply(); }, 0);
  });
  q = decodeURIComponent(location.hash.slice(1) || '').toLowerCase();
  var input = document.querySelector('[data-player-search]');
  if (input) { input.value = q; if (!q) input.focus(); }
  apply();
})();
</script>`;
  const body = pageHead(c.season || 'Players', 'Players', 'Search every AJCL player: current rosters and everyone who played in past seasons.') + `
<section class="wrap"><div class="tabs page-tabs"><a class="tab active" href="${u('/players/')}">All players</a><a class="tab" href="${u('/free-agents/')}">Free agents</a></div></section>
<section class="wrap section">
  <div class="search-bar">
    <input type="search" class="search-input" data-player-search placeholder="Search by name, gamertag or team…" aria-label="Search players" autocomplete="off">
    <span class="muted" data-result-count>${list.length} players</span>
  </div>
  <div class="player-list">${items}</div>
  <p class="muted" data-no-results hidden>No players match that search.</p>
</section>`;
  return layout({ title: 'Players', active: 'players', body, c, script, page: 'players' });
}
const COD_STATS_LEAGUE = 'https://cod-stats.com/amateur-leagues/average-joes-cod-league';

// Player profile: team, role, this season's K/D, stats per game with a season
// filter (from the cod-stats season embeds), and the team's schedule.
// player.games = [{ game, total: { kd, kpm, maps }, seasons: [{ name, current, team, kd, kpm, maps }] }]
function playerPage(league, player, c) {
  const team = player.teamObj;
  const roles = player.roles.map(r => ROLE_LABELS[r] || r).join(' · ');
  // Former players (past seasons only) have no current team or schedule.
  const teamGames = team ? league.matches.filter(m => m.home.slug === team.slug || m.away.slug === team.slug) : [];
  const profileUrl = player.gamertag ? `${COD_STATS_LEAGUE}/player/${encodeURIComponent(player.gamertag)}` : null;
  // One tab per game listed on the Stats page (content.json statsGames), in that
  // order, even if the player has no games in it yet; plus any extra game in their data.
  const mine = Object.fromEntries((player.games || []).filter(g => g.seasons && g.seasons.length).map(g => [g.game, g]));
  const order = [...(c.statsGames || []).map(g => g.game), ...Object.keys(mine)].filter((g, i, a) => a.indexOf(g) === i);
  const statGames = Object.keys(mine).length ? order.map(g => mine[g] || { game: g, seasons: [] }) : [];

  const tile = (label, value, cls = '') => `<div class="stat-tile${cls}"><strong>${value == null || value === '' ? '–' : esc(value)}</strong><span>${label}</span></div>`;
  const grid = (s, extra) => `<div class="stat-grid">
      ${tile('K/D', s && s.kd, ' stat-main')}
      ${tile('Kills / map', s && s.kpm)}
      ${tile('Maps played', s && s.maps)}
      ${extra}
    </div>`;

  const matchNote = player.gamertagSource === 'name'
    ? ' Matched by Discord name. Wrong player? Link the right gamertag in Discord with <strong>/linkgamertag</strong>.' : '';

  let stats;
  if (statGames.length) {
    const gameTabs = statGames.map(g => `<a class="tab" href="#${keyOf(g.game)}" data-pgame-tab="${keyOf(g.game)}"${g.seasons.length ? ' data-has' : ''}>${esc(g.game)}</a>`).join('');
    const panels = statGames.map(g => {
      const gk = keyOf(g.game);
      if (!g.seasons.length) {
        return `<div class="pgame-panel" data-pgame="${gk}">
      <div class="panel" style="margin-top:14px"><p class="muted" style="margin:0">No ${esc(g.game)} games played yet${(c.statsGames || []).some(x => x.game === g.game && x.seasons.some(s => /szn x/i.test(s.name))) ? ` — ${esc(c.season || 'this season')} stats will show here once games are played` : ''}.</p></div>
    </div>`;
      }
      const options = [{ key: 'all', label: 'All seasons' }, ...g.seasons.map(s => ({ key: keyOf(s.name), label: s.name }))];
      return `<div class="pgame-panel" data-pgame="${gk}">
      <div class="tabs season-tabs">${options.map(o => `<a class="tab tab-sm" href="#${gk}/${o.key}" data-pseason-tab="${gk}/${o.key}">${esc(o.label)}</a>`).join('')}</div>
      <div class="pseason-panel" data-pseason="${gk}/all">
        <h3 class="sub">${esc(g.game)} · All seasons</h3>
        ${grid(g.total, tile('Seasons played', g.seasons.length))}
      </div>
      ${g.seasons.map(s => `<div class="pseason-panel" data-pseason="${gk}/${keyOf(s.name)}">
        <h3 class="sub">${esc(g.game)} · ${esc(s.name)}${s.current ? ' <span class="pill pill-live">Current</span>' : ''}</h3>
        ${grid(s, tile('Team', s.team))}
      </div>`).join('')}
    </div>`;
    }).join('');
    stats = `
    <div class="section-head"><h2 class="panel-title">Stats</h2>${profileUrl ? `<a href="${esc(profileUrl)}" target="_blank" rel="noopener">View on cod-stats ↗</a>` : ''}</div>
    <div class="tabs game-tabs">${gameTabs}</div>
    ${panels}
    <p class="muted stats-note">Stats for <strong>${esc(player.gamertag)}</strong> from each season's cod-stats.com player table.${matchNote}</p>`;
  } else {
    stats = `
    <h2 class="panel-title">Stats</h2>
    <div class="panel"><p class="muted" style="margin:0">No AJCL stats found for ${esc(player.name)} on cod-stats.com yet. If they've played before under a different name, they can link their gamertag in the AJCL Discord with <strong>/linkgamertag</strong>.</p></div>`;
  }

  // Game tabs + season filter. Hash keeps it linkable (#bo7/season-9-premier);
  // delegated so it keeps working after live.js re-renders the page.
  const script = statGames.length ? `<script>
(function () {
  function apply() {
    var games = [].map.call(document.querySelectorAll('[data-pgame-tab]'), function (t) { return t.dataset.pgameTab; });
    if (!games.length) return;
    var parts = location.hash.slice(1).split('/');
    var firstWithStats = document.querySelector('[data-pgame-tab][data-has]');
    var game = games.indexOf(parts[0]) >= 0 ? parts[0] : (firstWithStats ? firstWithStats.dataset.pgameTab : games[0]);
    var opts = [].map.call(document.querySelectorAll('[data-pgame="' + game + '"] [data-pseason-tab]'), function (t) { return t.dataset.pseasonTab; });
    var season = opts.indexOf(game + '/' + parts[1]) >= 0 ? game + '/' + parts[1] : game + '/all';
    document.querySelectorAll('[data-pgame]').forEach(function (p) { p.hidden = p.dataset.pgame !== game; });
    document.querySelectorAll('[data-pgame-tab]').forEach(function (t) { t.classList.toggle('active', t.dataset.pgameTab === game); });
    document.querySelectorAll('[data-pseason]').forEach(function (p) { p.hidden = p.dataset.pseason !== season; });
    document.querySelectorAll('[data-pseason-tab]').forEach(function (t) { t.classList.toggle('active', t.dataset.pseasonTab === season); });
  }
  document.documentElement.classList.add('js');
  addEventListener('hashchange', apply);
  apply();
})();
</script>` : '';

  const head = team ? `
  <a href="${teamHref(team)}" aria-label="${esc(team.name)}">${crest(team, 'xl')}</a>
  <div>
    <p class="eyebrow"><span class="div-tag div-${team.division.toLowerCase()}">${esc(team.division)}</span></p>
    <h1>${esc(player.name)}${player.rank ? ` ${rankTag(player.rank)}` : ''}</h1>
    <div class="team-stats">
      <div><strong>${player.kd ? esc(player.kd) : '–'}</strong><span>${esc(c.season || 'Season')} K/D</span></div>
      <div><strong class="player-team"><a href="${teamHref(team)}">${esc(team.abbr)}</a></strong><span>${esc(team.name)}</span></div>
      <div><strong class="player-role">${esc(roles)}</strong><span>Role</span></div>
    </div>
  </div>` : `
  <span class="crest crest-xl crest-fallback" aria-hidden="true">${esc(player.freeAgent ? 'FA' : (player.lastTeam || '—'))}</span>
  <div>
    <p class="eyebrow"><span class="pill${player.freeAgent ? ' pill-live' : ''}">${player.freeAgent ? esc(faLabel(player)) : 'Former player'}</span></p>
    <h1>${esc(player.name)}${player.rank ? ` ${rankTag(player.rank)}` : ''}</h1>
    <div class="team-stats">
      ${player.lastTeam ? `<div><strong>${esc(player.lastTeam)}</strong><span>Last team</span></div>` : ''}
      <div><strong>${(player.games || []).reduce((n, g) => n + g.seasons.length, 0)}</strong><span>Seasons played</span></div>
    </div>
  </div>`;
  const body = `
<section class="pagehead team-head"><div class="wrap team-head-inner">${head}
</div></section>
<section class="wrap section ${team ? 'player-layout' : 'player-solo'}">
  <div>${stats}</div>
  ${team ? `<div>
    <h2 class="panel-title">${esc(team.name)} schedule</h2>
    <div class="match-list">${teamGames.map(m => matchCard(m, { showDivision: false })).join('')}</div>
  </div>` : ''}
</section>`;
  return layout({ title: player.name, active: 'players', body, c, script, page: `player:${player.slug}` });
}

function notFound(c) {
  const body = pageHead('404', 'Page not found', "That page doesn't exist.") + `<section class="wrap section"><a class="btn btn-gold" href="${u('/')}">Back home</a></section>`;
  return layout({ title: 'Not found', active: '', body, c });
}

module.exports = { configure, matchId, matchPage, staffPage, eightsPage, announcementsPage, powerRankingsPage, settingsPage, freeAgentsPage, home, teamsPage, teamPage, playerPage, playersPage, draftPage, schedulePage, standingsPage, statsPage, joinPage, authPage, notFound };
