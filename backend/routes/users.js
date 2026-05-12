const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/requireAuth');
const { hashPassword, verifyPassword, updateSessionUser } = require('../lib/sessionStore');
const { validateProfilePayload } = require('../lib/validation');

const router = express.Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, title, avatar_url, avatar_color, bio, timezone, locale, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/me', requireAuth, async (req, res, next) => {
  let payload;
  try {
    payload = validateProfilePayload(req.body || {});
  } catch (err) {
    return next(err);
  }

  try {
    const currentUserResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const currentUser = currentUserResult.rows[0];
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    if (payload.password && !verifyPassword(payload.currentPassword, currentUser.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

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
      [
        req.user.id,
        payload.name,
        payload.email,
        payload.password ? hashPassword(payload.password) : null,
        payload.bio,
        payload.timezone,
        payload.locale,
        payload.title,
        payload.avatarUrl,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });

    await updateSessionUser(req, { id: result.rows[0].id, name: result.rows[0].name, email: result.rows[0].email });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email is already in use' });
    next(err);
  }
});

module.exports = router;
