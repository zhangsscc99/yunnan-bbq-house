// Yunnan BBQ House server: zero-dependency static server.
// Serves the built client at /bbq/ plus a tiny health API.
// Listens on 127.0.0.1:3035 only (behind the openfolio.uk gateway).

import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3035;
const HOST = process.env.HOST || '127.0.0.1';
const DIST = path.join(__dirname, 'dist');
const PREFIX = '/bbq';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function health(_req, res) {
  send(res, 200, JSON.stringify({ ok: true }), { 'Content-Type': 'application/json' });
}

// Static file under DIST. `urlPath` must already be stripped of the /bbq prefix.
function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(DIST, rel));
  if (!file.startsWith(DIST + path.sep) && file !== path.join(DIST, 'index.html')) {
    return send(res, 403, 'forbidden');
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'not found');
    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    };
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  const pathname = url.split('?')[0];

  if (pathname === '/api/health' || pathname === `${PREFIX}/api/health`) {
    return health(req, res);
  }
  if (pathname === '/') {
    return serveStatic(req, res, '/');
  }
  if (pathname === PREFIX) {
    return send(res, 301, '', { Location: `${PREFIX}/` });
  }
  if (pathname.startsWith(PREFIX + '/')) {
    return serveStatic(req, res, pathname.slice(PREFIX.length));
  }
  return send(res, 404, 'not found');
});

server.listen(PORT, HOST, () => {
  console.log(`[yunnan-bbq] serving ${DIST} at http://${HOST}:${PORT}${PREFIX}/`);
});
