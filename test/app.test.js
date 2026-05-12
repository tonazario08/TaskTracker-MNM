const test = require('node:test');
const { assert, hasRunnableDbConfig, withServer } = require('./helpers');

const canRunDbTests = hasRunnableDbConfig();
const appTest = canRunDbTests ? test : test.skip;

appTest('GET /app/ serves the current TaskTracker shell', async () => {
  await withServer(18185, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app/`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /<title>TaskTracker<\/title>/);
    assert.match(body, /id="app-status"/);
    assert.match(body, /assets\/js\/app-shell\.js/);
  });
});
