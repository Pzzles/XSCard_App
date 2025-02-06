const { exec, spawn } = require("child_process");

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

// Start the server
console.log('Starting server...');
serverProcess = exec("cd backend && node server.js");

serverProcess.stdout.on("data", (data) => console.log(`[SERVER]: ${data.trim()}`));
serverProcess.stderr.on("data", (data) => console.error(`[SERVER ERROR]: ${data.trim()}`));
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
