const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function readEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  const values = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    values[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return values;
}

function hasRunnableDbConfig() {
  const envValues = readEnvFile();
  const password = process.env.DB_PASSWORD || envValues.DB_PASSWORD || '';
  const sessionSecret = process.env.SESSION_SECRET || envValues.SESSION_SECRET || '';
  return password && password !== 'change_me' && sessionSecret && !sessionSecret.includes('change_me');
}

async function startServer(port) {
  const server = spawn(process.execPath, ['index.js'], {
    cwd: __dirname + '/..',
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('server did not start')), 5000);
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes(`Server running on port ${port}`)) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.stderr.on('data', (chunk) => {
      clearTimeout(timeout);
      reject(new Error(chunk.toString()));
    });
  });

  return server;
}

async function fetchJson(port, pathName, options) {
  const response = await fetch(`http://127.0.0.1:${port}${pathName}`, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function extractCookies(response) {
  const setCookieHeader = response.headers.get('set-cookie') || '';
  if (!setCookieHeader) return [];

  return setCookieHeader
    .split(/, (?=[^;]+=)/)
    .map((entry) => entry.split(';')[0].trim())
    .filter(Boolean);
}

function extractSessionCookie(response) {
  return extractCookies(response).find((cookie) => cookie.startsWith('session=')) || '';
}

function extractCsrfCookie(response) {
  return extractCookies(response).find((cookie) => cookie.startsWith('csrf_token=')) || '';
}

async function registerAndLogin(port, overrides = {}) {
  const unique = Date.now() + Math.floor(Math.random() * 1000);
  const password = overrides.password || 'TaskTracker@123';
  const payload = {
    name: overrides.name || `Integration User ${unique}`,
    email: overrides.email || `integration-${unique}@example.com`,
    password,
  };

  const registerResult = await fetchJson(port, '/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const sessionCookie = extractSessionCookie(registerResult.response);
  const csrfCookie = extractCsrfCookie(registerResult.response);
  const cookie = [sessionCookie, csrfCookie].filter(Boolean).join('; ');
  const csrfToken = csrfCookie ? csrfCookie.split('=').slice(1).join('=') : '';
  return { cookie, csrfToken, user: registerResult.body, credentials: payload, registerResult };
}

async function withServer(portOrRun, maybeRun) {
  const port = typeof portOrRun === 'number' ? portOrRun : 18182;
  const run = typeof portOrRun === 'function' ? portOrRun : maybeRun;
  const server = await startServer(port);

  try {
    return await run(`http://127.0.0.1:${port}`, port);
  } finally {
    server.kill();
  }
}

module.exports = {
  assert,
  extractCookies,
  extractSessionCookie,
  extractCsrfCookie,
  fetchJson,
  hasRunnableDbConfig,
  registerAndLogin,
  startServer,
  withServer,
};
