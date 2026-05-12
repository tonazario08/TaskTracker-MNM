const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/requireAuth');
const { slugify } = require('../lib/slugify');
const { validateProjectCreatePayload, validateProjectUpdatePayload, badRequest } = require('../lib/validation');

const router = express.Router();
const editableProjectRoles = new Set(['Owner', 'Admin', 'Manager']);
const destructiveProjectRoles = new Set(['Owner', 'Admin']);

function mapProject(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    progress: row.progress,
    color: row.color_hex,
    startsOn: row.starts_on,
    dueDate: row.due_on,
    ownerUserId: row.owner_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getProjectAccess(projectId, userId) {
  const result = await pool.query(
    `SELECT p.*,
            CASE
              WHEN p.owner_user_id = $2 THEN 'Owner'
              ELSE pm.role::text
            END AS access_role
     FROM projects p
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2 AND pm.left_at IS NULL
     WHERE p.id = $1
       AND (p.owner_user_id = $2 OR p.created_by_user_id = $2 OR pm.user_id = $2)
     LIMIT 1`,
    [projectId, userId]
  );

  return result.rows[0] || null;
}

function assertDateRange(startsOn, dueDate) {
  if (startsOn && dueDate && dueDate < startsOn) {
    throw badRequest('Due date must be on or after start date');
  }
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT p.*
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.left_at IS NULL
       WHERE p.owner_user_id = $1 OR p.created_by_user_id = $1 OR pm.user_id = $1
       ORDER BY p.created_at`,
      [req.user.id]
    );
    res.json(result.rows.map(mapProject));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  let payload;
  try {
    payload = validateProjectCreatePayload(req.body || {});
    assertDateRange(payload.startsOn, payload.dueDate);
  } catch (err) {
    return next(err);
  }

  const baseId = slugify(payload.name);
  const projectId = `${baseId}-${Date.now()}`.slice(0, 100);

  try {
    const result = await pool.query(
      `INSERT INTO projects (id, name, description, color_hex, starts_on, due_on, status, owner_user_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING *`,
      [projectId, payload.name, payload.description, payload.color || null, payload.startsOn || null, payload.dueDate || null, payload.status, req.user.id]
    );

    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role, allocation_pct)
       VALUES ($1, $2, 'Owner', 100)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [projectId, req.user.id]
    );

    res.status(201).json(mapProject(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const project = await getProjectAccess(req.params.id, req.user.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(mapProject(project));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  let payload;
  try {
    payload = validateProjectUpdatePayload(req.body || {});
    assertDateRange(payload.startsOn, payload.dueDate);
  } catch (err) {
    return next(err);
  }

  try {
    const project = await getProjectAccess(req.params.id, req.user.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!editableProjectRoles.has(project.access_role)) {
      return res.status(403).json({ error: 'You do not have permission to update this project' });
    }

    const result = await pool.query(
      `UPDATE projects
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           color_hex = COALESCE($4, color_hex),
           starts_on = COALESCE($5, starts_on),
           due_on = COALESCE($6, due_on),
           status = COALESCE($7, status),
           progress = COALESCE($8, progress)
       WHERE id = $1
       RETURNING *`,
      [req.params.id, payload.name, payload.description, payload.color, payload.startsOn, payload.dueDate, payload.status, payload.progress]
    );

    res.json(mapProject(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const project = await getProjectAccess(req.params.id, req.user.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!destructiveProjectRoles.has(project.access_role)) {
      return res.status(403).json({ error: 'You do not have permission to delete this project' });
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ ok: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
