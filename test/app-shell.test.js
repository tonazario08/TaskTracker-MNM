const test = require('node:test');
const { assert, hasRunnableDbConfig, withServer } = require('./helpers');

const canRunDbTests = hasRunnableDbConfig();
const shellTest = canRunDbTests ? test : test.skip;

shellTest('GET / redirects to /app/', async () => {
  await withServer(18186, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`, { redirect: 'manual' });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/app/');
  });
});

shellTest('GET /app/ includes the primary app links', async () => {
  await withServer(18187, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /TaskTracker/);
    assert.match(html, /id="primary-link"/);
    assert.match(html, /Login/);
    assert.match(html, /Register/);
  });
});
