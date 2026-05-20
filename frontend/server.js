const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = Number(process.env.FRONTEND_PORT || 3000);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');
const pagesDir = path.join(rootDir, 'src', 'pages');
const appShell = path.join(pagesDir, 'app.html');
const managerPage = path.join(pagesDir, 'manager.html');

const documentRoutes = new Map([
  ['/', 'landing.html'],
  ['/landing', 'landing.html'],
  ['/landing.html', 'landing.html'],
  ['/login', 'login.html'],
  ['/login.html', 'login.html'],
  ['/register', 'register.html'],
  ['/register.html', 'register.html'],
  ['/manager', 'manager.html'],
  ['/manager.html', 'manager.html']
]);

const appRoutes = [
  'dashboard', 'projects', 'tasks', 'kanban', 'notifications', 'settings',
  'profile', 'search', 'calendar', 'workspace', 'team', 'reports', 'analytics',
  'inbox', 'goals', 'portfolio', 'help', 'support', 'archive', 'integrations',
  'billing', 'admin'
];

const legacyAliases = new Map([
  ['/TaskListPage.html', '/tasks'],
  ['/TaskDetailPage.html', '/tasks'],
  ['/DashboardPage.html', '/dashboard'],
  ['/ProjectPage.html', '/projects'],
  ['/SettingsPage.html', '/settings'],
  ['/LoginPage.html', '/login'],
  ['/RegisterPage.html', '/register']
]);

app.use(express.json());
app.use('/public', express.static(publicDir));
app.use('/assets', express.static(path.join(publicDir, 'assets')));
app.use('/src', express.static(path.join(rootDir, 'src')));

app.get(['/manager', '/manager.html'], (_req, res) => res.sendFile(managerPage));


app.get('/auth/google', (_req, res) => {
  res.redirect(`${BACKEND_URL}/api/auth/google`);
});

app.get('/auth/google/callback', async (req, res) => {
  const query = new URLSearchParams(req.query).toString();
  const targetUrl = `${BACKEND_URL}/api/auth/google/callback${query ? `?${query}` : ''}`;

  try {
    const response = await axios({
      method: 'GET',
      url: targetUrl,
      headers: {
        Cookie: req.headers.cookie || ''
      },
      maxRedirects: 0,
      validateStatus: () => true
    });

    if (response.headers['set-cookie']) {
      res.setHeader('set-cookie', response.headers['set-cookie']);
    }

    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      res.redirect(response.headers.location);
      return;
    }

    res.status(response.status).send(response.data);
  } catch (_error) {
    res.redirect('/login?error=oauth_failed');
  }
});

app.use('/api', async (req, res) => {
  const targetUrl = `${BACKEND_URL}${req.originalUrl}`;
  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        Cookie: req.headers.cookie || ''
      },
      validateStatus: () => true
    });

    if (response.headers['set-cookie']) {
      res.setHeader('set-cookie', response.headers['set-cookie']);
    }
    res.status(response.status).send(response.data);
  } catch (error) {
    res.status(502).json({ error: `API proxy error: ${error.message}` });
  }
});

for (const [from, to] of legacyAliases) {
  app.get(from, (req, res) => res.redirect(301, `${to}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`));
}

for (const [route, file] of documentRoutes) {
  app.get(route, (_req, res) => res.sendFile(path.join(pagesDir, file)));
}

for (const route of appRoutes) {
  app.get(`/${route}`, (_req, res) => res.sendFile(appShell));
  app.get(`/${route}.html`, (_req, res) => res.redirect(301, `/${route}`));
}

app.get('/health', (_req, res) => res.json({ ok: true, frontend: true }));

app.use((req, res) => {
  if (req.method !== 'GET') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(404).sendFile(appShell);
});

app.listen(PORT, () => {
  console.log(`Frontend server running on http://localhost:${PORT}`);
  console.log(`API proxy: /api/* -> ${BACKEND_URL}/api/*`);
});






