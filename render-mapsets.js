// Renders the downloadable mapset video (MP4) and picture (PNG) for every casted match
// whose picks/bans are finished. Runs in the GitHub Actions build after build.js:
//   - serves dist/ locally and opens each match's mapset page in headless Chrome in
//     "layer" mode (?layer): only the page's own layer (map pictures, text, logos,
//     clean pieces, neon logo) on a see-through background,
//   - steps the animation with ?frame=<seconds> and captures every frame as PNG,
//   - ffmpeg lays those frames over the original stream overlay video (held on its
//     last frame) -> dist/matches/<id>/mapset.mp4, and the finished frame -> mapset.png.
// The animation underneath is therefore exactly the original video.
// Needs: puppeteer-core (installed by the workflow), Chrome, ffmpeg.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const DIST = path.join(__dirname, 'dist');
const OVERLAY = path.join(DIST, 'mapset', 'overlay.mp4');
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

function ffmpeg(args, input) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
  return { ff, done };
}

(async () => {
  global.window = {}; global.document = {};
  const render = require('./src/render');
  const { hydrate } = require('./src/league');
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'league.json'), 'utf8'));
  const league = hydrate(raw, () => true);
  const todo = league.matches.filter(render.mapsetVideoReady);
  if (!todo.length) return console.log('mapset videos: none to render');
  if (!fs.existsSync(OVERLAY)) return console.log('mapset videos: overlay video missing');

  let puppeteer;
  try { puppeteer = require('puppeteer-core'); } catch { return console.log('mapset videos: puppeteer-core not installed, skipping'); }
  const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'] });
  const seconds = render.MAPSET_SECONDS;
  try {
    for (const m of todo) {
      const id = render.matchId(m);
      const dir = path.join(DIST, 'matches', id);
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
      // No live feed while rendering: the page must show exactly the built data.
      await page.setRequestInterception(true);
      page.on('request', r => (/workers\.dev|\/live\.js|\/app\.js|overlay\.mp4/.test(r.url()) ? r.abort() : r.continue()));
      await page.goto(`${base}/matches/${id}/mapset/?frame=0&layer`, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.waitForFunction('window.__msReady === true', { timeout: 30000 });
      const shot = () => page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
      const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

      // Video: original overlay video (held on its last frame) + our layer on top.
      const out = path.join(dir, 'mapset.mp4');
      const { ff, done } = ffmpeg([
        '-i', OVERLAY,
        '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-filter_complex', `[0:v]fps=${FPS},scale=1920:1080,tpad=stop_mode=clone:stop_duration=${seconds}[bg];[bg][1:v]overlay=0:0:shortest=1:format=auto,format=yuv420p[v]`,
        '-map', '[v]', '-t', String(seconds), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-movflags', '+faststart', out,
      ]);
      const frames = Math.round(seconds * FPS);
      for (let f = 0; f < frames; f++) {
        await page.evaluate(tt => window.__msShow(tt), f / FPS);
        await settle();
        if (!ff.stdin.write(await shot())) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      await done;

      // Picture: the overlay video's last frame + our finished layer.
      await page.evaluate(() => window.__msShow(6));
      await settle();
      const layer = path.join(dir, 'mapset-layer.png');
      fs.writeFileSync(layer, await shot());
      await ffmpeg(['-sseof', '-0.1', '-i', OVERLAY, '-i', layer, '-filter_complex', '[0:v]scale=1920:1080[bg];[bg][1:v]overlay=0:0', '-frames:v', '1', path.join(dir, 'mapset.png')]).done;
      fs.unlinkSync(layer);
      await page.close();
      console.log('mapset video + picture:', id, (fs.statSync(out).size / 1024 / 1024).toFixed(1) + ' MB');
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error('mapset videos failed:', err.message); process.exitCode = 0; });
