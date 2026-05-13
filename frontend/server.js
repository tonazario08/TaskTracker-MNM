const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3000;
const BACKEND_URL = 'http://localhost:8080';

// Parse JSON bodies
app.use(express.json());

// Manual proxy for /api routes - Express 5 compatible
app.use('/api', async (req, res, next) => {
    const apiPath = req.originalUrl; // This includes /api/...
    const targetUrl = `${BACKEND_URL}${apiPath}`;

    console.log(`[PROXY] ${req.method} ${apiPath} → ${targetUrl}`);

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
                'Cookie': req.headers.cookie || ''
            },
            validateStatus: () => true // Accept any status code
        });

        // Forward cookies from backend
        if (response.headers['set-cookie']) {
            res.setHeader('set-cookie', response.headers['set-cookie']);
        }

        console.log(`[PROXY] Response: ${response.status}`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`[PROXY] Error:`, error.message);
        res.status(500).json({ error: 'Proxy error: ' + error.message });
    }
});

// Serve static files from the root of the frontend folder
app.use(express.static(__dirname, { extensions: ['html'] }));

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
    console.log(`✓ Frontend server running on http://localhost:${PORT}`);
    console.log(`✓ API proxy: /api/* → ${BACKEND_URL}/api/*`);
    console.log(`✓ Ready to accept requests`);
});
