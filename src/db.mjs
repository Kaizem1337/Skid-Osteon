import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export function openDatabase(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      visitor_type TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NEW',
      is_read INTEGER NOT NULL DEFAULT 0,
      is_trashed INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS requests_inbox ON requests(is_trashed, is_read, created_at DESC);
    CREATE TABLE IF NOT EXISTS request_events (
      id INTEGER PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

export function hasAdmin(db) {
  return Boolean(db.prepare('SELECT 1 FROM admins LIMIT 1').get());
}

export function createAdmin(db, email, password) {
  if (hasAdmin(db)) return false;
  const salt = crypto.randomBytes(24).toString('hex');
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  db.prepare('INSERT INTO admins (email, salt, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(email.toLowerCase(), salt, passwordHash, new Date().toISOString());
  return true;
}

export function authenticate(db, email, password) {
  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email.toLowerCase());
  if (!admin) {
    crypto.scryptSync(password, 'absent-account-salt', 64);
    return null;
  }
  const candidate = crypto.scryptSync(password, admin.salt, 64);
  const expected = Buffer.from(admin.password_hash, 'hex');
  return crypto.timingSafeEqual(candidate, expected) ? admin : null;
}

export function createSession(db, adminId) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), adminId, Date.now() + 7 * 86400_000);
  return token;
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function sessionAdmin(db, token) {
  if (!token) return null;
  return db.prepare(`SELECT admins.id, admins.email FROM sessions
    JOIN admins ON admins.id = sessions.admin_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?`)
    .get(hashToken(token), Date.now()) || null;
}

export function saveRequest(db, values) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const result = db.prepare(`INSERT OR IGNORE INTO requests
    (id, submission_id, kind, name, email, visitor_type, message, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, values.submissionId, values.kind, values.name, values.email, values.visitorType, values.message, now, now);
  return result.changes ? id : db.prepare('SELECT id FROM requests WHERE submission_id = ?').get(values.submissionId).id;
}

export function counts(db) {
  return db.prepare(`SELECT
    COUNT(*) AS total,
    COALESCE(SUM(CASE WHEN is_trashed = 0 AND is_read = 0 THEN 1 ELSE 0 END), 0) AS unread,
    COALESCE(SUM(CASE WHEN is_trashed = 1 THEN 1 ELSE 0 END), 0) AS trash
    FROM requests`).get();
}

export function listRequests(db, filters) {
  const clauses = [filters.view === 'trash' ? 'is_trashed = 1' : 'is_trashed = 0'];
  const params = [];
  if (filters.view === 'unread') clauses.push('is_read = 0');
  if (filters.kind) { clauses.push('kind = ?'); params.push(filters.kind); }
  if (filters.status) { clauses.push('status = ?'); params.push(filters.status); }
  if (filters.q) {
    clauses.push('(name LIKE ? OR email LIKE ? OR message LIKE ?)');
    const query = `%${filters.q.replace(/[%_]/g, '')}%`;
    params.push(query, query, query);
  }
  const where = clauses.join(' AND ');
  const count = db.prepare(`SELECT COUNT(*) AS count FROM requests WHERE ${where}`).get(...params).count;
  const page = Math.max(1, filters.page || 1);
  const rows = db.prepare(`SELECT * FROM requests WHERE ${where} ORDER BY created_at DESC LIMIT 25 OFFSET ?`)
    .all(...params, (page - 1) * 25);
  return { rows, count, page, pages: Math.max(1, Math.ceil(count / 25)) };
}

export function getRequest(db, id) {
  return db.prepare('SELECT * FROM requests WHERE id = ?').get(id) || null;
}

export function getEvents(db, id) {
  return db.prepare('SELECT action, created_at FROM request_events WHERE request_id = ? ORDER BY id DESC').all(id);
}

export function updateRequest(db, id, version, action, status) {
  const current = getRequest(db, id);
  if (!current) return { error: 'not_found' };
  if (current.version !== version) return { error: 'conflict' };
  const changes = {};
  if (action === 'MARK_READ') changes.is_read = 1;
  else if (action === 'MARK_UNREAD') changes.is_read = 0;
  else if (action === 'TRASH') changes.is_trashed = 1;
  else if (action === 'RESTORE') changes.is_trashed = 0;
  else if (status && ['NEW', 'CONTACTED', 'CLOSED'].includes(status)) changes.status = status;
  else return { error: 'invalid_action' };
  const [field, value] = Object.entries(changes)[0];
  const now = new Date().toISOString();
  const result = db.prepare(`UPDATE requests SET ${field} = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?`)
    .run(value, now, id, version);
  if (!result.changes) return { error: 'conflict' };
  db.prepare('INSERT INTO request_events (request_id, action, created_at) VALUES (?, ?, ?)')
    .run(id, action || `STATUS_${status}`, now);
  return { request: getRequest(db, id) };
}

export function deleteRequest(db, id, version) {
  const current = getRequest(db, id);
  if (!current) return { error: 'not_found' };
  if (current.version !== version) return { error: 'conflict' };
  if (!current.is_trashed) return { error: 'must_trash_first' };
  db.prepare('DELETE FROM requests WHERE id = ? AND version = ?').run(id, version);
  return { ok: true };
}
