const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

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
    icon: path.join(__dirname, 'assets', 'icon.png'), // Add your app icon
    title: 'IR CRM - Investor Relations Management',
    show: false
  });

  // Start the Express server
  startServer();

  // Load the app - for now, just connect to the running development server
  const startUrl = 'http://localhost:5000';
  
  // Load the URL directly since server is already running
  mainWindow.loadURL(startUrl);
  mainWindow.show();

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  // Remove menu bar for a cleaner look
  Menu.setApplicationMenu(null);
}

function startServer() {
  // For now, we assume the server is already running at localhost:5000
  // In a full production build, we would start the bundled server here
  console.log('Connecting to IR CRM server at localhost:5000...');
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
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