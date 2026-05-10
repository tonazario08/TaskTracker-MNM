const express = require('express');
const pool = require('../config/db');
const { hashPassword, createSession, clearSession, getSessionUser } = require('../lib/sessionStore');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Vui long dien day du thong tin' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashPassword(password)]
    );
    const user = result.rows[0];
    const token = createSession(user);
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax' });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email da duoc su dung' });
    }
    console.error('register error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ error: 'Email hoac mat khau khong dung' });
    }

    const sessionUser = { id: user.id, name: user.name, email: user.email };
    const token = createSession(sessionUser);
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax' });
    res.json(sessionUser);
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

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
