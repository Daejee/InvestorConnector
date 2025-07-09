@echo off
echo ========================================
echo IR CRM Windows .exe Builder
echo ========================================

echo.
echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Building web application...
call npm run build

echo.
echo Step 3: Copying production Electron main file...
copy electron\main-production.js electron\main.js

echo.
echo Step 4: Copying Electron package.json...
copy electron-package.json package.json

echo.
echo Step 5: Building Windows executable...
call npx electron-builder --win

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Your .exe files are in the 'electron-dist' folder:
echo - IR CRM Setup 1.0.0.exe (installer)
echo - IR CRM-1.0.0.exe (portable)
echo.
echo To test locally: npm run electron
echo To distribute: Share the Setup.exe file
echo.
pause