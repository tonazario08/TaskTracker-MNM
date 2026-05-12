const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { assert, hasRunnableDbConfig, withServer } = require('./helpers');

const canRunDbTests = hasRunnableDbConfig();
const screenTest = canRunDbTests ? test : test.skip;

screenTest('GET /public/index.html serves the frontend shell', async () => {
  await withServer(18188, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/public/index.html`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /TaskTracker/);
    assert.match(body, /id="screen-links"/);
  });
});

screenTest('GET /src is not served directly anymore', async () => {
  await withServer(18189, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/src/app.js`);

    assert.equal(response.status, 404);
  });
});


screenTest('task list page source includes create-task modal and state regions', async () => {
  const body = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'pages', 'TaskListPage.html'), 'utf8');

  assert.match(body, /id="create-task-modal"/);
  assert.match(body, /id="create-task-form"/);
  assert.match(body, /id="task-list-state"/);
  assert.match(body, /id="task-list-summary"/);
});

screenTest('project page source includes create-delete modals and status region', async () => {
  const body = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'pages', 'ProjectPage.html'), 'utf8');

  assert.match(body, /id="create-project-modal"/);
  assert.match(body, /id="delete-project-modal"/);
  assert.match(body, /id="project-list-state"/);
});

screenTest('frontend scripts include inline state handlers for task and project pages', async () => {
  await withServer(18192, async (baseUrl) => {
    const taskScriptResponse = await fetch(`${baseUrl}/public/assets/js/TaskListPage.js`);
    const taskScript = await taskScriptResponse.text();
    const projectScriptResponse = await fetch(`${baseUrl}/public/assets/js/ProjectPage.js`);
    const projectScript = await projectScriptResponse.text();

    assert.equal(taskScriptResponse.status, 200);
    assert.equal(projectScriptResponse.status, 200);
    assert.match(taskScript, /showTaskListState/);
    assert.match(taskScript, /create-task-modal/);
    assert.match(projectScript, /showProjectListState/);
    assert.match(projectScript, /delete-project-modal/);
  });
});
