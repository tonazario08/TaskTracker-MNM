const express = require('express');
const path = require('node:path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');

const app = express();
const frontendRoot = path.join(__dirname, '..', 'frontend');
const frontendPublicDir = path.join(frontendRoot, 'public');
const frontendSrcDir = path.join(frontendRoot, 'src');

app.use(express.json());
app.use('/app', express.static(frontendPublicDir));
app.use('/public', express.static(frontendPublicDir));
app.use('/src', express.static(frontendSrcDir));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/', (_req, res) => res.redirect('/app/'));

module.exports = app;
