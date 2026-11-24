// ajcl-live: instant league data for the AJCL website.
//
//   PUT /league        (bot only, Authorization: Bearer <LIVE_SECRET>)  store + broadcast new data
//   GET /league.json   latest data, never cached
//   GET /ws            WebSocket: receives the full league JSON whenever it changes
//
// One Durable Object ("League") holds the data and the open WebSockets. It uses the
// WebSocket Hibernation API, so idle connections cost nothing on the free plan.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const MAX_BYTES = 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === '/') return new Response('AJCL live data feed', { headers: { 'content-type': 'text/plain', ...CORS } });
    if (!['/league', '/league.json', '/ws'].includes(url.pathname)) return new Response('Not found', { status: 404, headers: CORS });
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
  }

  async fetch(request) {
    const url = new URL(request.url);

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
