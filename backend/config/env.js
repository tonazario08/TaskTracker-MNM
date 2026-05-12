require('dotenv').config();

function requireString(name, minLength = 1) {
  const value = String(process.env[name] || '').trim();
  if (value.length < minLength) {
    throw new Error(`Missing or invalid environment variable: ${name}`);
  }
  return value;
}

function requireNumber(name, fallback) {
  const raw = process.env[name] ?? fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Missing or invalid numeric environment variable: ${name}`);
  }
  return value;
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: requireNumber('PORT', 8080),
  corsOrigin: requireString('CORS_ORIGIN'),
  sessionSecret: requireString('SESSION_SECRET', 16),
  sessionTtlHours: requireNumber('SESSION_TTL_HOURS', 24),
  db: {
    host: requireString('DB_HOST'),
    port: requireNumber('DB_PORT', 5432),
    database: requireString('DB_NAME'),
    user: requireString('DB_USER'),
    password: requireString('DB_PASSWORD'),
  },
};

module.exports = { config };
