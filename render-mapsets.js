// Renders the downloadable mapset video (MP4) for every casted match whose picks/bans
// are finished. Runs in the GitHub Actions build after build.js:
//   - serves dist/ locally, opens each match's mapset page in headless Chrome,
//   - steps the animation with ?frame=<seconds> and screenshots every frame,
//   - pipes the frames into ffmpeg -> dist/matches/<id>/mapset.mp4.
// Needs: puppeteer-core (installed by the workflow), Chrome, ffmpeg.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const DIST = path.join(__dirname, 'dist');
const FPS = 30;

function serve() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(DIST, p);
    if (!file.startsWith(DIST) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

(async () => {
  global.window = {}; global.document = {};
  const render = require('./src/render');
  const { hydrate } = require('./src/league');
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'league.json'), 'utf8'));
  const league = hydrate(raw, () => true);
  const todo = league.matches.filter(render.mapsetVideoReady);
  if (!todo.length) return console.log('mapset videos: none to render');

  let puppeteer;
  try { puppeteer = require('puppeteer-core'); } catch { return console.log('mapset videos: puppeteer-core not installed, skipping'); }
  const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
  try {
    for (const m of todo) {
      const id = render.matchId(m);
      const out = path.join(DIST, 'matches', id, 'mapset.mp4');
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
      // No live feed while rendering: the page must show exactly the built data.
      await page.setRequestInterception(true);
      page.on('request', r => (/workers\.dev|\/live\.js|\/app\.js/.test(r.url()) ? r.abort() : r.continue()));
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '18', '-movflags', '+faststart', out]);
      const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
      const frames = Math.round(render.MAPSET_SECONDS * FPS);
      for (let f = 0; f < frames; f++) {
        const t = (f / FPS).toFixed(4);
        if (f === 0) {
          await page.goto(`${base}/matches/${id}/mapset/?frame=${t}`, { waitUntil: 'networkidle0', timeout: 60000 });
          await page.waitForFunction('window.__msReady === true', { timeout: 30000 });
        } else {
          // Same page, next moment of the animation.
          await page.evaluate(tt => { history.replaceState(null, '', '?frame=' + tt); window.__msShow && window.__msShow(+tt); }, t);
        }
        const jpg = await page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
        if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      await done;
      await page.close();
      console.log('mapset video:', id, (fs.statSync(out).size / 1024 / 1024).toFixed(1) + ' MB');
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error('mapset videos failed:', err.message); process.exitCode = 0; });
