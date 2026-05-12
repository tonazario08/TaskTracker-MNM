const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from the root of the frontend folder, automatically resolving .html
app.use(express.static(__dirname, { extensions: ['html'] }));

// Proxy /api requests to the backend server running on port 8080
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:8080',
    changeOrigin: true,
}));

// Clean Routes Mapping
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'landing.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'dashboard.html'));
});

app.get('/projects', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'projects.html'));
});

app.get('/tasks', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'tasks.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'SettingsPage.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Frontend server is running on http://localhost:${PORT}`);
    console.log(`Default page served at http://localhost:${PORT}/`);
});
