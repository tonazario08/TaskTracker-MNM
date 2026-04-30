const express = require('express');
const crypto  = require('node:crypto');
const pool    = require('./db');
const app     = express();
require('dotenv').config();

// ── Auth helpers (session dùng in-memory, user data lưu PostgreSQL) ─────────
const sessions = {};  // token -> userId

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw + ':tasktracker_salt').digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getSessionUser(req) {
  const raw = req.headers.cookie || '';
  const m   = raw.match(/session=([a-f0-9]+)/);
  if (!m) return null;
  return sessions[m[1]] || null;  // { id, name, email }
}

function requireAuth(req, res, next) {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  req.user = user;
  next();
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static('public'));

// ── Auth routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });

  try {
    const hash = hashPassword(password);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hash]
    );
    const user  = result.rows[0];
    const token = generateToken();
    sessions[token] = { id: user.id, name: user.name, email: user.email };
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax' });
    res.status(201).json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    if (err.code === '23505')   // unique_violation
      return res.status(409).json({ error: 'Email đã được sử dụng' });
    console.error('register error:', err.message);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user   = result.rows[0];
    if (!user || user.password_hash !== hashPassword(password))
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    const token = generateToken();
    sessions[token] = { id: user.id, name: user.name, email: user.email };
    res.cookie('session', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const raw = req.headers.cookie || '';
  const m   = raw.match(/session=([a-f0-9]+)/);
  if (m) delete sessions[m[1]];
  res.clearCookie('session');
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  res.json(user);
});

// ── Projects ──────────────────────────────────────────────────────────────────
app.get('/api/projects', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at');
    res.json(result.rows.map(r => ({
      id:       r.id,
      name:     r.name,
      status:   r.status,
      progress: r.progress,
    })));
  } catch (err) {
    console.error('projects error:', err.message);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// ── Tasks ─────────────────────────────────────────────────────────────────────
app.get('/api/tasks', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at');
    res.json(result.rows.map(r => ({
      id:        r.id,
      title:     r.title,
      projectId: r.project_id,
      status:    r.status,
      priority:  r.priority,
      assignee:  r.assignee,
      dueDate:   r.due_date ? r.due_date.toISOString().slice(0, 10) : null,
    })));
  } catch (err) {
    console.error('tasks error:', err.message);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

app.post('/api/tasks', requireAuth, async (req, res) => {
  const { title, projectId, priority, assignee, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'Tiêu đề không được để trống' });

  try {
    const id = `task-${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO tasks (id, title, project_id, status, priority, assignee, due_date)
       VALUES ($1, $2, $3, 'To Do', $4, $5, $6) RETURNING *`,
      [id, title, projectId || null, priority || 'Medium', assignee || null, dueDate || null]
    );
    const r = result.rows[0];
    res.status(201).json({
      id:        r.id,
      title:     r.title,
      projectId: r.project_id,
      status:    r.status,
      priority:  r.priority,
      assignee:  r.assignee,
      dueDate:   r.due_date ? r.due_date.toISOString().slice(0, 10) : null,
    });
  } catch (err) {
    console.error('create task error:', err.message);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// ── Redirect / -> /app/ ───────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/app/'));

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Kiểm tra kết nối DB
  try {
    await pool.query('SELECT 1');
    console.log('✓ Kết nối PostgreSQL thành công');
  } catch (err) {
    console.error('✗ Không thể kết nối PostgreSQL:', err.message);
    console.error('  → Hãy kiểm tra file .env và đảm bảo PostgreSQL đang chạy');
  }
});
