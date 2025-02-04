
const express = require('express');
const app = express();
const path = require('path');

// ...existing code...

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// ...existing code...

module.exports = app;