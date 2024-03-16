// server.js
const express = require('express');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = express();

    // Define custom stateful API with Express
    server.get('/api/stateful', (req, res) => {
        // Your stateful API logic here
        res.json({ message: 'This is a stateful API response' });
    });

    // Next.js handling all other requests
    server.get('*', (req, res) => {
        console.log('server.js: server.get *', { req, res });
        return handle(req, res);
    });
    server.post('*', (req, res) => {
        console.log('server.js: server.post *', { req, res });
        return handle(req, res);
    });

    const PORT = process.env.PORT || 3000;
    const HOSTNAME = process.env.HOSTNAME || '0.0.0.0'
    server.listen(PORT, HOSTNAME, (err) => {
        if (err) throw err;
        console.log(`main.js> Ready on http://localhost:${PORT}`);
    });
});
