const crypto = require('node:crypto');

const sessions = {};

function hashPassword(password) {
  return crypto.createHash('sha256').update(`${password}:tasktracker_salt`).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getSessionToken(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(/session=([a-f0-9]+)/);
  return match ? match[1] : null;
}

function getSessionUser(req) {
  const token = getSessionToken(req);
  return token ? sessions[token] || null : null;
}

function createSession(user) {
  const token = generateToken();
  sessions[token] = user;
  return token;
}

function updateSessionUser(req, user) {
  const token = getSessionToken(req);
  if (token && sessions[token]) {
    sessions[token] = user;
  }
}

function clearSession(req, res) {
  const token = getSessionToken(req);
  if (token) delete sessions[token];
  res.clearCookie('session');
}

module.exports = {
  hashPassword,
  getSessionUser,
  createSession,
  updateSessionUser,
  clearSession,
};
