@echo off
title Failure Replay Lab - Frontend (Port 5173)
cd /d "%~dp0\frontend"
echo ============================================================
echo Starting Failure Replay Lab - React Vite Dashboard
echo URL: http://localhost:5173
echo ============================================================
call npm.cmd run dev
pause
