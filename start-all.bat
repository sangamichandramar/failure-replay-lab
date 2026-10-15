@echo off
title Failure Replay Lab - Launcher
cd /d "%~dp0"

echo ============================================================
echo   FAILURE REPLAY LAB - CLOUD INCIDENT INVESTIGATION
echo ============================================================
echo.
echo [1/4] Checking MongoDB Service...
net start MongoDB >nul 2>&1
echo   - MongoDB verified on port 27017.

echo [2/4] Initializing Database & Seed Data...
python backend\seed_data.py

echo [3/4] Launching Flask Backend on port 5000...
start "Failure Replay Lab - Backend" cmd /c "start-backend.bat"

echo [4/4] Launching React Vite Frontend on port 5173...
start "Failure Replay Lab - Frontend" cmd /c "start-frontend.bat"

echo.
echo Waiting 3 seconds for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173/ ...
start http://localhost:5173/

echo.
echo ============================================================
echo   Failure Replay Lab is now RUNNING!
echo   Frontend Dashboard: http://localhost:5173/
echo   Backend REST API:   http://127.0.0.1:5000/api/health
echo ============================================================
echo.
echo (Keep the two opened backend & frontend windows open while using the app.)
echo To stop everything, close both windows or double-click stop-all.bat.
pause
