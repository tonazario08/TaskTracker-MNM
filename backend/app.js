const express = require('express');
const path = require('node:path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const passport = require('./config/passport');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');

const app = express();
const frontendRoot = path.join(__dirname, '..', 'frontend');
const frontendPublicDir = path.join(frontendRoot, 'public');
const frontendSrcDir = path.join(frontendRoot, 'src');

// CORS configuration - allow frontend to communicate with backend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(session({ secret: process.env.JWT_SECRET || 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
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
