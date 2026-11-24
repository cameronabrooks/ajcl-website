// HTML templates for the AJCL website. Pure functions: league data in, HTML out.
// All links go through u() so the site works both at a domain root and under
// a GitHub Pages project path like /ajcl-website/.

let BASE = '';
let CSS_VERSION = '1';
let DISCORD_CLIENT_ID = '';
function configure({ base = '', cssVersion = '1', discordClientId = '' } = {}) {
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

function layout({ title, active, body, c, script = '' }) {
  const nav = [
    ['/', 'Home', 'home'],
    ['/schedule/', 'Schedule', 'schedule'],
    ['/standings/', 'Standings', 'standings'],
    ['/teams/', 'Teams', 'teams'],
    ['/stats/', 'Stats', 'stats'],
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
${TRANSITION_SCRIPT}
</head>
<body>
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
    <span>© ${new Date().getFullYear()} Average Joe's CoD League</span>
    <span class="muted">Schedules, results and rosters update automatically from the AJCL Discord.</span>
  </div>
</footer>
${script}
<script src="${u('/account.js')}?v=${CSS_VERSION}" defer></script>
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

function matchCard(m, { showDivision = true } = {}) {
  const r = m.result;
  const side = (team, maps, won) => `
    <a class="mc-team${r ? (won ? ' won' : ' lost') : ''}" href="${teamHref(team)}">
      ${crest(team, 'sm')}<span class="mc-name">${esc(team.name)}</span>
      ${r ? `<span class="mc-score">${maps}</span>` : ''}
    </a>`;
  let status;
  if (m.status === 'final') status = `<span class="pill pill-final">Final${r?.forfeit ? ' · FF' : ''}</span>`;
  else if (m.status === 'scheduled') status = `<span class="pill pill-live">${timeTag(m.time)}</span>`;
  else status = `<span class="pill">Awaiting time</span>`;
  return `<article class="match" data-teams="${esc(m.home.slug)} ${esc(m.away.slug)}">
    <div class="mc-meta">${showDivision ? `<span class="div-tag div-${m.division.toLowerCase()}">${esc(m.division)}</span>` : ''}<span class="muted">Week ${m.week}</span>${status}</div>
    ${side(m.home, r?.homeMaps, r?.winner === m.home.slug)}
    ${side(m.away, r?.awayMaps, r?.winner === m.away.slug)}
  </article>`;
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

<section class="wrap section">
  <div class="about panel">
    <div><p class="eyebrow">About the league</p><h2>Built for the average joe</h2><p>${esc(c.about || '')}</p></div>
    <div class="cta-row" style="margin-top:0">
      ${c.discordInvite ? `<a class="btn btn-gold" href="${esc(c.discordInvite)}" target="_blank" rel="noopener">Join the Discord</a>` : ''}
      <a class="btn" href="${u('/join/')}">How to join</a>
    </div>
  </div>
</section>`;
  return layout({ title: '', active: 'home', body, c });
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
  return layout({ title: 'Teams', active: 'teams', body, c });
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
    const group = (label, names) => names.length ? `<div class="roster-group"><h4>${label}</h4><ul>${names.map(n => `<li data-member="${esc(n)}">${esc(n)}</li>`).join('')}</ul></div>` : '';
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
  return layout({ title: team.name, active: 'teams', body, c });
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
  return layout({ title: 'Schedule', active: 'schedule', body, c, script });
}

function standingsPage(league, c) {
  const body = pageHead(c.season || 'Standings', 'Standings', 'Ranked by series wins, then map differential.') + `
<section class="wrap section two-col">
  ${['Premier', 'Academy'].map(d => `<div class="panel"><h2 class="panel-title div-${d.toLowerCase()}-text">${d} Division</h2>${standingsTable(league.standings[d])}</div>`).join('')}
</section>`;
  return layout({ title: 'Standings', active: 'standings', body, c });
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
  return layout({ title: 'Join', active: 'join', body, c });
}

// One cod-stats.com embed per division (content.json -> statsEmbeds), shown as tabs.
// Hash keeps it linkable (#premier / #academy); without JS both show.
function statsPage(league, c) {
  const embeds = (c.statsEmbeds || []).filter(e => e && e.url);
  const tabs = embeds.map(e => `<a class="tab" href="#${esc(e.division.toLowerCase())}" data-stats-tab="${esc(e.division.toLowerCase())}">${esc(e.division)}</a>`).join('');
  const panels = embeds.map(e => `<div class="stats-panel" data-stats-panel="${esc(e.division.toLowerCase())}">
    <h2 class="sub div-${esc(e.division.toLowerCase())}-text">${esc(e.division)}</h2>
    <div class="panel stats-embed"><iframe src="${esc(e.url)}" title="AJCL ${esc(e.division)} player stats" loading="lazy"></iframe></div>
  </div>`).join('');
  const script = embeds.length > 1 ? `<script>
(function () {
  function apply() {
    var keys = [].map.call(document.querySelectorAll('[data-stats-tab]'), function (t) { return t.dataset.statsTab; });
    var want = location.hash.slice(1);
    var cur = keys.indexOf(want) >= 0 ? want : keys[0];
    document.querySelectorAll('[data-stats-panel]').forEach(function (p) { p.hidden = p.dataset.statsPanel !== cur; });
    document.querySelectorAll('[data-stats-tab]').forEach(function (t) { t.classList.toggle('active', t.dataset.statsTab === cur); });
  }
  document.documentElement.classList.add('js');
  addEventListener('hashchange', apply);
  apply();
})();
</script>` : '';
  const body = pageHead(c.season || 'Stat Leaders', 'Player Stats', 'Season stats for every AJCL player, powered by cod-stats.com.') + `
<section class="wrap section stats">
  ${embeds.length > 1 ? `<div class="tabs">${tabs}</div>` : ''}
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

function notFound(c) {
  const body = pageHead('404', 'Page not found', "That page doesn't exist.") + `<section class="wrap section"><a class="btn btn-gold" href="${u('/')}">Back home</a></section>`;
  return layout({ title: 'Not found', active: '', body, c });
}

module.exports = { configure, home, teamsPage, teamPage, schedulePage, standingsPage, statsPage, joinPage, authPage, notFound };
