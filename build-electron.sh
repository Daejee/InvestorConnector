#!/bin/bash

echo "Building IR CRM for Windows..."

# Step 1: Build the web application
echo "1. Building React frontend and Node.js backend..."
npm run build

# Step 2: Create a simplified main.js for production
echo "2. Creating production Electron main process..."
cat > electron/main-prod.js << 'EOF'
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const express = require('express');

let mainWindow;
let server;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'IR CRM - Investor Relations Management',
    show: false
  });

  // Start Express server
  startServer();

  // Wait for server to start then load the app
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.show();
  }, 2000);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (server) {
      server.close();
    }
  });

  Menu.setApplicationMenu(null);
}

function startServer() {
  // Import the built server
  const serverApp = require(path.join(__dirname, '..', 'dist', 'index.js'));
  
  server = serverApp.listen(5000, () => {
    console.log('IR CRM Server running on port 5000');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (server) {
      server.close();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
EOF

# Step 3: Build the Electron app
echo "3. Building Electron application..."
npx electron-builder --config electron-builder.config.js --win

echo "Build complete! Check the electron-dist folder for your .exe file."