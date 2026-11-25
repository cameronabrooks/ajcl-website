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
// Each team logo's animation, based on what the team is (see public/team-anim.css).
const TEAM_ANIM = {
  atl: 'fire', car: 'carnage', syr: 'roll', sln: 'stalk', sfs: 'strike', ccc: 'peck', tor: 'dragon-blue', hal: 'soar',
  ros: 'ufo', mrd: 'dragon-red', lex: 'majestic', nor: 'reaper', kck: 'royal', pit: 'nocturnal', mis: 'slash', omh: 'sneak',
};
// data-anim + a per-team start offset so logos on the same page don't move in sync.
function teamAnim(team) {
  const a = TEAM_ANIM[team.slug];
  if (!a) return '';
  let h = 0; for (const ch of team.slug) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return ` data-anim="${a}" style="--anim-delay:-${(h % 40) / 10}s"`;
}
function crest(team, size = 'md', morph = false) {
  const vt = morph ? ` data-morph="${esc(team.slug)}"` : '';
  if (team.logo) return `<img class="crest crest-${size}" src="${esc(u(team.logo))}" alt=""${vt}${teamAnim(team)}${morph ? '' : ' loading="lazy"'}>`;
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
<link rel="icon" href="${u('/ajcl-logo.png')}?v=${CSS_VERSION}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Teko:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${u('/style.css')}?v=${CSS_VERSION}">
<link rel="stylesheet" href="${u('/team-anim.css')}?v=${CSS_VERSION}">
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
    <a class="brand" href="${u('/')}"><img src="${u('/ajcl-logo.png')}?v=${CSS_VERSION}" alt=""><span><strong>AJCL</strong><small>Average Joe's CoD League</small></span></a>
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
      <p style="margin:12px 0 0"><a href="${u(`/matches/${matchId(m)}/mapset/`)}" target="_blank" rel="noopener">Mapset screen (for the stream) ↗</a></p>
      ${mapsetVideoReady(m)
        ? `<p style="margin:6px 0 0"><a href="${u(`/matches/${matchId(m)}/mapset.mp4`)}" download="${esc(`${m.home.abbr}-vs-${m.away.abbr}-mapset.mp4`.toLowerCase())}">Download mapset video (MP4) ↓</a></p>
      <p style="margin:6px 0 0"><a href="${u(`/matches/${matchId(m)}/mapset.png`)}" download="${esc(`${m.home.abbr}-vs-${m.away.abbr}-mapset.png`.toLowerCase())}">Download mapset picture (PNG) ↓</a></p>`
        : '<p class="muted" style="margin:6px 0 0;font-size:13px">The mapset video download appears once picks &amp; bans are done.</p>'}
    </div>` : `
    <div class="panel mp-caster"><p class="eyebrow">Casting</p><p class="muted" style="margin:0">No caster yet.</p></div>`;

  // Live picks/bans: the side choice or the current step, with controls for the GMs.
  let pbLive = '';
  if (m.pbKey && m.pbSides) {
    const home = teamName(m.pbSides.home), away = teamName(m.pbSides.away);
    pbLive = `<div class="panel pb-live">
      <p class="eyebrow">Picks &amp; bans · choosing sides</p>
      <h3>${esc(home)} (home) chooses Team A or Team B</h3>
      <p class="muted">Team A goes first in several bans and picks.</p>
      <div class="pb-controls" data-pb-controls data-match="${esc(m.pbKey)}" data-teams="${esc(m.pbSides.home)},${esc(m.pbSides.away)}" hidden>
        <button type="button" class="btn btn-gold btn-sm" data-pb-side="a" data-confirm="Make ${esc(home)} Team A?">${esc(home)} will be Team A</button>
        <button type="button" class="btn btn-sm" data-pb-side="b" data-confirm="Make ${esc(away)} Team A?">${esc(away)} will be Team A</button>
        <p class="muted pb-note">Only ${esc(home)}'s Team GM (or staff) can choose.</p>
      </div>
    </div>`;
  } else if (m.pbKey && m.picksBans && m.picksBans.next) {
    const n = m.picksBans.next;
    const verb = n.action === 'ban' ? 'Ban' : 'Pick';
    pbLive = `<div class="panel pb-live">
      <p class="eyebrow">Picks &amp; bans · step ${n.step} of ${n.steps}</p>
      <h3>${esc(teamName(n.team))} ${n.action === 'ban' ? 'bans' : 'picks'} a ${esc(MODE_LABELS[n.mode] || n.mode)} map</h3>
      <p class="muted">${esc(n.desc)}</p>
      <div class="pb-controls" data-pb-controls data-match="${esc(m.pbKey)}" data-verb="${verb}" data-teams="${esc(m.picksBans.teamA)},${esc(m.picksBans.teamB)}" hidden>
        <div class="pb-maps">${(n.available || []).map(x => `<button type="button" class="pb-map${n.action === 'ban' ? ' is-ban' : ''}" data-pb-map="${esc(x)}" style="--map-img:url('${mapImage(x)}')"><span>${esc(x)}</span><em>${verb}</em></button>`).join('')}</div>
        <p class="muted pb-note">Only ${esc(teamName(n.team))}'s Team GM (or staff) can choose this one. It updates Discord too.</p>
      </div>
    </div>`;
  }

  // Match tools (GMs of these two teams + staff; the bot checks every action):
  // scheduling, result reporting and staff fixes, same as the Discord buttons/commands.
  let tools = '';
  if (m.key && m.sched) {
    const sc = m.sched, st = sc.status;
    const name = slug => (slug === m.home.slug ? m.home.name : m.away.name);
    const tzSelect = `<select name="tz"><option value="ET">Eastern (ET)</option><option value="CT">Central (CT)</option><option value="MT">Mountain (MT)</option><option value="PT">Pacific (PT)</option></select>`;
    const status = st === 'completed' ? 'Final — result reported.'
      : st === 'confirmed' || st === 'auto_scheduled' ? `Scheduled${m.time ? ` for ${timeTag(m.time)}` : ''}${st === 'auto_scheduled' ? ' (auto-scheduled)' : ''}.`
      : sc.proposal ? `Proposed: ${timeTag(sc.proposal.at)} by ${sc.proposal.by === 'staff' ? 'staff' : esc(name(sc.proposal.by === 'home' ? m.home.slug : m.away.slug))} — waiting on the other team to confirm.`
      : `Not scheduled yet${sc.deadline ? ` — deadline ${timeTag(sc.deadline)}` : ''}.`;
    const canSchedule = st === 'awaiting_schedule' || st === 'proposed';
    const canReport = st === 'confirmed' || st === 'auto_scheduled';
    tools = `
    <div class="panel mt-panel" data-pb-controls data-mt data-match="${esc(m.key)}" data-side-a="${esc(m.sideA)}" data-teams="${esc(m.home.slug)},${esc(m.away.slug)}" hidden>
      <p class="eyebrow">Match tools <span class="muted">· GMs &amp; staff</span></p>
      <p class="mt-status">${status}</p>
      ${canSchedule ? `<form class="mt-form" data-op="propose"><h5>Propose a time</h5>
        <div class="mt-row"><input type="date" name="date" required><input type="time" name="time" required>${tzSelect}<button class="btn btn-sm btn-gold" value="propose">Propose</button></div></form>` : ''}
      ${canSchedule && sc.proposal ? `<form class="mt-form" data-op="confirm"><div class="mt-row"><button class="btn btn-sm" value="confirm" data-confirm="Confirm this time for both teams?">Confirm proposed time</button></div></form>` : ''}
      ${st === 'confirmed' ? `<form class="mt-form" data-op="reschedule"><div class="mt-row"><button class="btn btn-sm" value="reschedule" data-confirm="Put this match back up for scheduling?">Reschedule</button></div></form>` : ''}
      ${canReport ? `<form class="mt-form" data-op="report"><h5>Report the result</h5>
        <div class="mt-row mt-score"><label>${esc(m.home.abbr)} <input type="number" name="home" min="0" max="9" required></label><span class="muted">–</span><label><input type="number" name="away" min="0" max="9" required> ${esc(m.away.abbr)}</label>
        <label class="mt-check"><input type="checkbox" name="forfeit"> Forfeit</label><button class="btn btn-sm btn-gold" value="report" data-confirm="Report this result? It posts in Discord and closes the match.">Report</button></div></form>` : ''}
      <div class="mt-staff" data-mt-staff hidden>
        <h5>Staff</h5>
        <form class="mt-form" data-op="set_time"><div class="mt-row"><input type="date" name="date" required><input type="time" name="time" required>${tzSelect}<button class="btn btn-sm" value="set_time" data-confirm="Set this as the confirmed match time?">Set match time</button></div></form>
        ${st !== 'completed' ? `<form class="mt-form" data-op="set_deadline"><div class="mt-row"><input type="date" name="date" required><button class="btn btn-sm" value="set_deadline">Set scheduling deadline</button></div></form>` : ''}
        <form class="mt-form" data-op="reset_pb"><div class="mt-row"><label class="mt-check"><input type="checkbox" name="restart" checked> Restart side selection</label><button class="btn btn-sm btn-danger" value="reset_pb" data-confirm="Reset picks & bans for this match?">Reset picks/bans</button></div></form>
        ${st === 'confirmed' || st === 'auto_scheduled' ? `<form class="mt-form" data-op="start_pb"><div class="mt-row"><button class="btn btn-sm" value="start_pb">Re-send Team A/B choice</button></div></form>` : ''}
      </div>
    </div>`;
  }

  // Picks & bans
  let pb = '';
  if (m.picksBans) {
    const p = m.picksBans;
    const picks = p.actions.filter(a => a.action === 'pick').sort((a, b) => (a.slot || 0) - (b.slot || 0));
    const bans = team => p.actions.filter(a => a.action === 'ban' && a.team === team);
    const label = slug => (slug === p.teamA ? 'Team A' : slug === p.teamB ? 'Team B' : '');
    pb = `
    <h2 class="panel-title">Picks &amp; bans${p.inProgress ? ' <span class="pill pill-live">In progress</span>' : ''}</h2>
    ${pbLive}
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
    ${pbLive || '<div class="panel"><p class="muted" style="margin:0">Maps will show here once the GMs finish picks &amp; bans.</p></div>'}`;
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
  <div>${tools}${caster}</div>
</section>`;
  const script = `<script>
(function () {
  // Match tools: staff-only part, and sending the forms to the bot.
  var staff = document.documentElement.classList.contains('is-staff');
  function staffParts() { document.querySelectorAll('[data-mt-staff]').forEach(function (el) { el.hidden = !staff; }); }
  document.addEventListener('ajcl:staff', function (e) { staff = !!e.detail; staffParts(); });
  document.addEventListener('ajcl:league', function () { setTimeout(staffParts, 0); });
  staffParts();
  document.addEventListener('submit', async function (e) {
    var form = e.target.closest && e.target.closest('form.mt-form');
    if (!form) return;
    e.preventDefault();
    var box = form.closest('[data-mt]');
    var btn = e.submitter || form.querySelector('button');
    if (btn && btn.dataset.confirm && !confirm(btn.dataset.confirm)) return;
    var LIVE = (document.querySelector('meta[name="ajcl-live-url"]') || {}).content || '';
    var tok = null; try { var t = JSON.parse(localStorage.getItem('ajcl_token')); tok = t && t.exp > Date.now() ? t.t : null; } catch (x) {}
    var out = form.querySelector('.mt-out') || form.appendChild(Object.assign(document.createElement('p'), { className: 'mt-out muted' }));
    if (!tok) { out.textContent = 'Log in with Discord first.'; return; }
    var body = { op: form.dataset.op, match: box.dataset.match };
    new FormData(form).forEach(function (v, k) { body[k] = v; });
    form.querySelectorAll('input[type=checkbox]').forEach(function (c) { body[c.name] = c.checked; });
    if (body.op === 'report') {
      // Scores are typed per team; the bot wants them as its Team A / Team B.
      var homeIsA = box.dataset.sideA === 'home';
      body.scoreA = homeIsA ? body.home : body.away; body.scoreB = homeIsA ? body.away : body.home;
      delete body.home; delete body.away;
    }
    form.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    out.className = 'mt-out muted'; out.textContent = 'Sending to the bot…';
    try {
      var r = await fetch(LIVE + '/private/pb-action', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) { out.className = 'mt-out is-err'; out.textContent = r.status === 401 ? 'Your Discord login expired. Log out and back in.' : (d.error || 'Could not send it.'); return; }
      for (var i = 0; i < 20; i++) {
        await new Promise(function (res) { setTimeout(res, 2000); });
        var s = await fetch(LIVE + '/private/pb-action?id=' + encodeURIComponent(d.id), { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' }).then(function (x) { return x.json(); }).catch(function () { return {}; });
        if (s.status && s.status !== 'pending') { out.className = 'mt-out ' + (s.status === 'done' ? 'is-ok' : 'is-err'); out.textContent = s.message || s.status; return; }
      }
      out.className = 'mt-out is-err'; out.textContent = 'The bot has not picked it up yet. It may be restarting; try again in a minute.';
    } catch (err) { out.className = 'mt-out is-err'; out.textContent = 'Could not reach the server. Try again.'; }
    finally { form.querySelectorAll('button').forEach(function (b) { b.disabled = false; }); }
  });
})();
</script><script>
(function () {
  var LIVE = (document.querySelector('meta[name="ajcl-live-url"]') || {}).content || '';
  var isStaff = document.documentElement.classList.contains('is-staff');
  function token() { try { var t = JSON.parse(localStorage.getItem('ajcl_token')); return t && t.exp > Date.now() ? t.t : null; } catch (e) { return null; } }
  // Buttons only for logged-in staff, or a Team GM of one of the two teams. The bot
  // checks again (right team, right turn) before doing anything.
  function apply() {
    var html = document.documentElement;
    var mine = html.dataset.myTeam || '';
    var gm = html.dataset.teamGm === '1';
    var loggedIn = !!token();
    document.querySelectorAll('[data-pb-controls]').forEach(function (el) {
      var teams = (el.dataset.teams || '').split(',');
      el.hidden = !(loggedIn && (isStaff || (gm && mine && teams.indexOf(mine) !== -1)));
    });
  }
  var toast = document.createElement('div');
  toast.className = 'staff-toast'; toast.hidden = true;
  function attach() { if (!toast.parentNode && document.body) document.body.appendChild(toast); }
  var hideTimer;
  function say(msg, kind) {
    attach();
    toast.textContent = msg; toast.className = 'staff-toast' + (kind ? ' is-' + kind : ''); toast.hidden = false;
    clearTimeout(hideTimer); if (kind) hideTimer = setTimeout(function () { toast.hidden = true; }, 9000);
  }
  var busy = false;
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-pb-map], [data-pb-side]');
    if (!b || busy) return;
    var box = b.closest('[data-pb-controls]');
    if (!box) return;
    var body = { match: box.dataset.match };
    var question;
    if (b.dataset.pbSide) { body.op = 'sides'; body.side = b.dataset.pbSide; question = b.dataset.confirm; }
    else { body.op = 'map'; body.map = b.dataset.pbMap; question = (box.dataset.verb || 'Choose') + ' ' + b.dataset.pbMap + '?'; }
    if (!confirm(question)) return;
    var t = token();
    if (!t) return say('Log in with Discord first.', 'err');
    busy = true;
    say('Sending to the bot...');
    try {
      var r = await fetch(LIVE + '/private/pb-action', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) return say(r.status === 401 ? 'Your Discord login expired. Log out and back in.' : (d.error || 'Could not send it.'), 'err');
      for (var i = 0; i < 20; i++) {
        await new Promise(function (res) { setTimeout(res, 2000); });
        var s = await fetch(LIVE + '/private/pb-action?id=' + encodeURIComponent(d.id), { headers: { Authorization: 'Bearer ' + t }, cache: 'no-store' })
          .then(function (x) { return x.json(); }).catch(function () { return {}; });
        if (s.status && s.status !== 'pending') return say(s.message || ('Result: ' + s.status), s.status === 'done' ? 'ok' : 'err');
      }
      say('The bot has not picked it up yet. It may be restarting; try again in a minute.', 'err');
    } catch (err) {
      say('Could not reach the server. Try again.', 'err');
    } finally {
      busy = false;
    }
  });
  document.addEventListener('ajcl:staff', function (e) { isStaff = !!e.detail; apply(); });
  document.addEventListener('ajcl:me', apply);
  document.addEventListener('ajcl:league', function () { setTimeout(apply, 0); });
  apply();
})();
</script>`;
  return layout({ title: `${m.home.abbr} vs ${m.away.abbr}`, active: 'schedule', body, c, script, page: `match:${matchId(m)}` });
}

// Caster mapset screen (1920x1080, for OBS): the AJCL stream overlay video (its
// sample text covered by clean pieces of the same artwork) plus the five map panels, team logos + records and each team's
// bans. The panels come in one by one like the stream overlay video and the AJCL
// logo flickers on like a neon sign. ?frame=<seconds> shows one moment of the
// animation (the build uses it to render the downloadable MP4).
const MODE_SHORT = { hardpoint: 'HP', search_and_destroy: 'SND', hijack: 'Hijack' };
const MS_SLOPE = 0.2522;                     // panel slant, measured from the artwork
// Frames are 8px at the top, 28px at the bottom, 12.3px at the sides (22px right of the last).
const MS_PANEL = { x: 26.5, step: 174.6, top: 56, bottom: 555, width: 150, side: 12.3, ft: 8, fb: 28, lastRight: 22 };
const MAPSET_SECONDS = 10;                   // length of the downloadable video
function mapsetVideoReady(m) { return !!(m.caster && m.picksBans && !m.picksBans.inProgress && m.picksBans.actions.some(a => a.action === 'pick')); }
function mapsetPage(league, m, c) {
  const p = m.picksBans || null;
  const left = p && p.teamA === m.away.slug ? m.away : m.home;   // Team A on the left
  const right = left === m.home ? m.away : m.home;
  const record = team => {
    const rows = Object.values(league.standings || {}).flat();
    const r = rows.find(x => x.team && x.team.slug === team.slug);
    return r ? `${r.w}-${r.l}` : '0-0';
  };
  const picks = p ? p.actions.filter(a => a.action === 'pick') : [];
  const slots = [1, 2, 3, 4, 5].map(n => picks.find(a => a.slot === n) || null);
  const defaultMode = ['hardpoint', 'search_and_destroy', 'hijack', 'hardpoint', 'search_and_destroy'];
  const P = MS_PANEL, h = P.bottom - P.top, S = MS_SLOPE;
  const panel = (a, i) => {
    const ix = P.x + P.step * i, fr = i === 4 ? P.lastRight : P.side;
    const top = P.top - P.ft, H = h + P.ft + P.fb;
    const TL = ix - P.side - S * P.ft, TR = ix + P.width + fr - S * P.ft;
    const BR = ix + P.width + fr + S * (h + P.fb), BL = ix - P.side + S * (h + P.fb);
    const W = BR - TL, L = v => (v - TL).toFixed(1);
    const outer = `polygon(0px 0px, ${L(TR)}px 0px, ${L(BR)}px ${H}px, ${L(BL)}px ${H}px)`;
    const inner = `polygon(${L(ix)}px ${P.ft}px, ${L(ix + P.width)}px ${P.ft}px, ${L(ix + P.width + S * h)}px ${P.ft + h}px, ${L(ix + S * h)}px ${P.ft + h}px)`;
    // Thin dark line just outside the picture (the frame's inner edge, like the artwork).
    const LW = 3;
    const line = `polygon(${L(ix - LW)}px ${P.ft - LW}px, ${L(ix + P.width + LW)}px ${P.ft - LW}px, ${L(ix + P.width + LW + S * (h + 2 * LW))}px ${P.ft + h + LW}px, ${L(ix - LW + S * (h + 2 * LW))}px ${P.ft + h + LW}px)`;
    // Map name block: same top for every panel, centred on the picture's slanted
    // middle at that height.
    const labelTop = P.ft + h - 104, labelW = P.width - 22;
    const labelMid = P.ft + h - 58 - P.ft;
    const labelLeft = (ix - TL) + S * labelMid + (P.width - labelW) / 2;
    const mode = (a && a.mode) || defaultMode[i];
    // The overlay video draws the panel frames itself; this only adds the picture and name.
    return `<div class="ms-panel" data-i="${i}" style="left:${TL.toFixed(1)}px;top:${top}px;width:${W.toFixed(1)}px;height:${H}px">
      <div class="ms-pic${a ? '' : ' is-empty'}" style="clip-path:${inner}${a ? `;--map-img:url('${mapImage(a.map)}')` : ''}"></div>
      <div class="ms-label" style="left:${labelLeft.toFixed(1)}px;top:${labelTop}px;width:${labelW}px"><span>Map ${i + 1}</span><strong>${a ? esc(a.map) : 'TBD'}</strong><em>${esc(MODE_SHORT[mode])}</em></div>
    </div>`;
  };
  const banOf = (team, mode) => {
    const x = p ? p.actions.find(a => a.action === 'ban' && a.team === team.slug && a.mode === mode) : null;
    return x ? esc(x.map) : '–';
  };
  const logo = team => team.logo ? `<img src="${esc(u(team.logo))}" alt="${esc(team.name)}"${teamAnim(team)}>` : `<span class="ms-abbr">${esc(team.abbr)}</span>`;
  const rows = ['hardpoint', 'search_and_destroy', 'hijack'].map(mode => `<div class="ms-row"><span>${banOf(left, mode)}</span><span>${MODE_SHORT[mode]}</span><span>${banOf(right, mode)}</span></div>`).join('');
  const neon = `${u('/mapset/neon.webp')}?v=${CSS_VERSION}`;
  const body = `<div class="ms-stage" data-ms-stage>
    <video class="ms-video" id="ms-video" data-live-keep src="${u('/mapset/overlay.mp4')}?v=${CSS_VERSION}" muted autoplay playsinline preload="auto"></video>
    <img class="ms-patches" src="${u('/mapset/patches.png')}?v=${CSS_VERSION}" alt="">
    <div class="ms-neon" data-ms-neon><img class="ms-neon-glow" src="${neon}" alt=""><img class="ms-neon-base" src="${neon}" alt=""></div>
    ${slots.map(panel).join('')}
    <div class="ms-rec ms-rec-l">${esc(record(left))}</div>
    <div class="ms-rec ms-rec-r">${esc(record(right))}</div>
    <div class="ms-logo ms-logo-l">${logo(left)}</div>
    <div class="ms-logo ms-logo-r">${logo(right)}</div>
    <div class="ms-title">Vetoes</div>
    <div class="ms-heads"><span class="o">Maps</span><span>Mode</span><span class="o">Maps</span></div>
    <div class="ms-vetoes">${rows}</div>
    ${p && p.inProgress ? '<div class="ms-status">Picks &amp; bans in progress</div>' : !p ? '<div class="ms-status">Waiting on picks &amp; bans</div>' : ''}
  </div>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(m.home.abbr)} vs ${esc(m.away.abbr)} · Mapset · AJCL</title>
<meta name="ajcl-base" content="${esc(BASE)}">
<meta name="ajcl-live-url" content="${esc(LIVE_URL)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Agdasima:wght@400;700&display=block" rel="stylesheet">
<link rel="stylesheet" href="${u('/team-anim.css')}?v=${CSS_VERSION}">
<style>
  html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
  main { position: fixed; inset: 0; }
  .ms-stage { position: absolute; left: 50%; top: 50%; width: 1920px; height: 1080px; transform: translate(-50%, -50%); transform-origin: center; overflow: hidden;
    background: #000;
    font-family: Agdasima, 'Arial Narrow', sans-serif; font-weight: 700; font-variant: small-caps; color: #a8f57f; }
  .ms-video, .ms-patches { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; display: block; }
  .ms-video { object-fit: cover; }
  /* AJCL logo as a neon sign: same picture on top, brightness + glow driven by the timeline. */
  .ms-neon { position: absolute; left: 1500px; top: 8px; width: 360px; height: 300px; pointer-events: none;
    -webkit-mask-image: radial-gradient(ellipse 62% 60% at 50% 48%, #000 62%, transparent 100%); mask-image: radial-gradient(ellipse 62% 60% at 50% 48%, #000 62%, transparent 100%); }
  .ms-neon img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .ms-neon-glow { filter: blur(14px) saturate(1.6); mix-blend-mode: screen; opacity: 0; }
  /* Map pictures inside the video's panel frames (same slant and size), faded in with them. */
  .ms-panel { position: absolute; opacity: 0; will-change: opacity; }
  .ms-pic { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,.85)), var(--map-img) center / cover no-repeat, #1b1c20; }
  .ms-pic.is-empty { background: linear-gradient(160deg, #2a2b30, #141518); }
  .ms-label { position: absolute; display: grid; justify-items: center; text-align: center; line-height: .95; text-shadow: 0 3px 8px rgba(0,0,0,.9); }
  .ms-label span { font-size: 22px; color: #ffcf5a; letter-spacing: .06em; }
  .ms-label strong { font-size: 38px; height: 40px; line-height: 40px; color: #fff; white-space: nowrap; overflow: hidden; display: block; max-width: 100%; }
  .ms-label em { font-style: normal; font-size: 24px; color: #a8f57f; }
  .ms-rec { position: absolute; top: 640px; width: 230px; text-align: center; font-size: 96px; line-height: 1; color: #b9f98f; text-shadow: 0 0 14px rgba(140,255,100,.55), 0 3px 8px rgba(0,0,0,.6); }
  .ms-rec-l { left: 114px; }
  .ms-rec-r { left: 1597px; }
  .ms-logo { position: absolute; top: 760px; width: 360px; height: 300px; display: grid; place-items: center; }
  .ms-logo-l { left: 49px; }
  .ms-logo-r { left: 1532px; }
  .ms-logo img { max-width: 300px; max-height: 290px; object-fit: contain; filter: drop-shadow(0 8px 20px rgba(0,0,0,.6)); }
  .ms-abbr { font-size: 120px; color: #fff; }
  .ms-title { position: absolute; left: 610px; width: 780px; top: 618px; text-align: center; font-size: 150px; line-height: 1; color: #c6ff9f;
    text-shadow: 0 0 10px rgba(150,255,110,.9), 0 0 34px rgba(110,240,80,.55), 0 4px 10px rgba(0,0,0,.5); }
  .ms-heads, .ms-row { display: grid; grid-template-columns: 1fr 230px 1fr; text-align: center; }
  .ms-heads { position: absolute; left: 572px; width: 822px; top: 770px; font-size: 62px; line-height: 1; color: #b9f98f; text-shadow: 0 3px 8px rgba(0,0,0,.6); }
  .ms-heads .o { color: #ec6a2c; }
  .ms-vetoes { position: absolute; left: 572px; width: 822px; top: 846px; }
  .ms-row { height: 68px; align-items: center; font-size: 64px; line-height: 1; color: #b9f98f; text-shadow: 0 3px 8px rgba(0,0,0,.55); }
  .ms-row span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ms-status { position: absolute; left: 30px; top: 8px; font-size: 30px; color: #ffcf5a; text-shadow: 0 2px 6px rgba(0,0,0,.9); letter-spacing: .05em; }
</style>
</head>
<body data-page="mapset:${esc(matchId(m))}">
<main>${body}</main>
<script>
(function () {
  // Scale the 1920x1080 stage to fit the window (OBS browser source or any screen).
  function fit() {
    var st = document.querySelector('[data-ms-stage]');
    if (st) st.style.transform = 'translate(-50%, -50%) scale(' + Math.min(innerWidth / 1920, innerHeight / 1080) + ')';
  }
  addEventListener('resize', fit);

  // The overlay video's own panel fade, measured from the video at 30 frames a second:
  // panel 1 starts at 0s, each next panel 0.2s later. Map pictures copy it exactly.
  var CURVE = [0, .10, .10, .32, .42, .42, .61, .68, .68, .82, .88, .88, .95, .97, .97, 1];
  var STEP = 0.2;
  function fade(t) {
    if (t <= 0) return 0;
    var f = t * 30, i = Math.floor(f);
    if (i >= CURVE.length - 1) return 1;
    return CURVE[i] + (CURVE[i + 1] - CURVE[i]) * (f - i);
  }
  function panels(t) {
    document.querySelectorAll('.ms-panel').forEach(function (el) {
      el.style.opacity = fade(t - STEP * (+el.dataset.i || 0)).toFixed(3);
    });
  }

  // AJCL logo as a neon sign: dim until 1.3s, flickers on like a fluorescent tube,
  // then keeps a soft hum with a quick dip every few seconds.
  var NEON_ON = 1.3;
  var FLICKER = [[0, 1], [0.05, 0.12], [0.11, 0.85], [0.17, 0.08], [0.3, 1], [0.36, 0.35], [0.44, 1]];
  function neonLevel(t) {
    if (t < NEON_ON) return 0;
    var r = t - NEON_ON, lvl = 1;
    for (var i = 0; i < FLICKER.length; i++) if (r >= FLICKER[i][0]) lvl = FLICKER[i][1];
    if (r > 0.5) {
      lvl = 0.94 + 0.06 * Math.sin(t * 9.0);
      if ((t - NEON_ON) % 4.7 > 4.6) lvl = 0.55;
    }
    return lvl;
  }
  function neon(t) {
    var box = document.querySelector('[data-ms-neon]');
    if (!box) return;
    var l = neonLevel(t);
    var base = box.querySelector('.ms-neon-base'), glow = box.querySelector('.ms-neon-glow');
    if (base) base.style.filter = 'brightness(' + (0.32 + 0.85 * l).toFixed(3) + ') saturate(' + (0.55 + 0.65 * l).toFixed(3) + ')';
    if (glow) glow.style.opacity = (0.9 * l).toFixed(3);
  }

  // Shrink map names that don't fit their panel.
  function fitLabels() {
    document.querySelectorAll('.ms-label strong').forEach(function (el) {
      el.style.fontSize = '';
      var size = parseFloat(getComputedStyle(el).fontSize) || 38;
      while (el.scrollWidth > el.clientWidth + 1 && size > 20) { size -= 1; el.style.fontSize = size + 'px'; }
    });
  }

  function video() { return document.getElementById('ms-video'); }
  function videoEnd(v) { return Math.max(0, (v && v.duration || 5) - 0.02); }
  // Put the video at time t (held on its last frame after it ends).
  function seek(t) {
    var v = video();
    if (!v) return Promise.resolve();
    var target = Math.min(t, videoEnd(v));
    if (Math.abs(v.currentTime - target) < 0.001) return Promise.resolve();
    return new Promise(function (res) {
      var done = function () { v.removeEventListener('seeked', done); res(); };
      v.addEventListener('seeked', done);
      v.currentTime = target;
      setTimeout(done, 3000);
    });
  }

  // Everything the screen shows must be loaded first.
  function loaded() {
    var urls = [];
    document.querySelectorAll('.ms-pic').forEach(function (el) {
      var m = /url\\(["']?([^"')]+)["']?\\)/.exec(el.style.getPropertyValue('--map-img') || '');
      if (m) urls.push(m[1]);
    });
    var imgs = [].slice.call(document.querySelectorAll('.ms-stage img'));
    var waits = urls.map(function (src) { return new Promise(function (r) { var i = new Image(); i.onload = i.onerror = r; i.src = src; }); })
      .concat(imgs.map(function (img) { return img.complete ? null : new Promise(function (r) { img.onload = img.onerror = r; }); }));
    var v = video();
    if (v && !layerOnly && v.readyState < 2) waits.push(new Promise(function (r) { v.addEventListener('loadeddata', r, { once: true }); v.addEventListener('error', r, { once: true }); }));
    if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
    return Promise.all(waits);
  }

  // One moment of the whole screen (the video build calls this for every frame).
  // Team logo animations (CSS) are stepped to the same moment, so the video build
  // captures them frame by frame.
  function logosAt(t) {
    if (!document.getAnimations) return;
    document.getAnimations().forEach(function (a) { try { a.pause(); a.currentTime = t * 1000; } catch (e) {} });
  }
  window.__msShow = function (t) {
    lastT = t;
    logosAt(t);
    if (layerOnly) { panels(t); neon(t); return Promise.resolve(); }
    return seek(t).then(function () { panels(t); neon(t); });
  };

  var frameParam = /[?&]frame=([\\d.]+)/.exec(location.search);
  // ?layer: only this page's layer on a see-through background (the video build puts
  // it over the original overlay video with ffmpeg).
  var layerOnly = /[?&]layer\\b/.test(location.search);
  if (layerOnly) {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    var st0 = document.querySelector('[data-ms-stage]'); if (st0) st0.style.background = 'transparent';
    var vv = document.getElementById('ms-video'); if (vv) { vv.pause(); vv.style.display = 'none'; vv.removeAttribute('src'); vv.load(); }
  }
  var t0 = 0, running = false, lastT = 0;
  function tick() {
    var v = video();
    // Panels follow the video's clock; the neon follows time since the screen started.
    var tv = !v ? 99 : v.ended ? 99 : v.currentTime;
    lastT = tv;
    panels(tv);
    neon((performance.now() - t0) / 1000);
    requestAnimationFrame(tick);
  }
  function start() {
    fit(); fitLabels();
    var v = video();
    if (frameParam) {
      if (v) { v.pause(); v.removeAttribute('autoplay'); }
      window.__msShow(parseFloat(frameParam[1])).then(function () { window.__msReady = true; });
      return;
    }
    if (running) return;
    running = true; t0 = performance.now();
    if (v) {
      var p = v.play && v.play();
      // Autoplay blocked: show the finished screen.
      if (p && p.catch) p.catch(function () { seek(99); });
      v.addEventListener('error', function () { panels(99); });
    }
    requestAnimationFrame(tick);
  }
  // live.js re-renders the page: the video is kept (data-live-keep), the rest redrawn.
  // Live updates redraw the panels: put them back in their current state.
  document.addEventListener('ajcl:league', function () {
    setTimeout(function () {
      fit(); fitLabels();
      var t = frameParam ? parseFloat(frameParam[1]) : lastT;
      panels(t);
      neon(frameParam ? t : (performance.now() - t0) / 1000);
    }, 0);
  });
  fit();
  panels(0); neon(0);
  if (frameParam) { var v0 = video(); if (v0) v0.pause(); }
  loaded().then(start);
})();
</script>
${LIVE_URL ? `<script src="${u('/app.js')}?v=${CSS_VERSION}" defer></script>
<script src="${u('/live.js')}?v=${CSS_VERSION}" defer></script>` : ''}
</body>
</html>`;
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
    <img class="hero-logo" src="${u('/ajcl-logo.png')}?v=${CSS_VERSION}" alt="Average Joe's CoD League logo">
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

// ── GM / staff / player roster tools ──────────────────────────────────────────
// Every button runs the matching Discord command in the bot (same rules, posts
// and DMs). Shown only to the people who can use them; the bot checks again.
const RANK_CHOICES = ['Emerald', 'Ruby', 'Amethyst', 'Kyanite', 'Amber', 'Unranked'];
function rtOption(p) { return `<option value="${esc(p.discordId)}">${esc(p.name)}${p.rank ? ` — ${esc(p.rank)}` : ''}</option>`; }
function rtForm(cmd, inner, title, confirm) {
  return `<form class="rt-form" data-cmd="${cmd}"${confirm ? ` data-confirm="${esc(confirm)}"` : ''}>${title ? `<h5>${title}</h5>` : ''}<div class="mt-row">${inner}</div><p class="mt-out muted"></p></form>`;
}

function teamTools(league, team) {
  if (!team.roleId) return '';
  const byName = (a, b) => a.name.localeCompare(b.name);
  const withId = p => p.discordId;
  const fas = league.players.filter(p => p.freeAgent && withId(p)).sort(byName);
  const mine = league.players.filter(p => p.team === team.slug && !p.former && withId(p)).sort(byName);
  const others = league.teams.filter(t => t.slug !== team.slug && t.roleId);
  const rosterOf = {};
  for (const t of others) rosterOf[t.slug] = league.players.filter(p => p.team === t.slug && !p.former && withId(p)).sort(byName).map(p => ({ id: p.discordId, name: p.name }));
  const moves = league.rosterMoves || [];
  const incoming = moves.filter(x => x.type === 'trade' && x.to === team.slug);
  const outgoing = moves.filter(x => x.type === 'trade' && x.from === team.slug);
  const offers = moves.filter(x => x.type === 'offer' && x.team === team.slug);
  const teamName = slug => (league.teams.find(t => t.slug === slug) || {}).name || slug;
  const faSelect = `<select name="player" required><option value="">Pick a free agent…</option>${fas.map(rtOption).join('')}</select>`;
  const mineSelect = (name, list = mine) => `<select name="${name}" required><option value="">Pick a player…</option>${list.map(rtOption).join('')}</select>`;
  // Same players Discord's drop lists offer: GMs can't drop coaches, GMs, players on
  // several teams or non-playing members; staff can't drop coaches/non-playing.
  const gmDroppable = mine.filter(p => p.dropGm !== false);
  const staffDroppable = mine.filter(p => p.dropStaff !== false);
  const dropFlags = `<label class="mt-check"><input type="checkbox" name="self_drop"> Player asked to leave (self-drop)</label><label class="mt-check"><input type="checkbox" name="rerank"> Re-rank the player</label>`;
  const moveRow = (x, buttons) => `<div class="rt-move"><span>${x.type === 'trade' ? `${esc(teamName(x.from))} gives <strong>${esc(x.give)}</strong> for <strong>${esc(x.get)}</strong> (${esc(teamName(x.to))})` : `Offer to <strong>${esc(x.player)}</strong>`}</span>${buttons || ''}</div>`;
  const pending = (incoming.length || outgoing.length || offers.length) ? `<div class="rt-pending">
      ${incoming.length ? `<h5>Trade offers for you</h5>${incoming.map(x => moveRow(x, `<form class="rt-form rt-inline" data-cmd="trade_accept" data-confirm="Accept this trade? Players switch teams right away."><input type="hidden" name="move" value="${esc(x.id)}"><button class="btn btn-sm btn-gold">Accept</button><p class="mt-out muted"></p></form><form class="rt-form rt-inline" data-cmd="trade_decline"><input type="hidden" name="move" value="${esc(x.id)}"><button class="btn btn-sm">Decline</button><p class="mt-out muted"></p></form>`)).join('')}` : ''}
      ${outgoing.length ? `<h5>Your trade proposals (waiting)</h5>${outgoing.map(x => moveRow(x)).join('')}` : ''}
      ${offers.length ? `<h5>Contract offers sent (waiting on the player)</h5>${offers.map(x => moveRow(x)).join('')}` : ''}
    </div>` : '';
  return `<section class="wrap section rt-section" data-rt-team="${esc(team.slug)}">
  <div class="panel rt-panel" data-rt-gm hidden>
    <p class="eyebrow">GM tools · ${esc(team.name)}</p>
    ${pending}
    <div class="rt-grid">
      ${rtForm('offer', faSelect + '<input name="notes" placeholder="Notes (optional)" maxlength="200"><button class="btn btn-sm btn-gold">Send offer</button>', 'Offer a free agent', 'Send this contract offer?')}
      ${rtForm('drop', mineSelect('player', gmDroppable) + dropFlags + '<button class="btn btn-sm btn-danger">Drop</button>', 'Drop a player', 'Drop this player from the roster?')}
      <form class="rt-form" data-cmd="trade" data-confirm="Send this trade proposal?" data-rosters="${esc(JSON.stringify(rosterOf))}"><h5>Propose a trade</h5><div class="mt-row">
        ${mineSelect('your_player')}<span class="muted">for</span>
        <select data-rt-team-pick required><option value="">Their team…</option>${others.map(t => `<option value="${esc(t.slug)}">${esc(t.name)}</option>`).join('')}</select>
        <select name="their_player" required><option value="">Their player…</option></select>
        <input name="notes" placeholder="Notes (optional)" maxlength="200"><button class="btn btn-sm btn-gold">Propose</button></div><p class="mt-out muted"></p></form>
      ${rtForm('esub', `<select name="rank" required>${RANK_CHOICES.map(r => `<option>${r}</option>`).join('')}</select><select name="league" required><option${team.division === 'Premier' ? ' selected' : ''}>Premier</option><option${team.division === 'Academy' ? ' selected' : ''}>Academy</option></select><input name="datetime" placeholder="When? e.g. Tonight 9 PM ET" required maxlength="80"><input type="hidden" name="team" value="${esc(team.roleId)}"><button class="btn btn-sm">Post request</button>`, 'Emergency sub request', 'Post this emergency sub request in free-agent-chat?')}
    </div>
  </div>
  <div class="panel rt-panel rt-staff" data-rt-staff hidden>
    <p class="eyebrow">Staff tools · ${esc(team.name)}</p>
    <div class="rt-grid">
      ${rtForm('commoffer', faSelect + `<input type="hidden" name="team" value="${esc(team.roleId)}"><input name="notes" placeholder="Notes (optional)" maxlength="200"><button class="btn btn-sm btn-gold">Offer to ${esc(team.abbr)}</button>`, 'Offer a free agent to this team', `Offer this player to ${team.name}?`)}
      ${rtForm('commdrop', mineSelect('player', staffDroppable) + `<input type="hidden" name="team" value="${esc(team.roleId)}">` + dropFlags + '<button class="btn btn-sm btn-danger">Drop</button>', 'Drop a player from this team', 'Drop this player from the team?')}
      ${rtForm('clearteamneeds', `<input type="hidden" name="team" value="${esc(team.roleId)}"><button class="btn btn-sm">Clear rank requirement</button>`, 'Pending rank requirement', `Clear ${team.name}'s pending rank requirement?`)}
      ${rtForm('removesuspension', `<select name="player" required><option value="">Pick a player…</option>${fas.map(rtOption).join('')}</select><button class="btn btn-sm">Remove suspension</button>`, 'Remove a self-drop suspension', 'Remove this player\'s self-drop suspension?')}
    </div>
  </div>
</section>`;
}

// Free Agents page: emergency sub requests (accept / back out) and the logged-in
// player's own contract offers (accept / decline).
function playerTools(league) {
  const subs = league.esubs || [];
  const offers = (league.rosterMoves || []).filter(x => x.type === 'offer');
  const teamName = slug => (league.teams.find(t => t.slug === slug) || {}).name || slug;
  const sub = s => `<div class="panel rt-sub${s.accepted ? ' is-taken' : ''}">
      <div><strong>${esc(s.teamName || teamName(s.team))}</strong> needs a <strong>${esc(s.rank)}</strong> sub · ${esc(s.league)}<br><span class="muted">${esc(s.datetime)}</span></div>
      ${s.accepted
        ? `<div class="rt-sub-side"><span class="pill">Taken by ${esc(s.accepted)}</span><form class="rt-form rt-inline" data-cmd="esub_backout" data-mine-hash="${esc(s.acceptedHash || '')}" data-confirm="Back out of this sub request?" hidden><input type="hidden" name="request" value="${esc(s.id)}"><button class="btn btn-sm">Back out</button><p class="mt-out muted"></p></form></div>`
        : `<form class="rt-form rt-inline" data-cmd="esub_accept" data-login data-confirm="Accept this sub request? You'll get the team's role for the match."><input type="hidden" name="request" value="${esc(s.id)}"><button class="btn btn-sm btn-gold">Accept</button><p class="mt-out muted"></p></form>`}
    </div>`;
  return `<section class="wrap section rt-section">
  <div class="rt-player-offers" data-rt-offers hidden>
    <h2 class="panel-title">Your contract offers</h2>
    ${offers.map(o => `<div class="panel rt-sub" data-mine-hash="${esc(o.playerHash || '')}" hidden><div><strong>${esc(teamName(o.team))}</strong> offered you a contract.</div>
      <div class="rt-sub-side"><form class="rt-form rt-inline" data-cmd="offer_accept" data-confirm="Accept this offer and join the team?"><input type="hidden" name="move" value="${esc(o.id)}"><button class="btn btn-sm btn-gold">Accept</button><p class="mt-out muted"></p></form>
      <form class="rt-form rt-inline" data-cmd="offer_decline"><input type="hidden" name="move" value="${esc(o.id)}"><button class="btn btn-sm">Decline</button><p class="mt-out muted"></p></form></div></div>`).join('')}
  </div>
  <h2 class="panel-title">Emergency sub requests</h2>
  <p class="muted">Free agents with the requested rank can accept. Log in with Discord first.</p>
  ${subs.length ? `<div class="rt-subs">${subs.map(sub).join('')}</div>` : '<div class="panel"><p class="muted" style="margin:0">No sub requests right now.</p></div>'}
</section>`;
}

const ROSTER_TOOLS_SCRIPT = `<script>
(function () {
  // Who's looking: staff (checked by the AJCL server), Team GM of which team, and
  // their member hash (to find their own offers / accepted subs).
  var html = document.documentElement;
  var staff = html.classList.contains('is-staff');
  function me() { try { return JSON.parse(localStorage.getItem('ajcl_user') || 'null'); } catch (e) { return null; } }
  function token() { try { var t = JSON.parse(localStorage.getItem('ajcl_token')); return t && t.exp > Date.now() ? t.t : null; } catch (e) { return null; } }
  function apply() {
    var u = me(), myHash = u && u.hash, loggedIn = !!token();
    var myTeam = html.dataset.myTeam || '', gm = html.dataset.teamGm === '1';
    document.querySelectorAll('[data-rt-team]').forEach(function (sec) {
      var g = sec.querySelector('[data-rt-gm]'); if (g) g.hidden = !(loggedIn && gm && myTeam === sec.dataset.rtTeam);
      var s = sec.querySelector('[data-rt-staff]'); if (s) s.hidden = !(loggedIn && staff);
    });
    var anyOffer = false;
    document.querySelectorAll('[data-mine-hash]').forEach(function (el) {
      var mine = loggedIn && myHash && el.dataset.mineHash === myHash;
      el.hidden = !mine; if (mine && el.closest('[data-rt-offers]')) anyOffer = true;
    });
    var box = document.querySelector('[data-rt-offers]'); if (box) box.hidden = !anyOffer;
  }
  // Trade form: their team -> their roster.
  document.addEventListener('change', function (e) {
    var pick = e.target.closest && e.target.closest('[data-rt-team-pick]');
    if (!pick) return;
    var form = pick.closest('form'), sel = form.querySelector('[name="their_player"]');
    var rosters = {}; try { rosters = JSON.parse(form.dataset.rosters || '{}'); } catch (x) {}
    sel.innerHTML = '<option value="">Their player…</option>' + (rosters[pick.value] || []).map(function (p) {
      var o = document.createElement('option'); o.value = p.id; o.textContent = p.name; return o.outerHTML;
    }).join('');
  });
  document.addEventListener('submit', async function (e) {
    var form = e.target.closest && e.target.closest('form.rt-form');
    if (!form) return;
    e.preventDefault();
    if (form.dataset.confirm && !confirm(form.dataset.confirm)) return;
    var out = form.querySelector('.mt-out');
    var say = function (t, k) { if (out) { out.className = 'mt-out ' + (k || 'muted'); out.textContent = t; } };
    var tok = token();
    if (!tok) return say('Log in with Discord first.', 'is-err');
    var options = {};
    new FormData(form).forEach(function (v, k) { if (v !== '') options[k] = v; });
    form.querySelectorAll('input[type=checkbox]').forEach(function (c) { options[c.name] = c.checked; });
    var LIVE = (document.querySelector('meta[name="ajcl-live-url"]') || {}).content || '';
    form.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    say('Sending to the bot…');
    try {
      var r = await fetch(LIVE + '/private/pb-action', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'cmd', command: form.dataset.cmd, options: options }) });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) return say(r.status === 401 ? 'Your Discord login expired. Log out and back in.' : (d.error || 'Could not send it.'), 'is-err');
      for (var i = 0; i < 20; i++) {
        await new Promise(function (res) { setTimeout(res, 2000); });
        var s = await fetch(LIVE + '/private/pb-action?id=' + encodeURIComponent(d.id), { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' }).then(function (x) { return x.json(); }).catch(function () { return {}; });
        if (s.status && s.status !== 'pending') return say(s.message || s.status, s.status === 'done' ? 'is-ok' : 'is-err');
      }
      say('The bot has not picked it up yet. It may be restarting; try again in a minute.', 'is-err');
    } catch (err) { say('Could not reach the server. Try again.', 'is-err'); }
    finally { form.querySelectorAll('button').forEach(function (b) { b.disabled = false; }); }
  });
  document.addEventListener('ajcl:staff', function (e) { staff = !!e.detail; apply(); });
  document.addEventListener('ajcl:me', apply);
  document.addEventListener('ajcl:league', function () { setTimeout(apply, 0); });
  apply();
})();
</script>`;

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
</section>
${teamTools(league, team)}`;
  return layout({ title: team.name, active: 'teams', body, c, script: ROSTER_TOOLS_SCRIPT, page: `team:${team.slug}` });
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
// 8s staff tools (staff only). Every button maps to a Discord 8s command; the
// ajcl-live Worker checks the Discord login + staff list, then the bot runs it.
const EIGHTS_QUEUES = [
  ['1532249725380591676', 'Open 8s Queue'],
  ['1532289923141472296', 'League 8s Queue'],
  ['1532290092096295104', 'Academy 8s Queue'],
];
function eightsStaffTools(league) {
  const names = new Set();
  for (const p of league.players || []) if (!p.former) names.add(p.name);
  for (const b of league.eightsLeaderboards || []) for (const r of b.players || []) if (r.name !== 'Former member') names.add(r.name);
  for (const q of league.queues || []) for (const n of q.players || []) names.add(n);
  for (const n of league.eightsMembers || []) names.add(n); // everyone with the 8mans role
  const btn = (op, label, confirm, cls = '') => `<button type="submit" class="btn btn-sm${cls ? ' ' + cls : ''}" value="${op}"${confirm ? ` data-confirm="${esc(confirm)}"` : ''}>${label}</button>`;
  const playerInput = (name = 'player', ph = 'Player name') => `<input name="${name}" list="st-players" placeholder="${ph}" autocomplete="off" required>`;
  const form = (inner, title) => `<form class="st-form">${title ? `<h5>${title}</h5>` : ''}<div class="st-row">${inner}</div><p class="st-out muted" aria-live="polite"></p></form>`;
  return `<section class="wrap section staff-block" id="staff-tools" data-live-keep>
  <details class="panel st-panel" open>
    <summary><span>8s staff tools</span><span class="pill">Staff only</span></summary>
    <datalist id="st-players">${[...names].sort((a, b) => a.localeCompare(b)).map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <div class="st-grid">
      <div class="st-group"><h4>Queue</h4>
        <label class="st-queue st-group-queue">Which queue <select data-group-queue>${EIGHTS_QUEUES.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label>
        ${form(btn('start', 'Start') + btn('stop', 'Stop', 'Stop {queue}? This removes the queue embed.') + btn('lock', 'Lock') + btn('unlock', 'Unlock') + btn('testmode', 'Test mode on/off') + btn('clear', 'Clear queue', 'Remove everyone from {queue}?'))}
        ${form('<input name="name" placeholder="New queue name" required maxlength="80">' + btn('rename', 'Rename'), 'Rename')}
        ${form(playerInput() + btn('kick', 'Remove from queue'), 'Remove a player')}
      </div>
      <div class="st-group"><h4>Match</h4>
        <label class="st-queue st-group-queue">Which queue <select data-st-queue>${EIGHTS_QUEUES.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label>
        <div class="st-matches" data-st-matches data-queues="${esc(JSON.stringify((league.queues || []).map(q => ({ id: q.id || null, name: q.name, match: q.match }))))}"></div>
        ${form(btn('decide_method', 'Decide captain method') + btn('decide_format', 'Decide format') + btn('end_captain_vote', 'End captain vote') + btn('random_captains', 'Random captains'), 'Votes')}
        ${form('<input type="hidden" name="winner" value="A">' + btn('winner', '🔵 Team 1 won', 'Set Team 1 as the winner in {queue}? This updates ratings and ends the match.'), 'Set winner')}
        ${form('<input type="hidden" name="winner" value="B">' + btn('winner', '🔴 Team 2 won', 'Set Team 2 as the winner in {queue}? This updates ratings and ends the match.'))}
        ${form(btn('cancel_match', 'Cancel match', 'Cancel the match in {queue}? No result is recorded.', 'btn-danger'))}
        ${form(playerInput('player', 'Player out') + playerInput('substitute', 'Player in') + btn('sub', 'Sub'), 'Substitute')}
      </div>
      <div class="st-group"><h4>Bans</h4>
        ${form(playerInput() + '<input name="reason" placeholder="Reason (optional)" maxlength="300"><input name="duration" type="number" min="1" placeholder="Length"><select name="unit"><option value="">Permanent</option><option value="minutes">Minutes</option><option value="hours">Hours</option><option value="days">Days</option></select>' + btn('ban', 'Ban', 'Ban {player} from 8s?', 'btn-danger'), 'Ban')}
        ${form(playerInput() + btn('unban', 'Unban') + btn('ban_check', 'Check ban'), 'Unban / check')}
      </div>
      <div class="st-group"><h4>Ratings</h4>
        <label class="st-queue st-group-queue">Queue for ratings <select data-group-queue>${EIGHTS_QUEUES.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label>
        ${form(playerInput() + btn('view_stats', 'View stats'), 'View')}
        ${form(playerInput() + '<input name="mmr" type="number" step="any" placeholder="MMR"><input name="wins" type="number" placeholder="Wins"><input name="losses" type="number" placeholder="Losses"><input name="streak" type="number" placeholder="Streak (set only)">' + btn('set_stats', 'Set to these') + btn('add_stats', 'Add these'), 'Edit stats')}
        ${form(playerInput() + '<label class="st-check"><input type="checkbox" name="mmrOnly"> MMR only</label>' + btn('reset_player', 'Reset player', "Reset {player}'s rating in {queue}?", 'btn-danger'), 'Reset a player')}
        ${form('<input name="confirm" placeholder="Type the queue name to confirm" required><label class="st-check"><input type="checkbox" name="mmrOnly"> MMR only</label>' + btn('reset_all', 'Reset whole queue', 'Reset ALL ratings in {queue}? This cannot be undone.', 'btn-danger'), 'Reset everyone in the queue')}
      </div>
    </div>
  </details>
</section>`;
}

function eightsPage(league, c) {
  const queues = league.queues; // undefined in the static build until the live feed loads
  const queueCard = q => {
    const m = q.match;
    const pct = Math.min(100, Math.round((q.count / (q.size || 8)) * 100));
    const team = (label, list) => `<div class="q-team"><h5>${label}</h5><ul>${list.map(n => `<li>${esc(n)}</li>`).join('') || '<li class="muted">Picking…</li>'}</ul></div>`;
    return `<article class="panel queue-card">
      <div class="q-head">
        <h3>${esc(q.name)}${/\b8s\b/i.test(q.name) ? '' : ' 8s'}</h3>
        ${q.locked ? '<span class="pill">Locked</span>' : `<span class="pill pill-live"><span class="live-dot"></span>${q.count}/${q.size || 8} in queue</span>`}
      </div>
      <div class="q-bar"><span style="width:${pct}%"></span></div>
      <div class="q-players">${q.players.map(n => `<span class="map-chip">${esc(n)}</span>`).join('') || '<span class="muted">Queue is empty — join in the AJCL Discord.</span>'}</div>
      ${(league.eightsLeaderboards || []).some(b => b.key === keyOf(q.name)) ? `<a class="q-lb-link" href="#lb-${esc(keyOf(q.name))}">View ${esc(q.name)} leaderboard →</a>` : ''}
      ${m ? `<div class="q-match">
        <div class="q-match-head"><strong>Match ${m.number ? `#${esc(m.number)}` : ''}</strong><span class="pill pill-live">${esc(m.phase)}</span>${m.format ? `<span class="muted">${esc(m.format)}</span>` : ''}</div>
        ${m.maps ? `<div class="q-maps">${m.maps.map((x, i) => `<div class="q-map" style="--map-img:url('${mapImage(x.map)}')"><span>Map ${i + 1}</span><strong>${esc(x.map)}</strong><em>${esc(MODE_LABELS[x.mode] || x.mode || '')}</em></div>`).join('')}</div>` : ''}
        ${(m.teamA.length || m.teamB.length) ? `<div class="q-teams">${team('🔵 Team 1', m.teamA)}${team('🔴 Team 2', m.teamB)}</div>` : (m.players.length ? `<div class="q-players">${m.players.map(n => `<span class="map-chip">${esc(n)}</span>`).join('')}</div>` : '')}
        ${m.number && m.phase === 'Match in progress' && m.teamA.length && m.teamB.length ? `<div class="q-staff staff-only" data-queue="${esc(q.name)}" data-match="${esc(m.number)}">
          <span class="q-staff-label">Staff override</span>
          <button type="button" class="btn btn-sm" data-winner="A">🔵 Team 1 won</button>
          <button type="button" class="btn btn-sm" data-winner="B">🔴 Team 2 won</button>
        </div>` : ''}
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
  // Recent finished matches in a queue: winner first, rating changes per player.
  const dateText = ts => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
  const resultRows = list => (list || []).map(r => {
    const side = (label, team, won) => `<div class="qr-team${won ? ' is-win' : ''}">
        <h5>${label}${won ? ' <span class="pill pill-win">Won</span>' : ''}</h5>
        <ul>${team.map(p => `<li><span>${esc(p.name)}</span>${p.delta != null ? `<em class="${p.delta >= 0 ? 'pos' : 'neg'}">${p.delta >= 0 ? '+' : ''}${p.delta}</em>` : ''}</li>`).join('')}</ul>
      </div>`;
    return `<article class="panel qr-card">
      <div class="qr-head"><strong>Match ${r.number ? '#' + esc(r.number) : ''}</strong><span class="muted">${esc(dateText(r.at))}${r.format ? ' · ' + esc(r.format) : ''}</span>${r.byStaff ? '<span class="pill">Staff decided</span>' : ''}</div>
      <div class="qr-teams">${side('🔵 Team 1', r.teamA, r.winner === 'A')}${side('🔴 Team 2', r.teamB, r.winner === 'B')}</div>
    </article>`;
  }).join('');
  // Newest 6 up front; the rest behind a "Show all" toggle so the leaderboard stays close.
  const results = b => {
    const list = b.results || [];
    if (!list.length) return `<p class="muted qr-none">No finished ${esc(b.name)} matches recorded yet.</p>`;
    const more = list.slice(6);
    return `<h3 class="sub qr-title">${esc(b.name)} results <span class="muted">· ${list.length} match${list.length === 1 ? '' : 'es'}</span></h3>
    <div class="qr-list">${resultRows(list.slice(0, 6))}</div>
    ${more.length ? `<details class="qr-more"><summary>Show all ${list.length} results</summary><div class="qr-list">${resultRows(more)}</div></details>` : ''}`;
  };
  const leaderboard = boards.length ? `
  ${boards.length > 1 ? `<div class="tabs lb-tabs">${boards.map(b => `<a class="tab" href="#lb-${esc(b.key)}" data-lb-tab="${esc(b.key)}">${esc(b.name)}</a>`).join('')}</div>` : ''}
  ${boards.map(b => `<div class="lb-panel" data-lb="${esc(b.key)}">
    <h3 class="sub">${esc(b.name)} leaderboard <span class="muted">· top ${b.players.length} by MMR</span></h3>
    ${table(b.players)}
  </div>`).join('')}` : '<p class="muted">No ratings yet — play some 8s matches in the AJCL Discord!</p>';
  // Results section (right under the live queues). Same queue tabs: they share the
  // data-lb keys, so picking a queue in either section switches both.
  const resultsSection = boards.length ? `
  ${boards.length > 1 ? `<div class="tabs qr-tabs">${boards.map(b => `<a class="tab" href="#lb-${esc(b.key)}" data-lb-tab="${esc(b.key)}">${esc(b.name)}</a>`).join('')}</div>` : ''}
  ${boards.map(b => `<div class="qr-panel" data-lb="${esc(b.key)}">${results(b)}</div>`).join('')}` : '<p class="muted">No finished matches yet.</p>';
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
  // Only a real address change scrolls; live.js fires a synthetic one after each update.
  addEventListener('hashchange', function (e) { if (e.isTrusted) showChosen(); else apply(); });
  // Clicking a link to the tab that's already in the address bar doesn't fire hashchange.
  document.addEventListener('click', function (e) {
    // The queue tabs themselves just switch in place (no jump to the leaderboard).
    var tab = e.target.closest && e.target.closest('[data-lb-tab]');
    if (tab) { e.preventDefault(); history.replaceState(null, '', '#lb-' + tab.dataset.lbTab); apply(); return; }
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
${eightsStaffTools(league)}
<section class="wrap section" id="results">
  <div class="section-head"><h2>Queue results</h2><span class="muted">${boards.length > 1 ? 'Pick a queue' : ''}</span></div>
  ${resultsSection}
</section>
<section class="wrap section">
  <div class="section-head"><h2>Leaderboards</h2><span class="muted">${boards.length > 1 ? 'Pick a queue' : ''}</span></div>
  ${leaderboard}
</section>`;
  // Staff override: only shown to staff (account.js adds html.is-staff); the Worker
  // re-checks the Discord login and staff list before the bot applies anything.
  const staffScript = `<script>
(function () {
  var LIVE = (document.querySelector('meta[name="ajcl-live-url"]') || {}).content || '';
  var toast = document.createElement('div');
  toast.className = 'staff-toast'; toast.hidden = true;
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(toast); });
  if (document.body) document.body.appendChild(toast);
  var hideTimer;
  function say(msg, kind) {
    toast.textContent = msg; toast.className = 'staff-toast' + (kind ? ' is-' + kind : ''); toast.hidden = false;
    clearTimeout(hideTimer); if (kind) hideTimer = setTimeout(function () { toast.hidden = true; }, 8000);
  }
  function token() { try { var t = JSON.parse(localStorage.getItem('ajcl_token')); return t && t.exp > Date.now() ? t.t : null; } catch (e) { return null; } }
  function setBusy(box, busy) { box.querySelectorAll('button').forEach(function (b) { b.disabled = busy; }); }
  document.addEventListener('click', async function (e) {
    var btn = e.target.closest('.q-staff [data-winner]');
    if (!btn) return;
    var box = btn.closest('.q-staff');
    var team = btn.dataset.winner === 'A' ? 'Team 1' : 'Team 2';
    var what = box.dataset.queue + ' match #' + box.dataset.match;
    if (!confirm('Set ' + team + ' as the winner of ' + what + '? This updates ratings and ends the match.')) return;
    var t = token();
    if (!t) return say('Log in with Discord first (log out and back in if you already are).', 'err');
    setBusy(box, true);
    say('Sending to the bot...');
    try {
      var r = await fetch(LIVE + '/private/8s-winner', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ queue: box.dataset.queue, match: Number(box.dataset.match), winner: btn.dataset.winner }) });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) {
        setBusy(box, false);
        return say(r.status === 403 ? 'Only staff can do that.' : r.status === 401 ? 'Your Discord login expired. Log out and back in.' : (d.error || 'Could not send it.'), 'err');
      }
      say('Sent. Waiting for the bot to apply it...');
      for (var i = 0; i < 20; i++) {
        await new Promise(function (res) { setTimeout(res, 3000); });
        var s = await fetch(LIVE + '/private/8s-winner?id=' + encodeURIComponent(d.id), { headers: { Authorization: 'Bearer ' + t }, cache: 'no-store' })
          .then(function (x) { return x.json(); }).catch(function () { return {}; });
        if (s.status && s.status !== 'pending') return say(s.message || ('Result: ' + s.status), s.status === 'done' ? 'ok' : 'err');
      }
      say('The bot has not picked it up yet. It may be restarting; check Discord.', 'err');
    } catch (err) {
      setBusy(box, false);
      say('Could not reach the server. Try again.', 'err');
    }
  });
})();
</script>`;
  const toolsScript = `<script>
(function () {
  var LIVE = (document.querySelector('meta[name="ajcl-live-url"]') || {}).content || '';
  function token() { try { var t = JSON.parse(localStorage.getItem('ajcl_token')); return t && t.exp > Date.now() ? t.t : null; } catch (e) { return null; } }
  function panel() { return document.getElementById('staff-tools'); }
  function out(form, msg, kind) {
    var o = form.querySelector('.st-out');
    if (!o) return;
    o.textContent = msg; o.className = 'st-out' + (kind ? ' is-' + kind : '');
  }
  document.addEventListener('submit', async function (e) {
    var form = e.target.closest && e.target.closest('#staff-tools form.st-form');
    if (!form) return;
    e.preventDefault();
    var btn = e.submitter && e.submitter.closest('button');
    var op = (btn && btn.value) || form.dataset.op;
    if (!op) return;
    var body = { op: op };
    // A section with its own queue picker (Ratings) uses that; the rest use the top one.
    var group = form.closest('.st-group');
    var q = (group && group.querySelector('[data-group-queue]')) || panel().querySelector('[data-st-queue]');
    if (q) body.queue = q.value;
    new FormData(form).forEach(function (v, k) { if (k !== 'op') body[k] = typeof v === 'string' ? v.trim() : v; });
    form.querySelectorAll('input[type=checkbox]').forEach(function (c) { body[c.name] = c.checked; });
    var qLabel = q ? q.options[q.selectedIndex].text : '';
    var ask = btn && btn.dataset.confirm;
    if (ask && !confirm(ask.replace('{queue}', qLabel).replace('{player}', body.player || 'this player'))) return;
    var t = token();
    if (!t) return out(form, 'Log in with Discord first (log out and back in if you already are).', 'err');
    var buttons = form.querySelectorAll('button');
    buttons.forEach(function (b) { b.disabled = true; });
    out(form, 'Sending to the bot...');
    try {
      var r = await fetch(LIVE + '/private/8s-action', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) return out(form, r.status === 403 ? 'Only staff can do that.' : r.status === 401 ? 'Your Discord login expired. Log out and back in.' : (d.error || 'Could not send it.'), 'err');
      for (var i = 0; i < 20; i++) {
        await new Promise(function (res) { setTimeout(res, 2500); });
        var s = await fetch(LIVE + '/private/8s-action?id=' + encodeURIComponent(d.id), { headers: { Authorization: 'Bearer ' + t }, cache: 'no-store' })
          .then(function (x) { return x.json(); }).catch(function () { return {}; });
        if (s.status && s.status !== 'pending') return out(form, s.message || ('Result: ' + s.status), s.status === 'done' ? 'ok' : 'err');
        out(form, 'Waiting for the bot...');
      }
      out(form, 'The bot has not picked it up yet. It may be restarting.', 'err');
    } catch (err) {
      out(form, 'Could not reach the server. Try again.', 'err');
    } finally {
      buttons.forEach(function (b) { b.disabled = false; });
    }
  });
})();
</script>`;
  const matchesScript = `<script>
(function () {
  var QUEUES = [["1532249725380591676","Open 8s Queue"],["1532289923141472296","League 8s Queue"],["1532290092096295104","Academy 8s Queue"]];
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  // Which queue (channel ID) a live queue entry is: its own ID, else its name.
  function idOf(q) {
    if (q.id) return q.id;
    var hit = QUEUES.filter(function (x) { return x[1].toLowerCase() === String(q.name || '').toLowerCase(); })[0];
    return hit ? hit[0] : null;
  }
  var latest = null;
  function draw() {
    var box = document.querySelector('[data-st-matches]');
    if (!box) return;
    var queues = latest;
    if (!queues) { try { queues = JSON.parse(box.dataset.queues || '[]'); } catch (e) { queues = []; } }
    var sel = document.querySelector('[data-st-queue]');
    var cur = sel ? sel.value : '';
    var live = queues.filter(function (q) { return q.match; });
    if (!live.length) { box.innerHTML = '<p class="muted st-nomatch">No matches going on right now.</p>'; return; }
    box.innerHTML = '<h5>Active matches</h5>' + live.map(function (q) {
      var m = q.match, id = idOf(q);
      var team = function (label, list) { return '<div><strong>' + label + '</strong><span>' + (list && list.length ? list.map(esc).join(', ') : '<em class="muted">Picking...</em>') + '</span></div>'; };
      return '<button type="button" class="st-match' + (id && id === cur ? ' is-selected' : '') + '" data-st-pick="' + esc(id || '') + '"' + (id ? '' : ' disabled') + '>' +
        '<span class="st-match-head"><strong>' + esc(q.name) + (m.number ? ' · #' + esc(m.number) : '') + '</strong><span class="pill pill-live">' + esc(m.phase || '') + '</span></span>' +
        ((m.teamA && m.teamA.length) || (m.teamB && m.teamB.length)
          ? '<span class="st-match-teams">' + team('🔵 Team 1', m.teamA) + team('🔴 Team 2', m.teamB) + '</span>'
          : (m.players && m.players.length ? '<span class="st-match-teams"><div><strong>Players</strong><span>' + m.players.map(esc).join(', ') + '</span></div></span>' : '')) +
        (id && id === cur ? '<span class="st-match-note">Selected: the buttons below act on this match</span>' : '<span class="st-match-note">Click to select this match</span>') +
        '</button>';
    }).join('');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-st-pick]');
    if (!b || !b.dataset.stPick) return;
    var sel = document.querySelector('[data-st-queue]');
    if (sel) { sel.value = b.dataset.stPick; draw(); }
  });
  document.addEventListener('change', function (e) { if (e.target.matches && e.target.matches('[data-st-queue]')) draw(); });
  document.addEventListener('ajcl:league', function (e) {
    latest = (e.detail && e.detail.queues) || latest;
    setTimeout(draw, 0);
    // Add any new 8mans-role / queue names to the player suggestions.
    var dl = document.getElementById('st-players');
    if (dl && e.detail) {
      var have = {};
      [].forEach.call(dl.options, function (o) { have[o.value] = 1; });
      var add = (e.detail.eightsMembers || []).slice();
      (e.detail.queues || []).forEach(function (q) { add = add.concat(q.players || []); });
      add.forEach(function (n) { if (n && !have[n]) { var o = document.createElement('option'); o.value = n; dl.appendChild(o); have[n] = 1; } });
    }
  });
  draw();
})();
</script>`;
  const pruneScript = `<script>
(function () {
  // Staff parts stay hidden until the AJCL server confirms this visitor is staff
  // (account.js fires ajcl:staff). Anyone else gets them removed from the page.
  var staff = null;
  function prune() {
    if (staff === true) return;
    var noLogin = !localStorage.getItem('ajcl_token');
    if (staff === false || noLogin) document.querySelectorAll('#staff-tools, .q-staff').forEach(function (el) { el.remove(); });
  }
  document.addEventListener('ajcl:staff', function (e) { staff = !!e.detail; prune(); });
  document.addEventListener('ajcl:league', function () { setTimeout(prune, 0); });
  prune();
})();
</script>`;
  return layout({ title: '8s', active: 'eights', body, c, script: (script || '') + staffScript + toolsScript + matchesScript + pruneScript, page: '8s' });
}

// ---- Staff: public staff list + staff-only modmail ----
// The modmail section is filled in the browser, only for staff: it asks the AJCL
// Worker with the visitor's Discord login, and the Worker checks they're staff.
// Ticket data is never part of the public site data.
const DISCORD_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.2a18.2 18.2 0 0 0-5.6 0L8.6 3a19.5 19.5 0 0 0-4.9 1.5C.6 9.1-.3 13.7.1 18.2a19.8 19.8 0 0 0 6 3l1.3-2.1a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.7 19.7 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.8zM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/></svg>';

// MFIC → Commissioners → Staff (each person once, under their highest role).
function staffGroups(league) {
  const groups = (league.staff || []).filter(g => (g.members || []).length);
  // Link to the person's player page (bot-provided slug, else match by name).
  const slugFor = m => m.slug || ((league.players || []).find(p => p.name === m.name) || {}).slug || null;
  const person = m => {
    const slug = slugFor(m);
    const inner = `${m.avatar ? `<img src="${esc(m.avatar)}" alt="" loading="lazy">` : `<span class="acct-initial">${esc(String(m.name).charAt(0))}</span>`}
    <span class="staff-name">${esc(m.name)}</span>`;
    const discord = /^\d{15,22}$/.test(String(m.discordId || '')) ? `<a class="staff-discord" href="https://discord.com/users/${m.discordId}" target="_blank" rel="noopener" title="${esc(m.name)} on Discord" aria-label="${esc(m.name)} on Discord">${DISCORD_SVG}</a>` : '';
    return `<div class="staff-person">${slug ? `<a class="staff-link" href="${u(`/players/${slug}/`)}">${inner}</a>` : `<span class="staff-link">${inner}</span>`}${discord}</div>`;
  };
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
    // Read the saved Discord login directly (account.js loads later, with defer).
    var token = null;
    try { var st = JSON.parse(localStorage.getItem('ajcl_token')); token = st && st.exp > Date.now() ? st.t : null; } catch (e) {}
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
  setInterval(load, 30000);
  addEventListener('storage', function (e) { if (e.key === 'ajcl_token') load(); });
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
</section>
${playerTools(league)}`;
  return layout({ title: 'Free Agents', active: 'players', body, c, script: ROSTER_TOOLS_SCRIPT, page: 'free-agents' });
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

  // Discord profile link (player's own ID, else their staff entry's).
  const staffEntry = (league.staff || []).flatMap(g => g.members || []).find(m => m.slug === player.slug || m.name === player.name) || {};
  const discordId = player.discordId || staffEntry.discordId;
  const avatarUrl = /^https:\/\/cdn\.discordapp\.com\//.test(String(player.avatar || staffEntry.avatar || '')) ? (player.avatar || staffEntry.avatar) : null;
  const avatar = avatarUrl ? `<img class="player-avatar" src="${esc(avatarUrl)}" alt="" width="56" height="56">` : '';
  const discordBtn = /^\d{15,22}$/.test(String(discordId || ''))
    ? `<a class="btn btn-discord btn-sm player-discord" href="https://discord.com/users/${discordId}" target="_blank" rel="noopener">${DISCORD_SVG} Discord profile</a>` : '';
  const head = team ? `
  <a href="${teamHref(team)}" aria-label="${esc(team.name)}">${crest(team, 'xl')}</a>
  <div>
    <p class="eyebrow"><span class="div-tag div-${team.division.toLowerCase()}">${esc(team.division)}</span></p>
    <h1 class="player-title">${avatar}<span>${esc(player.name)}</span>${player.rank ? ` ${rankTag(player.rank)}` : ''}</h1>
    <div class="team-stats">
      <div><strong>${player.kd ? esc(player.kd) : '–'}</strong><span>${esc(c.season || 'Season')} K/D</span></div>
      <div><strong class="player-team"><a href="${teamHref(team)}">${esc(team.abbr)}</a></strong><span>${esc(team.name)}</span></div>
      <div><strong class="player-role">${esc(roles)}</strong><span>Role</span></div>
    </div>
    ${discordBtn}
  </div>` : `
  <span class="crest crest-xl crest-fallback" aria-hidden="true">${esc(player.freeAgent ? 'FA' : (player.lastTeam || '—'))}</span>
  <div>
    <p class="eyebrow"><span class="pill${player.freeAgent ? ' pill-live' : ''}">${player.freeAgent ? esc(faLabel(player)) : 'Former player'}</span></p>
    <h1 class="player-title">${avatar}<span>${esc(player.name)}</span>${player.rank ? ` ${rankTag(player.rank)}` : ''}</h1>
    <div class="team-stats">
      ${player.lastTeam ? `<div><strong>${esc(player.lastTeam)}</strong><span>Last team</span></div>` : ''}
      <div><strong>${(player.games || []).reduce((n, g) => n + g.seasons.length, 0)}</strong><span>Seasons played</span></div>
    </div>
    ${discordBtn}
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

module.exports = { configure, matchId, matchPage, mapsetPage, mapsetVideoReady, MAPSET_SECONDS, staffPage, eightsPage, announcementsPage, powerRankingsPage, settingsPage, freeAgentsPage, home, teamsPage, teamPage, playerPage, playersPage, draftPage, schedulePage, standingsPage, statsPage, joinPage, authPage, notFound };
