const { getSessionUser } = require('../lib/sessionStore');

function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Chua dang nhap' });
  req.user = user;
  next();
}

module.exports = { requireAuth };
