// "Log in with Discord" for the AJCL website.
// Static-site friendly: uses Discord's OAuth2 implicit grant (identify scope only).
// The access token is used once to read the user's name/avatar and then dropped;
// only { name, avatar, hash } is kept, in this browser's localStorage.
// The user is matched to a team via members.json, which lists salted SHA-256
// prefixes of Discord IDs (computed the same way by the bot: "ajcl:<id>").
(function () {
  var STORE = 'ajcl_user';
  var meta = function (n) { var el = document.querySelector('meta[name="' + n + '"]'); return el ? el.content : ''; };
  var BASE = meta('ajcl-base');
  var CLIENT_ID = meta('ajcl-discord-client');
  var slot = document.querySelector('[data-account]');
  // Discord only accepts exact, pre-registered return addresses, so use the one
  // official address rather than wherever this page happens to be loaded from
  // (an old cached copy, http://, www., the github.io link...). Local previews keep
  // their own address (http://localhost:3000/auth/ is registered too).
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var SITE = (meta('ajcl-site-url') || 'https://averagejoescodleague.com').replace(/\/+$/, '');
  var redirectUri = LOCAL ? location.origin + BASE + '/auth/' : SITE + '/auth/';

  function getUser() { try { return JSON.parse(localStorage.getItem(STORE)); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  async function hashId(id) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ajcl:' + id));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('').slice(0, 20);
  }

  function login() {
    // Start from the official address so the security check (stored per-address)
    // matches when Discord sends the visitor back.
    if (!LOCAL && location.origin !== SITE) {
      location.href = SITE + location.pathname.replace(/^\/ajcl-website/, '') + location.search;
      return;
    }
    var state = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    sessionStorage.setItem('ajcl_oauth_state', state);
    sessionStorage.setItem('ajcl_return', location.pathname + location.search + location.hash);
    var q = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'token', redirect_uri: redirectUri, scope: 'identify', state: state });
    location.href = 'https://discord.com/oauth2/authorize?' + q.toString();
  }

  function logout() {
    localStorage.removeItem(STORE);
    document.querySelectorAll('.is-mine, .is-me').forEach(function (el) { el.classList.remove('is-mine', 'is-me'); });
    render(null, null);
  }

  var DISCORD_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.2a18.2 18.2 0 0 0-5.6 0L8.6 3a19.5 19.5 0 0 0-4.9 1.5C.6 9.1-.3 13.7.1 18.2a19.8 19.8 0 0 0 6 3l1.3-2.1a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.7 19.7 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.8zM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/></svg>';

  function render(user, entry, teamName) {
    if (!slot) return;
    if (!CLIENT_ID) { slot.innerHTML = ''; return; }
    if (!user) {
      slot.innerHTML = '<button type="button" class="btn btn-sm btn-discord" data-login>' + DISCORD_ICON + '<span>Log in</span></button>';
      slot.querySelector('[data-login]').addEventListener('click', login);
      return;
    }
    var teamLine = entry
      ? '<p class="acct-team">' + esc(teamName || entry.team.toUpperCase()) + ' · ' + esc(roleLabel(entry.roles)) + '</p><a href="' + BASE + '/teams/' + esc(entry.team) + '/">My Team →</a>'
      : '<p class="acct-team muted">Not on a team roster</p>';
    slot.innerHTML =
      '<button type="button" class="acct-btn" aria-haspopup="true" aria-expanded="false" data-acct-toggle>' +
        (user.avatar ? '<img src="' + esc(user.avatar) + '" alt="">' : '<span class="acct-initial">' + esc(user.name.charAt(0)) + '</span>') +
        '<span class="acct-name">' + esc(user.name) + '</span></button>' +
      '<div class="acct-menu" hidden data-acct-menu>' +
        '<p class="acct-label">Signed in with Discord</p><p class="acct-full">' + esc(user.name) + '</p>' + teamLine +
        '<button type="button" class="acct-logout" data-logout>Log out</button></div>';
    var btn = slot.querySelector('[data-acct-toggle]'), menu = slot.querySelector('[data-acct-menu]');
    btn.addEventListener('click', function (e) { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); });
    document.addEventListener('click', function (e) { if (!slot.contains(e.target)) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    slot.querySelector('[data-logout]').addEventListener('click', logout);
  }

  function roleLabel(roles) {
    if (roles.indexOf('gm') >= 0) return 'General Manager';
    if (roles.indexOf('coach') >= 0) return 'Coach';
    if (roles.indexOf('nonPlaying') >= 0) return 'Non-Playing';
    return 'Player';
  }

  function highlight(entry) {
    var t = entry.team;
    document.querySelectorAll('[data-team="' + t + '"], [data-teams~="' + t + '"]').forEach(function (el) { el.classList.add('is-mine'); });
    if (new RegExp('/teams/' + t + '/?$').test(location.pathname)) {
      document.querySelectorAll('[data-member]').forEach(function (li) { if (li.dataset.member === entry.name) li.classList.add('is-me'); });
    }
  }

  async function loadIndex() {
    try { var r = await fetch(BASE + '/members.json', { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch (e) { return null; }
  }

  async function finishLogin() {
    var status = document.querySelector('[data-auth-status]');
    var say = function (msg) { if (status) status.textContent = msg; };
    var p = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, '', location.pathname); // drop the token from the address bar right away
    var back = sessionStorage.getItem('ajcl_return') || (BASE + '/');
    if (p.get('error')) { say('Discord login was cancelled. Taking you back…'); setTimeout(function () { location.replace(back); }, 1500); return; }
    if (!p.get('access_token') || p.get('state') !== sessionStorage.getItem('ajcl_oauth_state')) { say('That login link is invalid or expired. Please try logging in again.'); return; }
    sessionStorage.removeItem('ajcl_oauth_state');
    try {
      var r = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: 'Bearer ' + p.get('access_token') } });
      if (!r.ok) throw new Error('Discord returned ' + r.status);
      var u = await r.json();
      var avatar = u.avatar ? 'https://cdn.discordapp.com/avatars/' + u.id + '/' + u.avatar + '.png?size=64' : null;
      localStorage.setItem(STORE, JSON.stringify({ name: u.global_name || u.username, avatar: avatar, hash: await hashId(u.id), at: Date.now() }));
      location.replace(back);
    } catch (e) {
      say('Could not reach Discord to finish logging in. Please try again.');
    }
  }

  function applyIndex(user, idx) {
    var entry = idx && idx.members && idx.members[user.hash];
    document.querySelectorAll('.is-mine, .is-me').forEach(function (el) { el.classList.remove('is-mine', 'is-me'); });
    render(user, entry, entry && idx.teams && idx.teams[entry.team]);
    if (entry) highlight(entry);
  }

  async function init() {
    if (/\/auth\/?$/.test(location.pathname)) return finishLogin();
    var user = getUser();
    if (!user) return render(null);
    render(user, null);
    applyIndex(user, await loadIndex());
    // live.js re-rendered the page with newer data: re-match and re-highlight.
    document.addEventListener('ajcl:league', function (e) {
      var raw = e.detail || {};
      var teams = {};
      (raw.teams || []).forEach(function (t) { teams[t.slug] = t.name; });
      applyIndex(user, { teams: teams, members: raw.members || {} });
    });
  }

  init();
})();
