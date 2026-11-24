// Live updates for the AJCL website.
// The static page is built from data that may be a minute old. This script asks the
// ajcl-live Cloudflare Worker for the latest league data and keeps a WebSocket open;
// whenever newer data arrives, the page's <main> is re-rendered in place with the
// same templates the build uses (window.AJCL from app.js). If the Worker can't be
// reached, the page simply stays as built.
(function () {
  var meta = function (n) { var el = document.querySelector('meta[name="' + n + '"]'); return el ? el.content : ''; };
  var LIVE = meta('ajcl-live-url');
  var page = document.body.dataset.page;
  if (!LIVE || !page || !window.AJCL || !window.WebSocket) return;

  var version = Number(meta('ajcl-data-version')) || 0;
  var logoSet = new Set(AJCL.logos);
  AJCL.render.configure({ base: meta('ajcl-base'), discordClientId: meta('ajcl-discord-client'), liveUrl: LIVE, dataVersion: version });

  function apply(raw) {
    if (!raw || !raw.generatedAt || raw.generatedAt <= version) return;
    version = raw.generatedAt;
    var league = AJCL.hydrate(raw, function (abbr) { return logoSet.has(abbr); });
    var html = AJCL.renderPage(AJCL.render, league, AJCL.content, page);
    if (html) {
      var fresh = new DOMParser().parseFromString(html, 'text/html').querySelector('main');
      var main = document.querySelector('main');
      if (fresh && main) {
        var y = window.scrollY;
        main.innerHTML = fresh.innerHTML;
        window.scrollTo(0, y);
        // Let page scripts (schedule/stats tabs) re-apply their state to the new markup.
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    }
    // account.js re-highlights the visitor's team with the fresh roster data.
    document.dispatchEvent(new CustomEvent('ajcl:league', { detail: raw }));
  }

  function fetchLatest() {
    return fetch(LIVE + '/league.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(apply)
      .catch(function () {});
  }

  var ws = null, retry = 1000, timer = null;
  function connect() {
    if (ws || document.hidden) return;
    try { ws = new WebSocket(LIVE.replace(/^http/, 'ws') + '/ws'); } catch (e) { return schedule(); }
    ws.onopen = function () { retry = 1000; fetchLatest(); }; // catch anything sent while disconnected
    ws.onmessage = function (e) { try { apply(JSON.parse(e.data)); } catch (err) {} };
    ws.onclose = function () { ws = null; schedule(); };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  }
  function schedule() {
    clearTimeout(timer);
    if (document.hidden) return;
    timer = setTimeout(connect, retry);
    retry = Math.min(retry * 2, 30000);
  }
  function disconnect() { clearTimeout(timer); if (ws) { ws.onclose = null; ws.close(); ws = null; } }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) disconnect();
    else { retry = 1000; connect(); }
  });
  window.addEventListener('pagehide', disconnect);
  window.addEventListener('pageshow', function (e) { if (e.persisted) { retry = 1000; connect(); } });

  fetchLatest();
  connect();
})();
