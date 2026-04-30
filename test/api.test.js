const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const test = require('node:test');

async function withServer(run) {
  const port = 18182;
  const server = spawn(process.execPath, ['index.js'], {
    cwd: __dirname + '/..',
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
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

    return await run(`http://127.0.0.1:${port}`);
  } finally {
    server.kill();
  }
}

test('GET /api/tasks returns task data for the app', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/tasks`);
    const tasks = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(tasks));
    assert.ok(tasks.length >= 3);
    assert.deepEqual(Object.keys(tasks[0]).sort(), [
      'assignee',
      'dueDate',
      'id',
      'priority',
      'projectId',
      'status',
      'title',
    ]);
  });
});

test('POST /api/tasks creates a new task', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Prepare launch checklist',
        projectId: 'marketing',
        priority: 'High',
        assignee: 'Alex Morgan',
        dueDate: '2026-05-01',
      }),
    });
    const task = await response.json();

    assert.equal(response.status, 201);
    assert.equal(task.title, 'Prepare launch checklist');
    assert.equal(task.status, 'To Do');
    assert.ok(task.id);
  });
});

test('GET /api/projects returns project data for task grouping', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/projects`);
    const projects = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(projects));
    assert.ok(projects.some((project) => project.id === 'marketing'));
  });
});
