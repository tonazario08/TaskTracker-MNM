const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = require('../config/db');

const SESSION_COOKIE_NAME = 'session';
const CSRF_COOKIE_NAME = 'csrf_token';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 24);
const BCRYPT_ROUNDS = 12;

let sessionTableReadyPromise;

function ensureSessionSecret() {
  if (!SESSION_SECRET || SESSION_SECRET.length < 16) {
    throw new Error('SESSION_SECRET must be set to a random value with at least 16 characters');
  }
}

function hashLegacyPassword(password) {
  const value = String(password || '');
  return crypto.pbkdf2Sync(value, SESSION_SECRET, 120000, 64, 'sha512').toString('hex');
}

function hashPassword(password) {
  const value = String(password || '');
  return bcrypt.hashSync(value, BCRYPT_ROUNDS);
}

function verifyPassword(password, passwordHash) {
  const hash = String(passwordHash || '');
  if (!hash) return false;

  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    return bcrypt.compareSync(String(password || ''), hash);
  }

  return crypto.timingSafeEqual(
    Buffer.from(hashLegacyPassword(password), 'utf8'),
    Buffer.from(hash, 'utf8')
  );
}

function needsRehash(passwordHash) {
  const hash = String(passwordHash || '');
  return !(hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$'));
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

function generateDatabaseSafeToken(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

function getExpiryDate() {
  return new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
}

async function ensureSessionTable() {
  if (!sessionTableReadyPromise) {
    sessionTableReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_sessions (
          token VARCHAR(64) PRIMARY KEY,
          csrf_token VARCHAR(64),
          user_id BIGINT NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          user_email VARCHAR(320) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query("ALTER TABLE app_sessions ADD COLUMN IF NOT EXISTS csrf_token VARCHAR(64)");
      await pool.query("UPDATE app_sessions SET csrf_token = $1 WHERE csrf_token IS NULL", [generateDatabaseSafeToken()]);
      await pool.query("ALTER TABLE app_sessions ALTER COLUMN csrf_token SET NOT NULL");
    })().catch((err) => {
      sessionTableReadyPromise = null;
      throw err;
    });
  }
  await sessionTableReadyPromise;
}

async function cleanupExpiredSessions() {
  await ensureSessionTable();
  await pool.query('DELETE FROM app_sessions WHERE expires_at <= NOW()');
}

function getSessionToken(req) {
  const raw = req.cookies?.[SESSION_COOKIE_NAME] || '';
  return /^[a-f0-9]{64}$/.test(raw) ? raw : null;
}

async function getSessionUser(req) {
  await cleanupExpiredSessions();
  const token = getSessionToken(req);
  if (!token) return null;

  const result = await pool.query(
    `SELECT token, user_id, user_name, user_email, expires_at
     FROM app_sessions
     WHERE token = $1
     LIMIT 1`,
    [token]
  );

  const session = result.rows[0];
  if (!session) return null;

  return {
    id: session.user_id,
    name: session.user_name,
    email: session.user_email,
  };
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    expires: getExpiryDate(),
    path: '/',
  };
}

function getCsrfCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: false,
    sameSite: 'lax',
    secure: isProduction,
    expires: getExpiryDate(),
    path: '/',
  };
}

async function createSession(user) {
  await cleanupExpiredSessions();
  const token = generateToken();
  const csrfToken = generateCsrfToken();
  const expiresAt = getExpiryDate();

  await pool.query(
    `INSERT INTO app_sessions (token, csrf_token, user_id, user_name, user_email, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [token, csrfToken, user.id, user.name, user.email, expiresAt]
  );

  return { token, csrfToken };
}

function setSessionCookie(res, session) {
  res.cookie(SESSION_COOKIE_NAME, session.token, getCookieOptions());
  res.cookie(CSRF_COOKIE_NAME, session.csrfToken, getCsrfCookieOptions());
}

async function updateSessionUser(req, user) {
  const token = getSessionToken(req);
  if (!token) return;

  await ensureSessionTable();
  await pool.query(
    `UPDATE app_sessions
     SET user_name = $2,
         user_email = $3,
         expires_at = $4
     WHERE token = $1`,
    [token, user.name, user.email, getExpiryDate()]
  );
}

async function clearSession(req, res) {
  const token = getSessionToken(req);
  if (token) {
    await ensureSessionTable();
    await pool.query('DELETE FROM app_sessions WHERE token = $1', [token]);
  }
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
}

module.exports = {
  ensureSessionSecret,
  ensureSessionTable,
  hashPassword,
  verifyPassword,
  needsRehash,
  getSessionUser,
  createSession,
  setSessionCookie,
  updateSessionUser,
  clearSession,
};
