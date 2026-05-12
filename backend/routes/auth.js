const express = require('express');
const pool = require('../config/db');
const {
  hashPassword,
  verifyPassword,
  needsRehash,
  createSession,
  clearSession,
  getSessionUser,
  setSessionCookie,
} = require('../lib/sessionStore');
const { validateRegisterPayload, validateLoginPayload } = require('../lib/validation');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  let payload;
  try {
    payload = validateRegisterPayload(req.body || {});
  } catch (err) {
    return next(err);
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [payload.name, payload.email, hashPassword(payload.password)]
    );
    const user = result.rows[0];
    const token = await createSession(user);
    setSessionCookie(res, token);
    res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email is already in use' });
    }
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  let payload;
  try {
    payload = validateLoginPayload(req.body || {});
  } catch (err) {
    return next(err);
  }

  try {
    const result = await pool.query('SELECT id, name, email, password_hash, is_active FROM users WHERE LOWER(email) = LOWER($1)', [payload.email]);
    const user = result.rows[0];
    if (!user || !user.is_active || !verifyPassword(payload.password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (needsRehash(user.password_hash)) {
      await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [user.id, hashPassword(payload.password)]);
    }

    const sessionUser = { id: user.id, name: user.name, email: user.email };
    const token = await createSession(sessionUser);
    setSessionCookie(res, token);
    res.json(sessionUser);
  } catch (err) {
    return next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    await clearSession(req, res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
