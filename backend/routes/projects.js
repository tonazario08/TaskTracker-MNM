const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/requireAuth');
const { slugify } = require('../lib/slugify');

const router = express.Router();

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

router.get('/', requireAuth, async (req, res) => {
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
    console.error('projects error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, description, color, startsOn, dueDate, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Ten project khong duoc de trong' });

  const baseId = slugify(name);
  const projectId = `${baseId}-${Date.now()}`.slice(0, 100);

  try {
    const result = await pool.query(
      `INSERT INTO projects (id, name, description, color_hex, starts_on, due_on, status, owner_user_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING *`,
      [projectId, name, description || null, color || null, startsOn || null, dueDate || null, status || 'Planning', req.user.id]
    );

    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role, allocation_pct)
       VALUES ($1, $2, 'Owner', 100)
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [projectId, req.user.id]
    );

    res.status(201).json(mapProject(result.rows[0]));
  } catch (err) {
    console.error('create project error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT p.*
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.left_at IS NULL
       WHERE p.id = $1 AND (p.owner_user_id = $2 OR p.created_by_user_id = $2 OR pm.user_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Khong tim thay project' });
    res.json(mapProject(result.rows[0]));
  } catch (err) {
    console.error('project detail error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  const { name, description, color, startsOn, dueDate, status, progress } = req.body;
  try {
    const result = await pool.query(
      `UPDATE projects
       SET name = COALESCE($3, name),
           description = COALESCE($4, description),
           color_hex = COALESCE($5, color_hex),
           starts_on = COALESCE($6, starts_on),
           due_on = COALESCE($7, due_on),
           status = COALESCE($8, status),
           progress = COALESCE($9, progress)
       WHERE id = $1 AND (owner_user_id = $2 OR created_by_user_id = $2 OR EXISTS (
         SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = $2 AND pm.left_at IS NULL
       ))
       RETURNING *`,
      [req.params.id, req.user.id, name, description, color, startsOn, dueDate, status, progress]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Khong tim thay project' });
    res.json(mapProject(result.rows[0]));
  } catch (err) {
    console.error('update project error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND (owner_user_id = $2 OR created_by_user_id = $2) RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Khong tim thay project' });
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error('delete project error:', err.message);
    res.status(500).json({ error: 'Loi may chu' });
  }
});

module.exports = router;
