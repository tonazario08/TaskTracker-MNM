const express = require('express');
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const passport = require('passport');
const { createSession, clearSession, getSessionUser } = require('../lib/sessionStore');

const router = express.Router();

router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirm_password || req.body.confirmPassword || '');

  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Vui long dien day du thong tin' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Mat khau xac nhan khong khop' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Mat khau phai co it nhat 6 ky tu' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email da duoc su dung' });
    }

    await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)',
      [name, email, hashedPassword]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('register error:', err.message);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email da duoc su dung' });
    }
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Vui long nhap email va mat khau' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Email hoac mat khau khong dung' });
    if (!user.password_hash) return res.status(401).json({ error: 'Tai khoan dang nhap bang Google. Vui long su dung dang nhap Google.' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Email hoac mat khau khong dung' });

    const token = createSession(user);
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }),
  (req, res) => {
    const token = createSession(req.user);
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/dashboard`);
  }
);

router.post('/logout', (req, res) => {
  clearSession(req, res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Chua dang nhap' });
  res.json(user);
});

module.exports = router;
