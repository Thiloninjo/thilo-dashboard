@echo off
title Thilo Dashboard - Stop

:: Kill the kiosk Chrome (only the dashboard profile, not your normal Chrome)
taskkill /F /FI "WINDOWTITLE eq localhost:5173*" >nul 2>&1
wmic process where "commandline like '%%ThiloDashboard%%chrome-profile%%'" call terminate >nul 2>&1

:: Kill backend and frontend
taskkill /F /FI "WINDOWTITLE eq Thilo Dashboard*" >nul 2>&1
wmic process where "commandline like '%%Dashboard%%backend%%tsx%%'" call terminate >nul 2>&1
wmic process where "commandline like '%%Dashboard%%frontend%%vite%%'" call terminate >nul 2>&1

echo Dashboard gestoppt.
timeout /t 2 /nobreak > nul
