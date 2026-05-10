const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

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

router.get('/', requireAuth, async (req, res) => {
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
    console.error('tasks error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { title, description, projectId, priority, assigneeUserId, dueDate, status, parentTaskId, position } = req.body;
  if (!title) return res.status(400).json({ error: 'Tieu de khong duoc de trong' });

  try {
    const id = `task-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO tasks (
        id, title, description, project_id, status, priority, assignee_user_id, due_date, created_by_user_id, parent_task_id, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        id,
        title,
        description || null,
        projectId || null,
        status || 'To Do',
        priority || 'Medium',
        assigneeUserId || null,
        dueDate || null,
        req.user.id,
        parentTaskId || null,
        position || 0,
      ]
    );
    const row = await getTaskById(result.rows[0].id, req.user.id);
    res.status(201).json(mapTask(row));
  } catch (err) {
    console.error('create task error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const detail = await getTaskDetail(req.params.id, req.user.id);
    if (!detail) return res.status(404).json({ error: 'Khong tim thay task' });

    res.json(detail);
  } catch (err) {
    console.error('task detail error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  const { title, description, projectId, status, priority, assigneeUserId, dueDate, parentTaskId, position } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tasks t
       SET title = COALESCE($3, t.title),
           description = COALESCE($4, t.description),
           project_id = COALESCE($5, t.project_id),
           status = COALESCE($6, t.status),
           priority = COALESCE($7, t.priority),
           assignee_user_id = COALESCE($8, t.assignee_user_id),
           due_date = COALESCE($9, t.due_date),
           parent_task_id = COALESCE($10, t.parent_task_id),
           sort_order = COALESCE($11, t.sort_order),
           completed_at = CASE WHEN COALESCE($6, t.status) = 'Done' THEN COALESCE(t.completed_at, NOW()) ELSE NULL END
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.left_at IS NULL
       WHERE t.id = $1
         AND p.id IS NOT DISTINCT FROM t.project_id
         AND (t.created_by_user_id = $2 OR t.assignee_user_id = $2 OR p.owner_user_id = $2 OR pm.user_id = $2)
       RETURNING t.*`,
      [req.params.id, req.user.id, title, description, projectId, status, priority, assigneeUserId, dueDate, parentTaskId, position]
    );
    if (!result.rows[0]) {
      const fallback = await pool.query(
        `UPDATE tasks t
         SET title = COALESCE($3, t.title),
             description = COALESCE($4, t.description),
             project_id = COALESCE($5, t.project_id),
             status = COALESCE($6, t.status),
             priority = COALESCE($7, t.priority),
             assignee_user_id = COALESCE($8, t.assignee_user_id),
             due_date = COALESCE($9, t.due_date),
             parent_task_id = COALESCE($10, t.parent_task_id),
             sort_order = COALESCE($11, t.sort_order),
             completed_at = CASE WHEN COALESCE($6, t.status) = 'Done' THEN COALESCE(t.completed_at, NOW()) ELSE NULL END
         WHERE t.id = $1 AND (t.created_by_user_id = $2 OR t.assignee_user_id = $2)
         RETURNING t.*`,
        [req.params.id, req.user.id, title, description, projectId, status, priority, assigneeUserId, dueDate, parentTaskId, position]
      );
      if (!fallback.rows[0]) return res.status(404).json({ error: 'Khong tim thay task' });
    }
    const row = await getTaskById(req.params.id, req.user.id);
    res.json(mapTask(row));
  } catch (err) {
    console.error('update task error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM tasks t
       WHERE t.id = $1 AND (t.created_by_user_id = $2 OR t.assignee_user_id = $2 OR EXISTS (
         SELECT 1 FROM projects p
         LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.left_at IS NULL
         WHERE p.id = t.project_id AND (p.owner_user_id = $2 OR pm.user_id = $2)
       ))
       RETURNING t.id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Khong tim thay task' });
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error('delete task error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.get('/:id/comments', requireAuth, async (req, res) => {
  try {
    const task = await getTaskById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Khong tim thay task' });

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
    console.error('task comments error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.post('/:id/comments', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Noi dung comment khong duoc de trong' });

  try {
    const task = await getTaskById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Khong tim thay task' });

    const result = await pool.query(
      `INSERT INTO task_comments (task_id, author_user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body AS content, task_id, author_user_id AS user_id, created_at`,
      [req.params.id, req.user.id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('create comment error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.post('/:id/subtasks', requireAuth, async (req, res) => {
  const { title, description, priority, assigneeUserId, dueDate, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Tieu de subtask khong duoc de trong' });

  try {
    const parentTask = await getTaskById(req.params.id, req.user.id);
    if (!parentTask) return res.status(404).json({ error: 'Khong tim thay task' });

    const id = `task-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO tasks (
        id, title, description, project_id, status, priority, assignee_user_id, due_date, created_by_user_id, parent_task_id, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        COALESCE((SELECT MAX(sort_order) + 1 FROM tasks WHERE parent_task_id = $10), 0)
      ) RETURNING *`,
      [
        id,
        title,
        description || null,
        parentTask.project_id || null,
        status || 'To Do',
        priority || 'Medium',
        assigneeUserId || null,
        dueDate || null,
        req.user.id,
        req.params.id,
      ]
    );
    res.status(201).json(mapSubtask({ ...result.rows[0], assignee_name: null }));
  } catch (err) {
    console.error('create subtask error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.post('/:id/labels', requireAuth, async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Ten label khong duoc de trong' });

  try {
    const task = await getTaskById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Khong tim thay task' });

    const normalizedName = String(name).trim();
    const normalizedColor = color || '#6B7280';

    const labelResult = await pool.query(
      `INSERT INTO labels (name, color_hex, project_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (name, project_id)
       DO UPDATE SET color_hex = EXCLUDED.color_hex
       RETURNING id, name, color_hex`,
      [normalizedName, normalizedColor, task.project_id || null]
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
    console.error('attach label error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

module.exports = router;
