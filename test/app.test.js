const assert = require('node:assert/strict');
const test = require('node:test');
const { withServer } = require('./helpers');

test('GET /app/ serves the connected TaskTracker application', async () => {
  await withServer(18183, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app/`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /TaskTracker/);
    assert.match(body, /data-task-form/);
    assert.match(body, /app.js/);
  });
});
