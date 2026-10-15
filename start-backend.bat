@echo off
title Failure Replay Lab - Backend (Port 5000)
cd /d "%~dp0\backend"
echo ============================================================
echo Starting Failure Replay Lab - Flask REST API Backend
echo URL: http://127.0.0.1:5000
echo ============================================================
python app.py
pause
