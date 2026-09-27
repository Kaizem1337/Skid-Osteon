import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDatabase, hasAdmin, createAdmin, authenticate, createSession, hashToken, sessionAdmin, saveRequest, counts, listRequests, getRequest, getEvents, updateRequest, deleteRequest } from './src/db.mjs';
import { loginPage, setupPage, inboxPage, detailPage } from './src/pages.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(root, 'public');
const sectionRoutes = new Set(['/', '/about', '/team', '/procedures', '/faq', '/contact', '/gallery']);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webm': 'video/webm', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': typeof body === 'string' ? 'text/html; charset=utf-8' : 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}
function json(res, status, data, headers = {}) {
  send(res, status, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
}
function redirect(res, location) { send(res, 303, '', { Location: location, 'Cache-Control': 'no-store' }); }
function cookie(req, name) {
  const part = (req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}
async function readJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw Object.assign(new Error('Send JSON content.'), { status: 415 });
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 16_384) throw Object.assign(new Error('Request is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid JSON object.');
    return value;
  }
  catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
}
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254; }
function rateLimit(map, key, max, windowMs) {
  const now = Date.now();
  const values = (map.get(key) || []).filter(time => now - time < windowMs);
  values.push(now);
  map.set(key, values);
  return values.length <= max;
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}
function staticFile(res, pathname) {
  const relative = pathname.replace(/^\//, '');
  const target = path.resolve(publicRoot, relative);
  if (target !== publicRoot && !target.startsWith(publicRoot + path.sep)) return false;
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return false;
  const ext = path.extname(target).toLowerCase();
  const headers = { 'Content-Type': mime[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' };
  res.writeHead(200, headers);
  fs.createReadStream(target).pipe(res);
  return true;
}

export function createApp({ dbPath = path.join(root, '.data', 'osteon.sqlite') } = {}) {
  const db = openDatabase(dbPath);
  const contactRates = new Map();
  const loginRates = new Map();
  const server = http.createServer(async (req, res) => {
    let url;
    try { url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); }
    catch { return json(res, 400, { ok: false, error: 'Invalid URL.' }); }
    let pathname;
    try { pathname = decodeURIComponent(url.pathname).replace(/\/$/, '') || '/'; }
    catch { return json(res, 400, { ok: false, error: 'Invalid URL encoding.' }); }
    const method = req.method || 'GET';
    const isApi = pathname.startsWith('/api/');
    if (['POST', 'PATCH', 'DELETE'].includes(method) && !sameOrigin(req)) return json(res, 403, { ok: false, error: 'Cross-origin request refused.' });
    const admin = sessionAdmin(db, cookie(req, 'osteon_session'));
    try {
      if (method === 'POST' && ['/api/enquiries', '/api/consultation-requests'].includes(pathname)) {
        if (!rateLimit(contactRates, req.socket.remoteAddress || 'local', 20, 3600_000)) return json(res, 429, { ok: false, error: 'Too many requests. Please try later.' });
        const body = await readJson(req);
        if (String(body.website || '').trim()) return json(res, 200, { ok: true });
        const name = String(body.name || '').trim();
        const email = String(body.email || '').trim();
        const message = String(body.message || '').trim();
        const visitorType = String(body.visitorType || '').trim();
        const kind = pathname === '/api/consultation-requests' ? 'consultation' : body.kind === 'membership' ? 'membership' : 'contact';
        if (!name || name.length > 100 || !validEmail(email) || message.length < 2 || message.length > 5000 || visitorType.length > 50)
          return json(res, 400, { ok: false, error: 'Please enter a valid name, email address, and message.' });
        const submissionId = /^[a-zA-Z0-9-]{8,64}$/.test(String(body.submissionId || '')) ? body.submissionId : crypto.randomUUID();
        const id = saveRequest(db, { submissionId, kind, name, email, message, visitorType });
        return json(res, 200, { ok: true, id });
      }

      if (method === 'POST' && pathname === '/api/staff/setup') {
        if (hasAdmin(db)) return json(res, 409, { ok: false, error: 'The staff account is already set up.' });
        const body = await readJson(req);
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        if (!validEmail(email) || password.length < 12 || password.length > 200 || body.confirm !== password)
          return json(res, 400, { ok: false, error: 'Enter a valid email and matching password of at least 12 characters.' });
        createAdmin(db, email, password);
        const created = authenticate(db, email, password);
        const token = createSession(db, created.id);
        return json(res, 200, { ok: true }, { 'Set-Cookie': `osteon_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` });
      }
      if (method === 'POST' && pathname === '/api/staff/login') {
        if (!rateLimit(loginRates, req.socket.remoteAddress || 'local', 10, 300_000)) return json(res, 429, { ok: false, error: 'Too many attempts. Please wait five minutes.' });
        const body = await readJson(req);
        const adminUser = authenticate(db, String(body.email || ''), String(body.password || ''));
        if (!adminUser) return json(res, 401, { ok: false, error: 'Sign-in failed. Check your email and password.' });
        const token = createSession(db, adminUser.id);
        return json(res, 200, { ok: true }, { 'Set-Cookie': `osteon_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` });
      }
      if (method === 'POST' && pathname === '/api/staff/logout') {
        const token = cookie(req, 'osteon_session');
        if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
        return json(res, 200, { ok: true }, { 'Set-Cookie': 'osteon_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
      }
      if (pathname.startsWith('/api/staff/')) {
        if (!admin) return json(res, 401, { ok: false, error: 'Sign in to continue.' });
        if (method === 'GET' && pathname === '/api/staff/requests') {
          const filters = parseFilters(url);
          return json(res, 200, { ok: true, counts: counts(db), ...listRequests(db, filters) });
        }
        const match = pathname.match(/^\/api\/staff\/requests\/([a-f0-9-]{36})$/);
        if (match && ['PATCH', 'DELETE'].includes(method)) {
          const body = await readJson(req);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) return json(res, 400, { ok: false, error: 'Invalid request version.' });
          const result = method === 'DELETE' ? deleteRequest(db, match[1], version) : updateRequest(db, match[1], version, body.action, body.status);
          if (result.error) return json(res, result.error === 'not_found' ? 404 : result.error === 'conflict' ? 409 : 400, { ok: false, error: result.error.replaceAll('_', ' ') });
          return json(res, 200, { ok: true, ...result });
        }
        return json(res, 404, { ok: false, error: 'Not found.' });
      }

      if (method === 'GET' && pathname === '/staff/setup') {
        if (hasAdmin(db)) return redirect(res, admin ? '/staff?view=unread' : '/staff/login');
        return send(res, 200, setupPage(), { 'Cache-Control': 'no-store' });
      }
      if (method === 'GET' && pathname === '/staff/login') {
        if (!hasAdmin(db)) return redirect(res, '/staff/setup');
        if (admin) return redirect(res, '/staff?view=unread');
        return send(res, 200, loginPage(), { 'Cache-Control': 'no-store' });
      }
      if (method === 'GET' && pathname === '/staff') {
        if (!hasAdmin(db)) return redirect(res, '/staff/setup');
        if (!admin) return redirect(res, '/staff/login');
        const filters = parseFilters(url);
        return send(res, 200, inboxPage(admin, counts(db), listRequests(db, filters), filters), { 'Cache-Control': 'no-store' });
      }
      const detailMatch = pathname.match(/^\/staff\/requests\/([a-f0-9-]{36})$/);
      if (method === 'GET' && detailMatch) {
        if (!hasAdmin(db)) return redirect(res, '/staff/setup');
        if (!admin) return redirect(res, '/staff/login');
        const row = getRequest(db, detailMatch[1]);
        if (!row) return send(res, 404, 'Request not found.');
        return send(res, 200, detailPage(admin, row, getEvents(db, row.id)), { 'Cache-Control': 'no-store' });
      }
      if (method !== 'GET' && method !== 'HEAD') return isApi ? json(res, 404, { ok: false, error: 'Not found.' }) : send(res, 405, 'Method not allowed.');
      if (sectionRoutes.has(pathname)) return staticFile(res, '/index.html');
      if (pathname === '/terms/patient-rights') return staticFile(res, '/terms/index.html');
      if (['/blog', '/privacy', '/terms', '/company'].includes(pathname)) return staticFile(res, `${pathname}/index.html`);
      if (pathname.startsWith('/assets/') || pathname.startsWith('/css/') || pathname.startsWith('/js/') || pathname.startsWith('/_next/') || pathname.endsWith('.html') || pathname.startsWith('/cdn-cgi/scripts/')) {
        if (staticFile(res, pathname)) return;
      }
      send(res, 404, 'Page not found.');
    } catch (error) {
      if (isApi) json(res, error.status || 500, { ok: false, error: error.status ? error.message : 'An unexpected error occurred.' });
      else send(res, 500, 'An unexpected error occurred.');
      if (!error.status) console.error(error);
    }
  });
  return { server, db };
}

function parseFilters(url) {
  const view = ['unread', 'all', 'trash'].includes(url.searchParams.get('view')) ? url.searchParams.get('view') : 'unread';
  const kind = ['contact', 'consultation', 'membership'].includes(url.searchParams.get('kind')) ? url.searchParams.get('kind') : '';
  const status = ['NEW', 'CONTACTED', 'CLOSED'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : '';
  const q = (url.searchParams.get('q') || '').slice(0, 100);
  const page = Math.max(1, Math.min(1000, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1));
  return { view, kind, status, q, page };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 3000);
  const { server } = createApp({ dbPath: process.env.OSTEON_DB || undefined });
  server.listen(port, host, () => console.log(`Osteon local site: http://${host}:${port}`));
}
