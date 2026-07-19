@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Oommoney - Push to GitHub

echo ===============================================
echo    Oommoney : Push code to GitHub
echo    (Render will auto-deploy the new version)
echo ===============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [X] Git is not installed.
  echo     Install from https://git-scm.com/download/win then run again.
  echo.
  pause
  exit /b
)

REM ----- set git name/email if missing -----
set "GITEMAIL="
for /f "delims=" %%i in ('git config user.email 2^>nul') do set "GITEMAIL=%%i"
if "!GITEMAIL!"=="" (
  echo First time: set your Git name and email
  set /p "GN=  - Your name: "
  set /p "GE=  - Your GitHub email: "
  git config --global user.name "!GN!"
  git config --global user.email "!GE!"
  echo.
)

REM ----- init repo if needed -----
if not exist ".git" (
  echo [*] Initializing repository...
  git init >nul
  git branch -M main
)

REM ----- remote URL -----
set "REMOTEURL="
for /f "delims=" %%i in ('git remote get-url origin 2^>nul') do set "REMOTEURL=%%i"
if "!REMOTEURL!"=="" (
  echo.
  echo Paste your GitHub repo URL
  echo   example: https://github.com/USERNAME/oommoney.git
  set /p "REPOURL=  URL: "
  git remote add origin "!REPOURL!"
) else (
  echo.
  echo Current GitHub URL:
  echo    !REMOTEURL!
  set /p "FIX=  Press Enter if correct, or paste a new URL: "
  if not "!FIX!"=="" git remote set-url origin "!FIX!"
)

REM ----- commit message -----
echo.
set /p "MSG=Commit message (press Enter to skip): "
if "!MSG!"=="" set "MSG=update"

REM ----- push -----
echo.
echo [*] Uploading to GitHub...
git add .
git commit -m "!MSG!"
git push -u origin main

if errorlevel 1 (
  echo.
  echo ===============================================
  echo    [X] PUSH FAILED - code did NOT reach GitHub
  echo ===============================================
  echo.
  echo   If it says "Permission denied" you are logged in
  echo   with the WRONG GitHub account.
  echo.
  echo   How to fix:
  echo     1. Windows Search -^> "Credential Manager"
  echo     2. Windows Credentials
  echo     3. Find  git:https://github.com  -^> Remove
  echo     4. Run this file again and log in as the
  echo        account that owns the repo.
  echo.
) else (
  echo.
  echo ===============================================
  echo    [OK] Pushed. Render will pick up the change.
  echo    Check status at dashboard.render.com
  echo ===============================================
  echo.
)
pause
