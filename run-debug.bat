@echo off
echo ========================================
echo IR CRM Debug Mode
echo ========================================

echo.
echo Starting IR CRM in debug mode with developer tools...
echo This will show detailed error information.
echo.

npx electron electron/main-debug.js

echo.
echo Debug session ended.
pause