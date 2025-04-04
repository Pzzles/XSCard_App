const { exec, spawn } = require("child_process");
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

let serverProcess = null;
let expoProcess = null;

function cleanup() {
    if (serverProcess) {
        serverProcess.kill();
        console.log('Server process terminated');
    }
    if (expoProcess) {
        expoProcess.kill();
        console.log('Expo process terminated');
    }
    process.exit(0);
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Security headers middleware
app.use((req, res, next) => {
    // Add Referrer-Policy header
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add other important security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    
    next();
});

// Static file serving if you have a build folder
app.use(express.static(path.join(__dirname, 'build')));

// Catch-all handler for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
console.log('Starting server...');
serverProcess = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

serverProcess.on("error", (error) => {
    console.error(`Failed to start server: ${error}`);
    cleanup();
});

// Start Expo after a short delay
setTimeout(() => {
    console.log('Starting Expo...');
    expoProcess = spawn("npx", ["expo", "start", "--clear"], {
        stdio: 'inherit',
        shell: true
    });

    expoProcess.on("error", (error) => {
        console.error(`Failed to start Expo: ${error}`);
        cleanup();
    });}, 3000);
