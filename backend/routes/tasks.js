const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/requireAuth');
const {
  validateTaskPayload,
  validateCommentPayload,
  validateLabelPayload,
  badRequest,
} = require('../lib/validation');

const router = express.Router();
const projectWriteRoles = new Set(['Owner', 'Admin', 'Manager', 'Member']);
const projectDeleteRoles = new Set(['Owner', 'Admin', 'Manager']);

function mapTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    projectId: row.project_id,
    projectName: row.project_name,
    parentTaskId: row.parent_task_id,
    status: row.status,
    priority: row.priority,
    assigneeUserId: row.assignee_user_id,
    assigneeName: row.assignee_name,
    dueDate: row.due_date ? row.due_date.toISOString().slice(0, 10) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubtask(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    assigneeUserId: row.assignee_user_id,
    assigneeName: row.assignee_name,
    dueDate: row.due_date ? row.due_date.toISOString().slice(0, 10) : null,
  };
}

function mapLabel(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color_hex,
  };
}

async function getProjectRole(projectId, userId) {
  if (!projectId) return null;
  const result = await pool.query(
    `SELECT CASE WHEN p.owner_user_id = $2 THEN 'Owner' ELSE pm.role::text END AS access_role
     FROM projects p
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2 AND pm.left_at IS NULL
     WHERE p.id = $1
       AND (p.owner_user_id = $2 OR p.created_by_user_id = $2 OR pm.user_id = $2)
     LIMIT 1`,
    [projectId, userId]
  );
  return result.rows[0]?.access_role || null;
}

async function getTaskById(taskId, userId) {
  const result = await pool.query(
    `SELECT t.*, p.name AS project_name, u.name AS assignee_name
     FROM tasks t
     LEFT JOIN projects p ON p.id = t.project_id
     LEFT JOIN users u ON u.id = t.assignee_user_id
     LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.left_at IS NULL
     WHERE t.id = $1 AND (
       t.created_by_user_id = $2 OR t.assignee_user_id = $2 OR p.owner_user_id = $2 OR pm.user_id = $2
     )
     LIMIT 1`,
    [taskId, userId]
  );
  return result.rows[0] || null;
}

async function getTaskByIdUnchecked(taskId) {
  const result = await pool.query('SELECT * FROM tasks WHERE id = $1 LIMIT 1', [taskId]);
  return result.rows[0] || null;
}

async function ensureProjectWriteAccess(projectId, userId) {
  if (!projectId) throw badRequest('Tasks must belong to a project');
  const role = await getProjectRole(projectId, userId);
  if (!role || !projectWriteRoles.has(role)) {
    const error = new Error('You do not have permission to modify tasks in this project');
    error.status = 403;
    throw error;
  }
  return role;
}

async function ensureProjectDeleteAccess(projectId, userId) {
  const role = await getProjectRole(projectId, userId);
  if (!role || !projectDeleteRoles.has(role)) {
    const error = new Error('You do not have permission to delete tasks in this project');
    error.status = 403;
    throw error;
  }
}

async function ensureAssigneeInProject(projectId, assigneeUserId) {
  if (!assigneeUserId) return;
  const result = await pool.query(
    `SELECT 1
     FROM project_members
     WHERE project_id = $1 AND user_id = $2 AND left_at IS NULL
     UNION
     SELECT 1
     FROM projects
     WHERE id = $1 AND owner_user_id = $2
     LIMIT 1`,
    [projectId, assigneeUserId]
  );
  if (!result.rows[0]) {
    throw badRequest('Assignee must belong to the selected project');
  }
}

async function ensureParentTask(parentTaskId, projectId) {
  if (!parentTaskId) return null;
  const parentTask = await getTaskByIdUnchecked(parentTaskId);
  if (!parentTask) throw badRequest('Parent task not found');
  if (parentTask.project_id !== projectId) throw badRequest('Parent task must belong to the same project');
  if (parentTask.parent_task_id) throw badRequest('Only one level of subtasks is supported');
  return parentTask;
}

async function getTaskDetail(taskId, userId) {
  const row = await getTaskById(taskId, userId);
  if (!row) return null;

  const [commentsResult, labelsResult, subtasksResult] = await Promise.all([
    pool.query(
      `SELECT tc.id, tc.body AS content, tc.task_id, tc.author_user_id AS user_id, tc.created_at, u.name AS user_name
       FROM task_comments tc
       LEFT JOIN users u ON u.id = tc.author_user_id
       WHERE tc.task_id = $1
       ORDER BY tc.created_at`,
      [taskId]
    ),
    pool.query(
      `SELECT l.id, l.name, l.color_hex
       FROM task_labels tl
       INNER JOIN labels l ON l.id = tl.label_id
       WHERE tl.task_id = $1
       ORDER BY l.name`,
      [taskId]
    ),
    pool.query(
      `SELECT st.*, u.name AS assignee_name
       FROM tasks st
       LEFT JOIN users u ON u.id = st.assignee_user_id
       WHERE st.parent_task_id = $1
       ORDER BY st.sort_order, st.created_at`,
      [taskId]
    ),
  ]);

  return {
    ...mapTask(row),
    comments: commentsResult.rows,
    labels: labelsResult.rows.map(mapLabel),
    subtasks: subtasksResult.rows.map(mapSubtask),
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT t.*, p.name AS project_name, u.name AS assignee_name
       FROM tasks t
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assignee_user_id
       LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.left_at IS NULL
       WHERE t.created_by_user_id = $1 OR t.assignee_user_id = $1 OR p.owner_user_id = $1 OR pm.user_id = $1
       ORDER BY t.created_at`,
      [req.user.id]
    );

    res.json(result.rows.map(mapTask));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  let payload;
  try {
    payload = validateTaskPayload(req.body || {});
    await ensureProjectWriteAccess(payload.projectId, req.user.id);
    await ensureAssigneeInProject(payload.projectId, payload.assigneeUserId);
    await ensureParentTask(payload.parentTaskId, payload.projectId);
  } catch (err) {
    return next(err);
  }

  try {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await pool.query(
      `INSERT INTO tasks (
        id, title, description, project_id, status, priority, assignee_user_id, due_date, created_by_user_id, parent_task_id, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        id,
        payload.title,
        payload.description || null,
        payload.projectId,
        payload.status || 'To Do',
        payload.priority || 'Medium',
        payload.assigneeUserId || null,
        payload.dueDate || null,
        req.user.id,
        payload.parentTaskId || null,
        payload.position ?? 0,
      ]
    );
    const row = await getTaskById(result.rows[0].id, req.user.id);
    res.status(201).json(mapTask(row));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const detail = await getTaskDetail(req.params.id, req.user.id);
    if (!detail) return res.status(404).json({ error: 'Task not found' });

    res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  let payload;
  try {
    payload = validateTaskPayload(req.body || {}, { partial: true });
  } catch (err) {
    return next(err);
  }

  try {
    const existingTask = await getTaskById(req.params.id, req.user.id);
    if (!existingTask) return res.status(404).json({ error: 'Task not found' });

    const targetProjectId = payload.projectId === undefined ? existingTask.project_id : payload.projectId;
    await ensureProjectWriteAccess(targetProjectId, req.user.id);
    await ensureAssigneeInProject(targetProjectId, payload.assigneeUserId === undefined ? existingTask.assignee_user_id : payload.assigneeUserId);
    await ensureParentTask(payload.parentTaskId === undefined ? existingTask.parent_task_id : payload.parentTaskId, targetProjectId);

    await pool.query(
      `UPDATE tasks
       SET title = COALESCE($2, title),
           description = COALESCE($3, description),
           project_id = COALESCE($4, project_id),
           status = COALESCE($5, status),
           priority = COALESCE($6, priority),
           assignee_user_id = COALESCE($7, assignee_user_id),
           due_date = COALESCE($8, due_date),
           parent_task_id = COALESCE($9, parent_task_id),
           sort_order = COALESCE($10, sort_order),
           completed_at = CASE WHEN COALESCE($5, status) = 'Done' THEN COALESCE(completed_at, NOW()) ELSE NULL END
       WHERE id = $1`,
      [req.params.id, payload.title, payload.description, payload.projectId, payload.status, payload.priority, payload.assigneeUserId, payload.dueDate, payload.parentTaskId, payload.position]
    );

    const row = await getTaskById(req.params.id, req.user.id);
    res.json(mapTask(row));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const task = await getTaskById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await ensureProjectDeleteAccess(task.project_id, req.user.id);

    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ ok: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const task = await getTaskById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const result = await pool.query(
      `SELECT tc.id, tc.body AS content, tc.task_id, tc.author_user_id AS user_id, tc.created_at, u.name AS user_name
       FROM task_comments tc
       LEFT JOIN users u ON u.id = tc.author_user_id
       WHERE tc.task_id = $1
       ORDER BY tc.created_at`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/comments', requireAuth, async (req, res, next) => {
  let payload;
  try {
    payload = validateCommentPayload(req.body || {});
  } catch (err) {
    return next(err);
  }

  try {
    const task = await getTaskById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await ensureProjectWriteAccess(task.project_id, req.user.id);

    const result = await pool.query(
      `INSERT INTO task_comments (task_id, author_user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body AS content, task_id, author_user_id AS user_id, created_at`,
      [req.params.id, req.user.id, payload.content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/subtasks', requireAuth, async (req, res, next) => {
  let payload;
  try {
    payload = validateTaskPayload(req.body || {});
  } catch (err) {
    return next(err);
  }

  try {
    const parentTask = await getTaskById(req.params.id, req.user.id);
    if (!parentTask) return res.status(404).json({ error: 'Task not found' });
    await ensureProjectWriteAccess(parentTask.project_id, req.user.id);
    await ensureAssigneeInProject(parentTask.project_id, payload.assigneeUserId);
    if (parentTask.parent_task_id) throw badRequest('Only one level of subtasks is supported');

    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextSortOrderResult = await pool.query(
      'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_sort_order FROM tasks WHERE parent_task_id = $1',
      [req.params.id]
    );
    const nextSortOrder = nextSortOrderResult.rows[0]?.next_sort_order ?? 0;

    const result = await pool.query(
      `INSERT INTO tasks (
        id, title, description, project_id, status, priority, assignee_user_id, due_date, created_by_user_id, parent_task_id, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        id,
        payload.title,
        payload.description || null,
        parentTask.project_id,
        payload.status || 'To Do',
        payload.priority || 'Medium',
        payload.assigneeUserId || null,
        payload.dueDate || null,
        req.user.id,
        req.params.id,
        nextSortOrder,
      ]
    );
    const fullSubtask = await getTaskById(result.rows[0].id, req.user.id);
    res.status(201).json(mapSubtask(fullSubtask));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/labels', requireAuth, async (req, res, next) => {
  let payload;
  try {
    payload = validateLabelPayload(req.body || {});
  } catch (err) {
    return next(err);
  }

  try {
    const task = await getTaskById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await ensureProjectWriteAccess(task.project_id, req.user.id);

    const labelResult = await pool.query(
      `INSERT INTO labels (name, color_hex, project_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (name, project_id)
       DO UPDATE SET color_hex = EXCLUDED.color_hex
       RETURNING id, name, color_hex`,
      [payload.name, payload.color, task.project_id]
    );

    const label = labelResult.rows[0];

    await pool.query(
      `INSERT INTO task_labels (task_id, label_id)
       VALUES ($1, $2)
       ON CONFLICT (task_id, label_id) DO NOTHING`,
      [req.params.id, label.id]
    );

    res.status(201).json(mapLabel(label));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
