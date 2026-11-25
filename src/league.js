// Turns the bot's flat league data (teams referenced by slug) into linked
// objects + standings. Shared by the build (Node) and live updates (browser),
// so keep it free of Node-only APIs.
//   hasLogo(abbr) -> true if public/logos/<ABBR>.png exists
function hydrate(raw, hasLogo) {
  const teams = raw.teams.map(t => ({ ...t, logo: hasLogo(t.abbr) ? `/logos/${t.abbr}.png` : null }));
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
  // Player profiles (published by the bot); link each to its team object.
  const players = (raw.players || [])
    // Current players need their team; former players (past seasons only) have none.
    .filter(p => bySlug[p.team] || p.former || p.freeAgent)
    .map(p => ({ ...p, teamObj: bySlug[p.team] || null }));

  return { ...raw, teams, matches, standings, players };
}

// Which page builder renders a given page key (also used in the browser).
function renderPage(render, league, content, page) {
  if (page === 'home') return render.home(league, content);
  if (page === 'schedule') return render.schedulePage(league, content);
  if (page === 'standings') return render.standingsPage(league, content);
  if (page === 'teams') return render.teamsPage(league, content);
  if (page === 'players') return render.playersPage(league, content);
  if (page === 'draft') return render.draftPage(league, content);
  if (page === 'power-rankings') return render.powerRankingsPage(league, content);
  if (page === 'settings') return render.settingsPage(league, content);
  if (page === '8s') return render.eightsPage(league, content);
  if (page === 'announcements') return render.announcementsPage(league, content);
  if (page === 'free-agents') return render.freeAgentsPage(league, content);
  if (page === 'stats') return render.statsPage(league, content);
  if (page === 'join') return render.joinPage(league, content);
  if (page && page.startsWith('match:')) {
    const m = league.matches.find(x => render.matchId(x) === page.slice(6));
    return m ? render.matchPage(league, m, content) : null;
  }
  if (page && page.startsWith('player:')) {
    const player = league.players.find(p => p.slug === page.slice(7));
    return player ? render.playerPage(league, player, content) : null;
  }
  if (page && page.startsWith('team:')) {
    const team = league.teams.find(t => t.slug === page.slice(5));
    return team ? render.teamPage(league, team, content) : null;
  }
  return null;
}

module.exports = { hydrate, renderPage };
