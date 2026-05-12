const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const pool = require('./config/db');
const { config } = require('./config/env');
const { ensureSessionSecret } = require('./lib/sessionStore');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const openApiDocument = require('./docs/openapi.json');
const logger = require('./lib/logger');
const metrics = require('./lib/metrics');

ensureSessionSecret();

const app = express();
const frontendRoot = path.join(__dirname, '..', 'frontend');
const frontendPublicDir = path.join(frontendRoot, 'public');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

function parseCookies(headerValue) {
  const cookies = {};
  for (const part of String(headerValue || '').split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const name = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (name) cookies[name] = value;
  }
  return cookies;
}

function requireCsrf(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  const cookies = parseCookies(req.headers.cookie || '');
  const csrfCookie = cookies.csrf_token;
  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  return next();
}

function attachRequestContext(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const route = req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : req.originalUrl;
    metrics.recordRequest({
      method: req.method,
      route,
      statusCode: res.statusCode,
      durationMs,
    });
    logger.info('http_request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      route,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
    });
  });

  next();
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(attachRequestContext);
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/app', express.static(frontendPublicDir));
app.use('/public', express.static(frontendPublicDir));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/projects', requireCsrf, projectRoutes);
app.use('/api/tasks', requireCsrf, taskRoutes);
app.use('/api/users', requireCsrf, userRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, environment: config.nodeEnv });
});

app.get('/api/health/live', (_req, res) => {
  res.json({ ok: true, status: 'live', environment: config.nodeEnv });
});

app.get('/api/health/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, status: 'ready', checks: { database: 'up' } });
  } catch (err) {
    logger.error('readiness_check_failed', { error: err.message });
    res.status(503).json({ ok: false, status: 'not_ready', checks: { database: 'down' } });
  }
});

app.get('/api/docs/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

app.get('/api/metrics', (_req, res) => {
  res.json(metrics.snapshot());
});

app.get('/api/docs', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TaskTracker API Docs</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; color: #1f2937; }
    code { background: #f3f4f6; padding: 0.15rem 0.35rem; border-radius: 0.25rem; }
    pre { background: #111827; color: #f9fafb; padding: 1rem; border-radius: 0.5rem; overflow: auto; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>TaskTracker API Docs</h1>
  <p>OpenAPI document: <a href="/api/docs/openapi.json"><code>/api/docs/openapi.json</code></a></p>
  <p>This project currently serves a lightweight machine-readable OpenAPI spec for the core API routes.</p>
  <pre>${JSON.stringify(openApiDocument, null, 2).replace(/</g, '&lt;')}</pre>
</body>
</html>`);
});

app.get('/', (_req, res) => res.redirect('/app/'));

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, _next) => {
  logger.error('request_error', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode: err.status || 500,
    error: err.message || 'Internal server error',
  });
  if (res.headersSent) return;
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
