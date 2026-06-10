@echo off
:: Set code page to UTF-8
chcp 65001 > nul
title B2B-LAW Web App Builder - Preview

:: Check for Administrator privileges
net session >nul 2>&1
if errorlevel 1 goto elevate

:: Change directory to the folder where this batch file is located
cd /d "%~dp0"

echo ===================================================
echo   Building and Running B2B-LAW Web App (Admin Mode)
echo ===================================================
echo.

echo [1/4] Cleaning dist folder...
if exist dist rd /s /q dist
echo Done.
echo.

:: Check if node_modules exists, if not install them
if exist node_modules goto node_modules_exists
echo [2/4] node_modules not found. Installing dependencies (npm install)...
echo Please wait, this may take a minute...
echo.
call npm install
if errorlevel 1 goto install_failed
echo Done installing dependencies.
echo.
:node_modules_exists

echo [3/4] Building web app (npm run build)...
call npm run build
if errorlevel 1 goto build_failed
echo Done.
echo.

echo [4/4] Running preview server in console mode...
echo.
call npm run preview
goto end

:elevate
echo.
echo ===================================================
echo   Requesting Administrator Privileges...
echo ===================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b 0

:install_failed
echo.
echo [ERROR] npm install failed! Please check your internet connection and try again.
pause
exit /b 1

:build_failed
echo.
echo [ERROR] Build failed! Please check the errors above.
pause
exit /b 1

:end
pause
