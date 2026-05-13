const express = require('express');
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const passport = require('passport');
const { createSession, clearSession, getSessionUser } = require('../lib/sessionStore');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password, confirm_password } = req.body;
  if (!name || !email || !password || !confirm_password) {
    return res.status(400).json({ error: 'Vui long dien day du thong tin' });
  }

  if (password !== confirm_password) {
    return res.status(400).json({ error: 'Mat khau xac nhan khong khop' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Mat khau phai co it nhat 6 ky tu' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email da duoc su dung' });
    }

    // Insert user as verified since we are skipping email verification per user request
    await pool.query(
      'INSERT INTO users (name, email, password_hash, is_verified) VALUES ($1, $2, $3, TRUE)',
      [name, email, hashedPassword]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('register error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) return res.status(401).json({ error: 'Email hoac mat khau khong dung' });
    if (!user.password_hash) return res.status(401).json({ error: 'Tai khoan dang nhap bang Google. Vui long su dung dang nhap Google.' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Email hoac mat khau khong dung' });

    if (!user.is_verified) {
      // Just in case there are old unverified users
      return res.status(403).json({ error: 'Tai khoan chua duoc xac nhan email' });
    }

    const token = createSession(user);
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

// Passport Google OAuth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }),
  (req, res) => {
    // Successful authentication
    const token = createSession(req.user);
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });

    // Redirect to frontend URL
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
