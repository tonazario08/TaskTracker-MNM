const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/requireAuth');
const { hashPassword, updateSessionUser } = require('../lib/sessionStore');

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, title, avatar_url, avatar_color, bio, timezone, locale, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Khong tim thay user' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('get me error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.put('/me', requireAuth, async (req, res) => {
  const { name, email, password, bio, timezone, locale, title, avatarUrl } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name va email la bat buoc' });

  try {
    const result = await pool.query(
      `UPDATE users
       SET name = $2,
           email = $3,
           password_hash = COALESCE($4, password_hash),
           bio = COALESCE($5, bio),
           timezone = COALESCE($6, timezone),
           locale = COALESCE($7, locale),
           title = COALESCE($8, title),
           avatar_url = COALESCE($9, avatar_url)
       WHERE id = $1
       RETURNING id, name, email, title, avatar_url, avatar_color, bio, timezone, locale, is_active, created_at, updated_at`,
      [req.user.id, name, email, password ? hashPassword(password) : null, bio, timezone, locale, title, avatarUrl]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Khong tim thay user' });

    updateSessionUser(req, { id: result.rows[0].id, name: result.rows[0].name, email: result.rows[0].email });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email da duoc su dung' });
    console.error('update me error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

module.exports = router;
