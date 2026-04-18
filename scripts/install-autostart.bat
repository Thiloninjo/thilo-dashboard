@echo off
:: Creates a shortcut to start-silent.vbs in the Windows Startup folder
:: Run this ONCE to enable autostart

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS=%~dp0start-silent.vbs"
set "SHORTCUT=%STARTUP%\Thilo Dashboard.lnk"

:: Create shortcut via PowerShell
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%VBS%\"'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'Thilo Dashboard Autostart'; $s.Save()"

if exist "%SHORTCUT%" (
    echo.
    echo [OK] Autostart installiert!
    echo     Shortcut: %SHORTCUT%
    echo     Dashboard startet jetzt automatisch beim naechsten PC-Start.
    echo.
) else (
    echo.
    echo [FEHLER] Shortcut konnte nicht erstellt werden.
    echo.
)

pause
