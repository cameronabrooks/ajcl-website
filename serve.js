// Local preview: builds the site, then serves dist/ at http://localhost:3000
// and rebuilds when you edit content.json, public/, src/ or data/.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { build } = require('./build');

const DIST = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 3000;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.js': 'text/javascript' };

function rebuild() {
  try {
    for (const k of Object.keys(require.cache)) if (k.includes(`${path.sep}src${path.sep}`)) delete require.cache[k];
    require('./src/render');
    build();
  } catch (e) { console.error('Build failed:', e.message); }
}
rebuild();

let timer;
for (const dir of ['content.json', 'public', 'src', 'data']) {
  fs.watch(path.join(__dirname, dir), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 200); });
}

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.normalize(path.join(DIST, p));
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': MIME['.html'] }); return res.end(fs.readFileSync(path.join(DIST, '404.html'))); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
}).listen(port, () => console.log(`AJCL website preview: http://localhost:${port}`));
