@echo off
title Failure Replay Lab - Shutdown
echo Stopping Failure Replay Lab servers...

:: Find and kill processes on port 5000 (Flask backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    echo Terminating backend process (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Find and kill processes on port 5173 (Vite frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo Terminating frontend process (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

echo Failure Replay Lab has been stopped safely.
pause
