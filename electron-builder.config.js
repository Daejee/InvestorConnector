module.exports = {
  appId: 'com.ircrm.app',
  productName: 'IR CRM',
  directories: {
    output: 'electron-dist'
  },
  files: [
    'dist/**/*',
    'electron/main.js',
    'node_modules/**/*',
    'package.json'
  ],
  extraResources: [
    {
      from: 'dist',
      to: 'app/dist'
    }
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'electron/assets/icon.ico'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'IR CRM'
  },
  mac: {
    target: 'dmg',
    icon: 'electron/assets/icon.icns'
  },
  linux: {
    target: 'AppImage',
    icon: 'electron/assets/icon.png'
  }
};