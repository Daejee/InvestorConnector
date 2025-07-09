const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true  // 개발자 도구 활성화
    },
    title: 'IR CRM - Investor Relations Management (Debug Mode)',
    show: false
  });

  // 개발자 도구 자동 열기
  mainWindow.webContents.openDevTools();

  // 로컬 서버가 실행 중이라고 가정하고 연결
  const startUrl = 'http://localhost:5000';
  
  console.log('Connecting to:', startUrl);
  
  mainWindow.loadURL(startUrl).then(() => {
    console.log('Successfully loaded URL');
    mainWindow.show();
  }).catch((error) => {
    console.error('Failed to load URL:', error);
    
    // 로컬 서버 연결 실패 시 에러 페이지 표시
    const errorHtml = `
      <html>
        <head><title>Connection Error</title></head>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h1>서버 연결 오류</h1>
          <p>로컬 서버(localhost:5000)에 연결할 수 없습니다.</p>
          <p>다음을 확인해주세요:</p>
          <ul style="text-align: left; display: inline-block;">
            <li>Replit에서 서버가 실행 중인지 확인</li>
            <li>방화벽에서 5000 포트 허용</li>
            <li>DATABASE_URL 환경변수 설정</li>
          </ul>
          <p><strong>현재 시도 URL:</strong> ${startUrl}</p>
        </body>
      </html>
    `;
    mainWindow.loadURL('data:text/html,' + encodeURIComponent(errorHtml));
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 개발용 메뉴 유지
  const template = [
    {
      label: 'Developer',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 추가 로깅
app.on('ready', () => {
  console.log('Electron app is ready');
});

// 네트워크 연결 로깅
app.on('web-contents-created', (event, contents) => {
  contents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, 'Error:', errorDescription);
  });
  
  contents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });
});