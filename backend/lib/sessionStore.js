const jwt = require('jsonwebtoken');

function createSession(user) {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key';
  // Include user info in the token payload
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    is_verified: user.is_verified,
    google_id: user.google_id
  };
  
  // Token expires in 7 days
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

function getSessionUser(req) {
  // Use cookie-parser's req.cookies if available, fallback to manual parsing
  let token = null;
  if (req.cookies && req.cookies.session) {
    token = req.cookies.session;
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/session=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret_key';
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (err) {
    return null;
  }
}

function clearSession(req, res) {
  res.clearCookie('session', { path: '/' });
}

module.exports = {
  createSession,
  getSessionUser,
  clearSession,
};
