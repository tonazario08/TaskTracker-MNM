const test = require('node:test');
const { assert, fetchJson, hasRunnableDbConfig, registerAndLogin, withServer } = require('./helpers');
const pool = require('../backend/config/db');

const canRunDbTests = hasRunnableDbConfig();
const dbTest = canRunDbTests ? test : test.skip;

function authHeaders(cookie, csrfToken, extraHeaders = {}) {
  return {
    cookie,
    'x-csrf-token': csrfToken,
    ...extraHeaders,
  };
}

async function addProjectMember(projectId, userId, role, invitedByUserId) {
  await pool.query(
    `INSERT INTO project_members (project_id, user_id, role, allocation_pct, invited_by_user_id)
     VALUES ($1, $2, $3, 100, $4)
     ON CONFLICT (project_id, user_id)
     DO UPDATE SET role = EXCLUDED.role, left_at = NULL, updated_at = NOW()`,
    [projectId, userId, role, invitedByUserId]
  );
}

dbTest('GET /api/health returns the current environment', async () => {
  await withServer(18182, async (_baseUrl, port) => {
    const { response, body } = await fetchJson(port, '/api/health');

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(typeof body.environment, 'string');
  });
});

dbTest('GET /api/health/live returns liveness', async () => {
  await withServer(18221, async (_baseUrl, port) => {
    const { response, body } = await fetchJson(port, '/api/health/live');

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.status, 'live');
  });
});

dbTest('GET /api/health/ready returns readiness with database status', async () => {
  await withServer(18222, async (_baseUrl, port) => {
    const { response, body } = await fetchJson(port, '/api/health/ready');

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.status, 'ready');
    assert.equal(body.checks.database, 'up');
  });
});

dbTest('GET /api/metrics returns a metrics snapshot', async () => {
  await withServer(18223, async (_baseUrl, port) => {
    await fetchJson(port, '/api/health');
    const { response, body } = await fetchJson(port, '/api/metrics');

    assert.equal(response.status, 200);
    assert.equal(typeof body.generatedAt, 'string');
    assert.ok(Array.isArray(body.requests));
    assert.ok(body.requests.some((item) => item.method === 'GET'));
  });
});

dbTest('GET /api/tasks requires authentication', async () => {
  await withServer(18183, async (_baseUrl, port) => {
    const { response, body } = await fetchJson(port, '/api/tasks');

    assert.equal(response.status, 401);
    assert.equal(body.error, 'Authentication required');
  });
});

dbTest('authenticated user can fetch their profile session', async () => {
  await withServer(18184, async (_baseUrl, port) => {
    const { cookie, user, registerResult } = await registerAndLogin(port);

    assert.equal(registerResult.response.status, 201);
    assert.ok(cookie.includes('session='));
    assert.ok(cookie.includes('csrf_token='));

    const { response, body } = await fetchJson(port, '/api/auth/me', {
      headers: { cookie },
    });

    assert.equal(response.status, 200);
    assert.equal(body.id, user.id);
    assert.equal(body.email, user.email);
  });
});

dbTest('write endpoints reject missing CSRF token', async () => {
  await withServer(18185, async (_baseUrl, port) => {
    const { cookie } = await registerAndLogin(port);

    const createResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
      },
      body: JSON.stringify({
        name: 'Blocked Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(createResult.response.status, 403);
    assert.equal(createResult.body.error, 'Invalid CSRF token');
  });
});

dbTest('authenticated user can create and fetch a project', async () => {
  await withServer(18186, async (_baseUrl, port) => {
    const { cookie, csrfToken } = await registerAndLogin(port);

    const createResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(cookie, csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Integration Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(createResult.response.status, 201);
    assert.ok(createResult.body.id);
    assert.equal(createResult.body.status, 'Planning');

    const listResult = await fetchJson(port, '/api/projects', {
      headers: { cookie },
    });

    assert.equal(listResult.response.status, 200);
    assert.ok(Array.isArray(listResult.body));
    assert.ok(listResult.body.some((project) => project.id === createResult.body.id));
  });
});

dbTest('authenticated user can create and fetch a task in their project', async () => {
  await withServer(18187, async (_baseUrl, port) => {
    const { cookie, csrfToken } = await registerAndLogin(port);

    const projectResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(cookie, csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Task Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(projectResult.response.status, 201);

    const taskResult = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(cookie, csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Prepare integration checklist',
        projectId: projectResult.body.id,
        priority: 'High',
        status: 'To Do',
      }),
    });

    assert.equal(taskResult.response.status, 201);
    assert.equal(taskResult.body.title, 'Prepare integration checklist');
    assert.equal(taskResult.body.projectId, projectResult.body.id);

    const listResult = await fetchJson(port, '/api/tasks', {
      headers: { cookie },
    });

    assert.equal(listResult.response.status, 200);
    assert.ok(Array.isArray(listResult.body));
    assert.ok(listResult.body.some((task) => task.id === taskResult.body.id));
  });
});


dbTest("user cannot read or list another user's private project", async () => {
  await withServer(18188, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);
    const stranger = await registerAndLogin(port);

    const createResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Owner Private Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(createResult.response.status, 201);

    const foreignDetail = await fetchJson(port, '/api/projects/' + createResult.body.id, {
      headers: { cookie: stranger.cookie },
    });

    assert.equal(foreignDetail.response.status, 404);
    assert.equal(foreignDetail.body.error, 'Project not found');

    const foreignList = await fetchJson(port, '/api/projects', {
      headers: { cookie: stranger.cookie },
    });

    assert.equal(foreignList.response.status, 200);
    assert.ok(Array.isArray(foreignList.body));
    assert.ok(!foreignList.body.some((project) => project.id === createResult.body.id));
  });
});

dbTest("user cannot modify or delete another user's private project", async () => {
  await withServer(18189, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);
    const stranger = await registerAndLogin(port);

    const createResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Locked Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(createResult.response.status, 201);

    const patchResult = await fetchJson(port, '/api/projects/' + createResult.body.id, {
      method: 'PATCH',
      headers: authHeaders(stranger.cookie, stranger.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ name: 'Intrusion Attempt' }),
    });

    assert.equal(patchResult.response.status, 404);
    assert.equal(patchResult.body.error, 'Project not found');

    const deleteResult = await fetchJson(port, '/api/projects/' + createResult.body.id, {
      method: 'DELETE',
      headers: authHeaders(stranger.cookie, stranger.csrfToken),
    });

    assert.equal(deleteResult.response.status, 404);
    assert.equal(deleteResult.body.error, 'Project not found');
  });
});

dbTest("user cannot read, create in, or mutate another user's private task data", async () => {
  await withServer(18190, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);
    const stranger = await registerAndLogin(port);

    const projectResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Owner Task Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(projectResult.response.status, 201);

    const taskResult = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Owner Private Task',
        projectId: projectResult.body.id,
        priority: 'High',
        status: 'To Do',
      }),
    });

    assert.equal(taskResult.response.status, 201);

    const foreignList = await fetchJson(port, '/api/tasks', {
      headers: { cookie: stranger.cookie },
    });

    assert.equal(foreignList.response.status, 200);
    assert.ok(Array.isArray(foreignList.body));
    assert.ok(!foreignList.body.some((task) => task.id === taskResult.body.id));

    const foreignDetail = await fetchJson(port, '/api/tasks/' + taskResult.body.id, {
      headers: { cookie: stranger.cookie },
    });

    assert.equal(foreignDetail.response.status, 404);
    assert.equal(foreignDetail.body.error, 'Task not found');

    const foreignCreate = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(stranger.cookie, stranger.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Unauthorized Task',
        projectId: projectResult.body.id,
        priority: 'Medium',
        status: 'To Do',
      }),
    });

    assert.equal(foreignCreate.response.status, 403);
    assert.equal(foreignCreate.body.error, 'You do not have permission to modify tasks in this project');

    const foreignPatch = await fetchJson(port, '/api/tasks/' + taskResult.body.id, {
      method: 'PATCH',
      headers: authHeaders(stranger.cookie, stranger.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ status: 'Done' }),
    });

    assert.equal(foreignPatch.response.status, 404);
    assert.equal(foreignPatch.body.error, 'Task not found');

    const foreignDelete = await fetchJson(port, '/api/tasks/' + taskResult.body.id, {
      method: 'DELETE',
      headers: authHeaders(stranger.cookie, stranger.csrfToken),
    });

    assert.equal(foreignDelete.response.status, 404);
    assert.equal(foreignDelete.body.error, 'Task not found');
  });
});


dbTest("user cannot read or create comments on another user's private task", async () => {
  await withServer(18191, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);
    const stranger = await registerAndLogin(port);

    const projectResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Comment Privacy Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(projectResult.response.status, 201);

    const taskResult = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Comment Protected Task',
        projectId: projectResult.body.id,
        priority: 'High',
        status: 'To Do',
      }),
    });

    assert.equal(taskResult.response.status, 201);

    const ownerComment = await fetchJson(port, '/api/tasks/' + taskResult.body.id + '/comments', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ content: 'Owner only note' }),
    });

    assert.equal(ownerComment.response.status, 201);

    const foreignRead = await fetchJson(port, '/api/tasks/' + taskResult.body.id + '/comments', {
      headers: { cookie: stranger.cookie },
    });

    assert.equal(foreignRead.response.status, 404);
    assert.equal(foreignRead.body.error, 'Task not found');

    const foreignCreate = await fetchJson(port, '/api/tasks/' + taskResult.body.id + '/comments', {
      method: 'POST',
      headers: authHeaders(stranger.cookie, stranger.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ content: 'Intruder comment' }),
    });

    assert.equal(foreignCreate.response.status, 404);
    assert.equal(foreignCreate.body.error, 'Task not found');
  });
});

dbTest("user cannot add labels or subtasks to another user's private task", async () => {
  await withServer(18192, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);
    const stranger = await registerAndLogin(port);

    const projectResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Nested Privacy Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(projectResult.response.status, 201);

    const taskResult = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Protected Parent Task',
        projectId: projectResult.body.id,
        priority: 'Medium',
        status: 'To Do',
      }),
    });

    assert.equal(taskResult.response.status, 201);

    const foreignLabel = await fetchJson(port, '/api/tasks/' + taskResult.body.id + '/labels', {
      method: 'POST',
      headers: authHeaders(stranger.cookie, stranger.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ name: 'Secret', color: '#FF0000' }),
    });

    assert.equal(foreignLabel.response.status, 404);
    assert.equal(foreignLabel.body.error, 'Task not found');

    const foreignSubtask = await fetchJson(port, '/api/tasks/' + taskResult.body.id + '/subtasks', {
      method: 'POST',
      headers: authHeaders(stranger.cookie, stranger.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Intruder Subtask',
        priority: 'Low',
        status: 'To Do',
      }),
    });

    assert.equal(foreignSubtask.response.status, 404);
    assert.equal(foreignSubtask.body.error, 'Task not found');
  });
});


dbTest('project role matrix is enforced for project update and delete', async () => {
  await withServer(18193, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);
    const admin = await registerAndLogin(port);
    const manager = await registerAndLogin(port);
    const member = await registerAndLogin(port);
    const viewer = await registerAndLogin(port);

    const projectResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Role Matrix Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(projectResult.response.status, 201);

    await addProjectMember(projectResult.body.id, admin.user.id, 'Admin', owner.user.id);
    await addProjectMember(projectResult.body.id, manager.user.id, 'Manager', owner.user.id);
    await addProjectMember(projectResult.body.id, member.user.id, 'Member', owner.user.id);
    await addProjectMember(projectResult.body.id, viewer.user.id, 'Viewer', owner.user.id);

    const adminPatch = await fetchJson(port, '/api/projects/' + projectResult.body.id, {
      method: 'PATCH',
      headers: authHeaders(admin.cookie, admin.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ description: 'Updated by admin' }),
    });
    assert.equal(adminPatch.response.status, 200);
    assert.equal(adminPatch.body.description, 'Updated by admin');

    const managerPatch = await fetchJson(port, '/api/projects/' + projectResult.body.id, {
      method: 'PATCH',
      headers: authHeaders(manager.cookie, manager.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ description: 'Updated by manager' }),
    });
    assert.equal(managerPatch.response.status, 200);
    assert.equal(managerPatch.body.description, 'Updated by manager');

    const memberPatch = await fetchJson(port, '/api/projects/' + projectResult.body.id, {
      method: 'PATCH',
      headers: authHeaders(member.cookie, member.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ description: 'Updated by member' }),
    });
    assert.equal(memberPatch.response.status, 403);
    assert.equal(memberPatch.body.error, 'You do not have permission to update this project');

    const viewerPatch = await fetchJson(port, '/api/projects/' + projectResult.body.id, {
      method: 'PATCH',
      headers: authHeaders(viewer.cookie, viewer.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ description: 'Updated by viewer' }),
    });
    assert.equal(viewerPatch.response.status, 403);
    assert.equal(viewerPatch.body.error, 'You do not have permission to update this project');

    const managerDelete = await fetchJson(port, '/api/projects/' + projectResult.body.id, {
      method: 'DELETE',
      headers: authHeaders(manager.cookie, manager.csrfToken),
    });
    assert.equal(managerDelete.response.status, 403);
    assert.equal(managerDelete.body.error, 'You do not have permission to delete this project');

    const memberDelete = await fetchJson(port, '/api/projects/' + projectResult.body.id, {
      method: 'DELETE',
      headers: authHeaders(member.cookie, member.csrfToken),
    });
    assert.equal(memberDelete.response.status, 403);
    assert.equal(memberDelete.body.error, 'You do not have permission to delete this project');

    const viewerDelete = await fetchJson(port, '/api/projects/' + projectResult.body.id, {
      method: 'DELETE',
      headers: authHeaders(viewer.cookie, viewer.csrfToken),
    });
    assert.equal(viewerDelete.response.status, 403);
    assert.equal(viewerDelete.body.error, 'You do not have permission to delete this project');

    const adminDelete = await fetchJson(port, '/api/projects/' + projectResult.body.id, {
      method: 'DELETE',
      headers: authHeaders(admin.cookie, admin.csrfToken),
    });
    assert.equal(adminDelete.response.status, 200);
    assert.equal(adminDelete.body.ok, true);
  });
});

dbTest('project role matrix is enforced for task create and delete', async () => {
  await withServer(18194, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);
    const admin = await registerAndLogin(port);
    const manager = await registerAndLogin(port);
    const member = await registerAndLogin(port);
    const viewer = await registerAndLogin(port);

    const projectResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Task Role Matrix Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(projectResult.response.status, 201);

    await addProjectMember(projectResult.body.id, admin.user.id, 'Admin', owner.user.id);
    await addProjectMember(projectResult.body.id, manager.user.id, 'Manager', owner.user.id);
    await addProjectMember(projectResult.body.id, member.user.id, 'Member', owner.user.id);
    await addProjectMember(projectResult.body.id, viewer.user.id, 'Viewer', owner.user.id);

    const memberTask = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(member.cookie, member.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Member created task',
        projectId: projectResult.body.id,
        priority: 'Medium',
        status: 'To Do',
      }),
    });
    assert.equal(memberTask.response.status, 201);

    const viewerTask = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(viewer.cookie, viewer.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Viewer should fail',
        projectId: projectResult.body.id,
        priority: 'Low',
        status: 'To Do',
      }),
    });
    assert.equal(viewerTask.response.status, 403);
    assert.equal(viewerTask.body.error, 'You do not have permission to modify tasks in this project');

    const memberDelete = await fetchJson(port, '/api/tasks/' + memberTask.body.id, {
      method: 'DELETE',
      headers: authHeaders(member.cookie, member.csrfToken),
    });
    assert.equal(memberDelete.response.status, 403);
    assert.equal(memberDelete.body.error, 'You do not have permission to delete tasks in this project');

    const viewerDelete = await fetchJson(port, '/api/tasks/' + memberTask.body.id, {
      method: 'DELETE',
      headers: authHeaders(viewer.cookie, viewer.csrfToken),
    });
    assert.equal(viewerDelete.response.status, 403);
    assert.equal(viewerDelete.body.error, 'You do not have permission to delete tasks in this project');

    const managerDelete = await fetchJson(port, '/api/tasks/' + memberTask.body.id, {
      method: 'DELETE',
      headers: authHeaders(manager.cookie, manager.csrfToken),
    });
    assert.equal(managerDelete.response.status, 200);
    assert.equal(managerDelete.body.ok, true);
  });
});


dbTest('project role matrix is enforced for comments labels and subtasks', async () => {
  await withServer(18195, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);
    const manager = await registerAndLogin(port);
    const member = await registerAndLogin(port);
    const viewer = await registerAndLogin(port);

    const projectResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Nested Role Matrix Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(projectResult.response.status, 201);

    await addProjectMember(projectResult.body.id, manager.user.id, 'Manager', owner.user.id);
    await addProjectMember(projectResult.body.id, member.user.id, 'Member', owner.user.id);
    await addProjectMember(projectResult.body.id, viewer.user.id, 'Viewer', owner.user.id);

    const taskResult = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Shared Parent Task',
        projectId: projectResult.body.id,
        priority: 'Medium',
        status: 'To Do',
      }),
    });

    assert.equal(taskResult.response.status, 201);

    const memberComment = await fetchJson(port, '/api/tasks/' + taskResult.body.id + '/comments', {
      method: 'POST',
      headers: authHeaders(member.cookie, member.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ content: 'Member comment' }),
    });
    assert.equal(memberComment.response.status, 201);

    const viewerComment = await fetchJson(port, '/api/tasks/' + taskResult.body.id + '/comments', {
      method: 'POST',
      headers: authHeaders(viewer.cookie, viewer.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ content: 'Viewer comment attempt' }),
    });
    assert.equal(viewerComment.response.status, 403);
    assert.equal(viewerComment.body.error, 'You do not have permission to modify tasks in this project');

    const memberLabel = await fetchJson(port, '/api/tasks/' + taskResult.body.id + '/labels', {
      method: 'POST',
      headers: authHeaders(member.cookie, member.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ name: 'member-label-' + Date.now(), color: '#00AA55' }),
    });
    assert.equal(memberLabel.response.status, 201);

    const viewerLabel = await fetchJson(port, '/api/tasks/' + taskResult.body.id + '/labels', {
      method: 'POST',
      headers: authHeaders(viewer.cookie, viewer.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ name: 'viewer-label-' + Date.now(), color: '#AA0000' }),
    });
    assert.equal(viewerLabel.response.status, 403);
    assert.equal(viewerLabel.body.error, 'You do not have permission to modify tasks in this project');

    const managerSubtask = await fetchJson(port, '/api/tasks/' + taskResult.body.id + '/subtasks', {
      method: 'POST',
      headers: authHeaders(manager.cookie, manager.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Manager subtask',
        priority: 'High',
        status: 'To Do',
      }),
    });
    assert.equal(managerSubtask.response.status, 201);

    const memberSubtask = await fetchJson(port, '/api/tasks/' + taskResult.body.id + '/subtasks', {
      method: 'POST',
      headers: authHeaders(member.cookie, member.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Member subtask',
        priority: 'Low',
        status: 'To Do',
      }),
    });
    assert.equal(memberSubtask.response.status, 201);

    const viewerSubtask = await fetchJson(port, '/api/tasks/' + taskResult.body.id + '/subtasks', {
      method: 'POST',
      headers: authHeaders(viewer.cookie, viewer.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Viewer subtask attempt',
        priority: 'Low',
        status: 'To Do',
      }),
    });
    assert.equal(viewerSubtask.response.status, 403);
    assert.equal(viewerSubtask.body.error, 'You do not have permission to modify tasks in this project');
  });
});


dbTest('profile updates require the current password when changing password', async () => {
  await withServer(18196, async (_baseUrl, port) => {
    const { cookie, csrfToken, credentials } = await registerAndLogin(port);

    const missingCurrent = await fetchJson(port, '/api/users/me', {
      method: 'PUT',
      headers: authHeaders(cookie, csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Updated Name',
        email: credentials.email,
        password: 'NewPassw0rd!',
      }),
    });

    assert.equal(missingCurrent.response.status, 400);
    assert.equal(missingCurrent.body.error, 'Current password is required to set a new password');

    const wrongCurrent = await fetchJson(port, '/api/users/me', {
      method: 'PUT',
      headers: authHeaders(cookie, csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Updated Name',
        email: credentials.email,
        currentPassword: 'WrongPassword123!',
        password: 'NewPassw0rd!',
      }),
    });

    assert.equal(wrongCurrent.response.status, 401);
    assert.equal(wrongCurrent.body.error, 'Current password is incorrect');
  });
});

dbTest('profile updates allow the authenticated user to change their own data', async () => {
  await withServer(18197, async (_baseUrl, port) => {
    const { cookie, csrfToken, credentials, user } = await registerAndLogin(port);
    const newEmail = 'updated-' + Date.now() + '@example.com';

    const updateResult = await fetchJson(port, '/api/users/me', {
      method: 'PUT',
      headers: authHeaders(cookie, csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Updated Profile Name',
        email: newEmail,
        currentPassword: credentials.password,
        password: 'NewPassw0rd!',
        bio: 'Updated bio',
        timezone: 'Asia/Saigon',
        locale: 'vi-VN',
        title: 'Team Lead',
        avatarUrl: 'https://example.com/avatar.png',
      }),
    });

    assert.equal(updateResult.response.status, 200);
    assert.equal(updateResult.body.name, 'Updated Profile Name');
    assert.equal(updateResult.body.email, newEmail);
    assert.equal(updateResult.body.bio, 'Updated bio');

    const meResult = await fetchJson(port, '/api/auth/me', {
      headers: { cookie },
    });

    assert.equal(meResult.response.status, 200);
    assert.equal(meResult.body.email, newEmail);
    assert.equal(meResult.body.name, 'Updated Profile Name');
    assert.equal(meResult.body.id, user.id);
  });
});


dbTest('profile updates reject an email that is already used by another account', async () => {
  await withServer(18198, async (_baseUrl, port) => {
    const firstUser = await registerAndLogin(port);
    const secondUser = await registerAndLogin(port);

    const conflictResult = await fetchJson(port, '/api/users/me', {
      method: 'PUT',
      headers: authHeaders(secondUser.cookie, secondUser.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Second User Updated',
        email: firstUser.credentials.email,
        bio: 'Trying duplicate email',
        timezone: 'Asia/Saigon',
        locale: 'vi-VN',
        title: 'Engineer',
        avatarUrl: 'https://example.com/second-user.png',
      }),
    });

    assert.equal(conflictResult.response.status, 409);
    assert.equal(conflictResult.body.error, 'Email is already in use');

    const meResult = await fetchJson(port, '/api/auth/me', {
      headers: { cookie: secondUser.cookie },
    });

    assert.equal(meResult.response.status, 200);
    assert.equal(meResult.body.email, secondUser.user.email);
    assert.equal(meResult.body.name, secondUser.user.name);
  });
});


dbTest('task creation only allows assignees who belong to the shared project', async () => {
  await withServer(18199, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);
    const member = await registerAndLogin(port);
    const outsider = await registerAndLogin(port);

    const projectResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Assignee Validation Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(projectResult.response.status, 201);

    await addProjectMember(projectResult.body.id, member.user.id, 'Member', owner.user.id);

    const validAssignment = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Assign to member',
        projectId: projectResult.body.id,
        assigneeUserId: member.user.id,
        priority: 'Medium',
        status: 'To Do',
      }),
    });

    assert.equal(validAssignment.response.status, 201);
    assert.equal(validAssignment.body.assigneeUserId, member.user.id);

    const invalidAssignment = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Assign to outsider',
        projectId: projectResult.body.id,
        assigneeUserId: outsider.user.id,
        priority: 'Medium',
        status: 'To Do',
      }),
    });

    assert.equal(invalidAssignment.response.status, 400);
    assert.equal(invalidAssignment.body.error, 'Assignee must belong to the selected project');
  });
});

dbTest('task updates reject reassignment to users outside the shared project', async () => {
  await withServer(18200, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);
    const manager = await registerAndLogin(port);
    const member = await registerAndLogin(port);
    const outsider = await registerAndLogin(port);

    const projectResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Assignee Update Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(projectResult.response.status, 201);

    await addProjectMember(projectResult.body.id, manager.user.id, 'Manager', owner.user.id);
    await addProjectMember(projectResult.body.id, member.user.id, 'Member', owner.user.id);

    const taskResult = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Reassignable task',
        projectId: projectResult.body.id,
        assigneeUserId: member.user.id,
        priority: 'High',
        status: 'To Do',
      }),
    });

    assert.equal(taskResult.response.status, 201);
    assert.equal(taskResult.body.assigneeUserId, member.user.id);

    const validReassignment = await fetchJson(port, '/api/tasks/' + taskResult.body.id, {
      method: 'PATCH',
      headers: authHeaders(manager.cookie, manager.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ assigneeUserId: owner.user.id }),
    });

    assert.equal(validReassignment.response.status, 200);
    assert.equal(validReassignment.body.assigneeUserId, owner.user.id);

    const invalidReassignment = await fetchJson(port, '/api/tasks/' + taskResult.body.id, {
      method: 'PATCH',
      headers: authHeaders(manager.cookie, manager.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ assigneeUserId: outsider.user.id }),
    });

    assert.equal(invalidReassignment.response.status, 400);
    assert.equal(invalidReassignment.body.error, 'Assignee must belong to the selected project');
  });
});


dbTest('task creation rejects parent tasks from a different project', async () => {
  await withServer(18201, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);

    const firstProject = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Parent Source Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    const secondProject = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Parent Target Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(firstProject.response.status, 201);
    assert.equal(secondProject.response.status, 201);

    const parentTask = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Project A Parent',
        projectId: firstProject.body.id,
        priority: 'High',
        status: 'To Do',
      }),
    });

    assert.equal(parentTask.response.status, 201);

    const crossProjectChild = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Invalid cross-project subtask',
        projectId: secondProject.body.id,
        parentTaskId: parentTask.body.id,
        priority: 'Medium',
        status: 'To Do',
      }),
    });

    assert.equal(crossProjectChild.response.status, 400);
    assert.equal(crossProjectChild.body.error, 'Parent task must belong to the same project');
  });
});

dbTest('task creation rejects nested subtasks beyond one level', async () => {
  await withServer(18202, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);

    const projectResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Nested Parent Validation Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(projectResult.response.status, 201);

    const parentTask = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Top-level parent',
        projectId: projectResult.body.id,
        priority: 'High',
        status: 'To Do',
      }),
    });

    assert.equal(parentTask.response.status, 201);

    const firstSubtask = await fetchJson(port, '/api/tasks/' + parentTask.body.id + '/subtasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'First-level subtask',
        priority: 'Medium',
        status: 'To Do',
      }),
    });

    assert.equal(firstSubtask.response.status, 201);

    const nestedViaTaskCreate = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Invalid second-level subtask',
        projectId: projectResult.body.id,
        parentTaskId: firstSubtask.body.id,
        priority: 'Low',
        status: 'To Do',
      }),
    });

    assert.equal(nestedViaTaskCreate.response.status, 400);
    assert.equal(nestedViaTaskCreate.body.error, 'Only one level of subtasks is supported');

    const nestedViaSubtaskEndpoint = await fetchJson(port, '/api/tasks/' + firstSubtask.body.id + '/subtasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Invalid nested subtask endpoint',
        priority: 'Low',
        status: 'To Do',
      }),
    });

    assert.equal(nestedViaSubtaskEndpoint.response.status, 400);
    assert.equal(nestedViaSubtaskEndpoint.body.error, 'Only one level of subtasks is supported');
  });
});


dbTest('viewer cannot update task status or reassign tasks in a shared project', async () => {
  await withServer(18203, async (_baseUrl, port) => {
    const owner = await registerAndLogin(port);
    const member = await registerAndLogin(port);
    const viewer = await registerAndLogin(port);

    const projectResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Viewer Task Restriction Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(projectResult.response.status, 201);

    await addProjectMember(projectResult.body.id, member.user.id, 'Member', owner.user.id);
    await addProjectMember(projectResult.body.id, viewer.user.id, 'Viewer', owner.user.id);

    const taskResult = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(owner.cookie, owner.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Viewer cannot patch this',
        projectId: projectResult.body.id,
        assigneeUserId: member.user.id,
        priority: 'Medium',
        status: 'To Do',
      }),
    });

    assert.equal(taskResult.response.status, 201);

    const statusPatch = await fetchJson(port, '/api/tasks/' + taskResult.body.id, {
      method: 'PATCH',
      headers: authHeaders(viewer.cookie, viewer.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ status: 'Done' }),
    });

    assert.equal(statusPatch.response.status, 403);
    assert.equal(statusPatch.body.error, 'You do not have permission to modify tasks in this project');

    const assigneePatch = await fetchJson(port, '/api/tasks/' + taskResult.body.id, {
      method: 'PATCH',
      headers: authHeaders(viewer.cookie, viewer.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({ assigneeUserId: owner.user.id }),
    });

    assert.equal(assigneePatch.response.status, 403);
    assert.equal(assigneePatch.body.error, 'You do not have permission to modify tasks in this project');
  });
});


dbTest('project creation rejects invalid status and invalid date range', async () => {
  await withServer(18204, async (_baseUrl, port) => {
    const user = await registerAndLogin(port);

    const invalidStatus = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(user.cookie, user.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Invalid Status Project',
        status: 'Unknown',
      }),
    });

    assert.equal(invalidStatus.response.status, 400);
    assert.equal(invalidStatus.body.error, 'Project status is invalid');

    const invalidDates = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(user.cookie, user.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Invalid Dates Project',
        status: 'Planning',
        startsOn: '2026-05-10',
        dueDate: '2026-05-01',
      }),
    });

    assert.equal(invalidDates.response.status, 400);
    assert.equal(invalidDates.body.error, 'Due date must be on or after start date');
  });
});

dbTest('task creation rejects missing project invalid status and invalid due date format', async () => {
  await withServer(18205, async (_baseUrl, port) => {
    const user = await registerAndLogin(port);

    const missingProject = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(user.cookie, user.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Task without project',
        priority: 'Medium',
        status: 'To Do',
      }),
    });

    assert.equal(missingProject.response.status, 400);
    assert.equal(missingProject.body.error, 'Tasks must belong to a project');

    const projectResult = await fetchJson(port, '/api/projects', {
      method: 'POST',
      headers: authHeaders(user.cookie, user.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Task Validation Project ' + Date.now(),
        status: 'Planning',
      }),
    });

    assert.equal(projectResult.response.status, 201);

    const invalidStatus = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(user.cookie, user.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Task invalid status',
        projectId: projectResult.body.id,
        priority: 'Medium',
        status: 'Unknown',
      }),
    });

    assert.equal(invalidStatus.response.status, 400);
    assert.equal(invalidStatus.body.error, 'Task status is invalid');

    const invalidDueDate = await fetchJson(port, '/api/tasks', {
      method: 'POST',
      headers: authHeaders(user.cookie, user.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        title: 'Task invalid due date',
        projectId: projectResult.body.id,
        priority: 'Medium',
        status: 'To Do',
        dueDate: '10/05/2026',
      }),
    });

    assert.equal(invalidDueDate.response.status, 400);
    assert.equal(invalidDueDate.body.error, 'Due date must be in YYYY-MM-DD format');
  });
});

dbTest('profile updates reject invalid email and short password', async () => {
  await withServer(18206, async (_baseUrl, port) => {
    const user = await registerAndLogin(port);

    const invalidEmail = await fetchJson(port, '/api/users/me', {
      method: 'PUT',
      headers: authHeaders(user.cookie, user.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Profile Invalid Email',
        email: 'not-an-email',
      }),
    });

    assert.equal(invalidEmail.response.status, 400);
    assert.equal(invalidEmail.body.error, 'Email is invalid');

    const shortPassword = await fetchJson(port, '/api/users/me', {
      method: 'PUT',
      headers: authHeaders(user.cookie, user.csrfToken, {
        'content-type': 'application/json',
      }),
      body: JSON.stringify({
        name: 'Profile Short Password',
        email: user.user.email,
        currentPassword: user.credentials.password,
        password: 'short',
      }),
    });

    assert.equal(shortPassword.response.status, 400);
    assert.equal(shortPassword.body.error, 'Password must be at least 8 characters');
  });
});


dbTest('GET /api/docs/openapi.json serves the OpenAPI document', async () => {
  await withServer(18207, async (_baseUrl, port) => {
    const { response, body } = await fetchJson(port, '/api/docs/openapi.json');

    assert.equal(response.status, 200);
    assert.equal(body.openapi, '3.0.3');
    assert.equal(body.info.title, 'TaskTracker API');
    assert.ok(body.paths['/auth/login']);
    assert.ok(body.paths['/projects']);
    assert.ok(body.paths['/tasks']);
    assert.ok(body.paths['/users/me']);
  });
});
