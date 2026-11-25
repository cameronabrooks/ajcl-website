// ajcl-live: instant league data for the AJCL website.
//
//   PUT /league        (bot only, Authorization: Bearer <LIVE_SECRET>)  store + broadcast new data
//   GET /league.json   latest data, never cached
//   GET /ws            WebSocket: receives the full league JSON whenever it changes
//
// One Durable Object ("League") holds the data and the open WebSockets. It uses the
// WebSocket Hibernation API, so idle connections cost nothing on the free plan.

//   PUT /private       (bot only)  staff-only data: { staffIds, tickets, updatedAt }
//   GET /private/modmail  staff only: Authorization: Bearer <Discord access token>.
//                      The Worker asks Discord who the token belongs to and only
//                      answers if that user ID is in the bot's staff list.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const MAX_BYTES = 1024 * 1024;
// Only the AJCL website may call the staff-only endpoint from a browser.
const PRIVATE_ORIGINS = ['https://averagejoescodleague.com', 'https://www.averagejoescodleague.com', 'https://cameronabrooks.github.io', 'http://localhost:3000'];
function privateCors(request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': PRIVATE_ORIGINS.includes(origin) ? origin : PRIVATE_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: url.pathname.startsWith('/private') ? privateCors(request) : CORS });
    }
    if (url.pathname === '/') return new Response('AJCL live data feed', { headers: { 'content-type': 'text/plain', ...CORS } });
    if (!['/league', '/league.json', '/ws', '/private', '/private/modmail'].includes(url.pathname)) return new Response('Not found', { status: 404, headers: CORS });
    const stub = env.LEAGUE.get(env.LEAGUE.idFromName('ajcl'));
    return stub.fetch(request);
  },
};

function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export class League {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.tokenCache = new Map(); // sha256(token) -> { id, exp } so Discord isn't asked every poll
  }

  // Which Discord user owns this access token (null if invalid). Cached 5 minutes.
  async discordUserId(token) {
    const key = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const hit = this.tokenCache.get(key);
    if (hit && hit.exp > Date.now()) return hit.id;
    const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bearer ${token}` } });
    const id = res.ok ? (await res.json()).id : null;
    this.tokenCache.set(key, { id, exp: Date.now() + 5 * 60 * 1000 });
    if (this.tokenCache.size > 500) this.tokenCache.delete(this.tokenCache.keys().next().value);
    return id;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/private' && request.method === 'PUT') {
      const auth = request.headers.get('Authorization') || '';
      if (!this.env.LIVE_SECRET || !timingSafeEqual(auth, `Bearer ${this.env.LIVE_SECRET}`)) return new Response('Unauthorized', { status: 401 });
      const text = await request.text();
      if (text.length > MAX_BYTES) return new Response('Too large', { status: 413 });
      let data;
      try { data = JSON.parse(text); } catch { return new Response('Invalid JSON', { status: 400 }); }
      if (!data || !Array.isArray(data.staffIds) || !Array.isArray(data.tickets)) return new Response('Invalid data', { status: 400 });
      await this.state.storage.put('private', text);
      return new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } });
    }

    if (url.pathname === '/private/modmail' && request.method === 'GET') {
      const headers = { ...privateCors(request), 'content-type': 'application/json; charset=utf-8' };
      const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
      if (!token) return new Response('{"error":"login required"}', { status: 401, headers });
      const userId = await this.discordUserId(token);
      if (!userId) return new Response('{"error":"login expired"}', { status: 401, headers });
      const text = await this.state.storage.get('private');
      const data = text ? JSON.parse(text) : { staffIds: [], tickets: [] };
      if (!data.staffIds.includes(userId)) return new Response('{"error":"staff only"}', { status: 403, headers });
      return new Response(JSON.stringify({ tickets: data.tickets, updatedAt: data.updatedAt || null }), { headers });
    }

    if (url.pathname === '/league' && request.method === 'PUT') {
      const auth = request.headers.get('Authorization') || '';
      if (!this.env.LIVE_SECRET || !timingSafeEqual(auth, `Bearer ${this.env.LIVE_SECRET}`)) {
        return new Response('Unauthorized', { status: 401 });
      }
      const text = await request.text();
      if (text.length > MAX_BYTES) return new Response('Too large', { status: 413 });
      let data;
      try { data = JSON.parse(text); } catch { return new Response('Invalid JSON', { status: 400 }); }
      if (!data || !Array.isArray(data.teams) || !Array.isArray(data.matches)) return new Response('Invalid league data', { status: 400 });
      await this.state.storage.put('league', text);
      for (const ws of this.state.getWebSockets()) {
        try { ws.send(text); } catch { /* client gone */ }
      }
      return new Response(JSON.stringify({ ok: true, clients: this.state.getWebSockets().length }), { headers: { 'content-type': 'application/json' } });
    }

    if (url.pathname === '/league.json' && request.method === 'GET') {
      const text = await this.state.storage.get('league');
      if (!text) return new Response('No data yet', { status: 404, headers: { ...CORS, 'Cache-Control': 'no-store' } });
      return new Response(text, { headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426, headers: CORS });
      const { 0: client, 1: server } = new WebSocketPair();
      this.state.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404, headers: CORS });
  }

  // Clients never need to send anything; ignore any messages (pings are handled by the runtime).
  async webSocketMessage() {}
  async webSocketClose(ws, code) { try { ws.close(code, 'bye'); } catch {} }
  async webSocketError() {}
}
