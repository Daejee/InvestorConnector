const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    title: 'IR CRM - Investor Relations Management',
    show: false,
    autoHideMenuBar: true
  });

  // Start the Express server
  startServer();

  // Wait for server to start, then load the URL
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.show();
  }, 3000);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  // Remove menu bar for cleaner look
  Menu.setApplicationMenu(null);
}

function startServer() {
  // Start the bundled Node.js server
  const serverPath = path.join(__dirname, '..', 'dist', 'index.js');
  
  serverProcess = spawn('node', [serverPath], {
    cwd: path.join(__dirname, '..'),
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      PORT: '5000'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`IR CRM Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`IR CRM Server Error: ${data}`);
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

// Handle app termination
process.on('SIGTERM', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  app.quit();
});

process.on('SIGINT', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  app.quit();
});