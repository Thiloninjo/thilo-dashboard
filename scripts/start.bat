@echo off
title Thilo Dashboard

:: Start backend (hidden window)
start /min cmd /c "cd /d "%~dp0..\backend" && npm run dev"

:: Wait for backend to start
timeout /t 4 /nobreak > nul

:: Start frontend (hidden window)
start /min cmd /c "cd /d "%~dp0..\frontend" && npm run dev"

:: Start Cloudflare Tunnel (hidden window)
start /min cmd /c "cloudflared tunnel --url http://localhost:3001 2>&1 | findstr trycloudflare > "%~dp0..\tunnel-url.txt""

:: Wait for frontend + tunnel to start
timeout /t 8 /nobreak > nul

:: Open Chrome in kiosk mode on primary monitor
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --window-position=0,0 --disable-session-crashed-bubble --noerrdialogs --disable-infobars --user-data-dir="%LOCALAPPDATA%\ThiloDashboard\chrome-profile" http://localhost:5173
