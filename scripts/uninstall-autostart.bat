@echo off
set "SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Thilo Dashboard.lnk"

if exist "%SHORTCUT%" (
    del "%SHORTCUT%"
    echo [OK] Autostart entfernt.
) else (
    echo Kein Autostart-Shortcut gefunden.
)

pause
