const http = require('node:http');
const crypto = require('node:crypto');

const port = Number(process.env.PORT || 10000);
const phoneToken = process.env.PHONE_TOKEN;
const tvToken = process.env.TV_TOKEN;
if (!phoneToken || !tvToken) throw new Error('Set PHONE_TOKEN and TV_TOKEN');

const commands = [];
const pending = new Map();
let lastSeen = 0;
const same = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
function json(res, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': body.length,
    'cache-control': 'no-store', 'access-control-allow-origin': '*',
    'access-control-allow-headers': 'Authorization, Content-Type',
    'access-control-allow-methods': 'GET, POST, OPTIONS' });
  res.end(body);
}
function readBody(req, limit = 16 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', chunk => { size += chunk.length; if (size > limit) { reject(new Error('Request too large')); req.destroy(); } else chunks.push(chunk); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function enqueue(type, data = {}) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Mi Box did not respond. Check that its bridge is configured and online.')); }, 35000);
    pending.set(id, { resolve, reject, timer });
    commands.push({ id, type, ...data });
  });
}
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, Content-Type', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-max-age': '600' }); return res.end(); }
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/healthz') return json(res, 200, { ok: true, tvOnline: Date.now() - lastSeen < 45000 });
    if (url.pathname === '/tv/poll' && req.method === 'GET') {
      if (!same(req.headers.authorization?.replace(/^Bearer\s+/i, ''), tvToken)) return json(res, 401, { error: 'TV token rejected' });
      lastSeen = Date.now();
      const batch = commands.splice(0, 8);
      return json(res, 200, { commands: batch, serverTime: lastSeen });
    }
    if (url.pathname === '/tv/result' && req.method === 'POST') {
      if (!same(req.headers.authorization?.replace(/^Bearer\s+/i, ''), tvToken)) return json(res, 401, { error: 'TV token rejected' });
      const result = JSON.parse((await readBody(req, 16 * 1024 * 1024)).toString('utf8'));
      lastSeen = Date.now();
      const waiter = pending.get(result.id);
      if (waiter) { clearTimeout(waiter.timer); pending.delete(result.id); result.ok ? waiter.resolve(result.data || {}) : waiter.reject(new Error(result.error || 'TV command failed')); }
      return json(res, 200, { ok: true });
    }
    if (!url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found' });
    if (!same(req.headers.authorization?.replace(/^Bearer\s+/i, ''), phoneToken)) return json(res, 401, { error: 'Use the phone token from your Render environment variables.' });
    if (url.pathname === '/api/status' && req.method === 'GET') return json(res, 200, { device: 'Mi Box 4', paired: true, connected: Date.now() - lastSeen < 45000 });
    if (url.pathname === '/api/apps' && req.method === 'GET') return json(res, 200, await enqueue('apps'));
    if (url.pathname === '/api/home' && req.method === 'POST') return json(res, 200, await enqueue('home'));
    if (url.pathname === '/api/apps/open' && req.method === 'POST') {
      const data = JSON.parse((await readBody(req, 4096)).toString('utf8'));
      if (!/^[A-Za-z0-9_.]+$/.test(data.package || '')) return json(res, 400, { error: 'Invalid package name' });
      return json(res, 200, await enqueue('openApp', { package: data.package }));
    }
    if (url.pathname === '/api/wallpaper' && req.method === 'POST') {
      const type = String(req.headers['content-type'] || '').split(';')[0];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return json(res, 415, { error: 'Choose a JPEG, PNG, or WebP image.' });
      const image = await readBody(req, 12 * 1024 * 1024);
      return json(res, 200, await enqueue('wallpaper', { mime: type, image: image.toString('base64') }));
    }
    return json(res, 404, { error: 'Unknown API endpoint' });
  } catch (error) {
    if (!res.headersSent) json(res, error.message === 'Request too large' ? 413 : 502, { error: error.message || 'Request failed' });
  }
});
server.listen(port, '0.0.0.0', () => console.log(`Mi Box companion backend listening on ${port}`));
