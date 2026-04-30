const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

async function startServer(port) {
  const server = spawn(process.execPath, ['index.js'], {
    cwd: __dirname + '/..',
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('server did not start')), 3000);
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

async function fetchJson(port, path, options) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
  const body = await response.json();
  return { response, body };
}

async function withServer(portOrRun, maybeRun) {
  const port = typeof portOrRun === 'number' ? portOrRun : 18182;
  const run = typeof portOrRun === 'function' ? portOrRun : maybeRun;
  const server = await startServer(port);

  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    server.kill();
  }
}

module.exports = { assert, fetchJson, startServer, withServer };
