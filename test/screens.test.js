const assert = require('node:assert/strict');
const test = require('node:test');
const { withServer } = require('./helpers');

test('serves copied Stitch screens from /screens', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/screens/login/code.html`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /TaskTracker - Login/);
  });
});

test('serves the connected TaskTracker app from /app/', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app/`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /TaskTracker Management/);
    assert.match(body, /app.js/);
  });
});
