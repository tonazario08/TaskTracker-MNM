const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const test = require('node:test');

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

test('serves the backend-connected TaskTracker app shell', async () => {
  const port = 18184;
  const server = await startServer(port);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/app/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /TaskTracker Management/);
    assert.match(html, /id="task-form"/);
    assert.match(html, /app.js/);
  } finally {
    server.kill();
  }
});
