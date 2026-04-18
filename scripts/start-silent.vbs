' Start Dashboard silently — no visible terminal windows
' Uses health-check polling instead of fixed sleep timers

Dim WshShell
Set WshShell = CreateObject("WScript.Shell")

Dim scriptDir
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Start backend (completely hidden)
WshShell.Run "cmd /c cd /d """ & scriptDir & "\..\backend"" && npm run dev", 0, False

' Wait for backend to be ACTUALLY ready (polls /api/health until 200)
Dim exitCode
exitCode = WshShell.Run("powershell -ExecutionPolicy Bypass -File """ & scriptDir & "\wait-for-backend.ps1""", 0, True)

If exitCode <> 0 Then
  ' Backend didn't start — abort
  WScript.Quit 1
End If

' Start frontend (completely hidden)
WshShell.Run "cmd /c cd /d """ & scriptDir & "\..\frontend"" && npm run dev", 0, False

' Wait for Vite dev server (3 seconds is reliable for Vite)
WScript.Sleep 3000

' Start Cloudflare Tunnel (completely hidden)
WshShell.Run "cmd /c cloudflared tunnel --url http://localhost:3001 2>&1 | findstr trycloudflare > """ & scriptDir & "\..\tunnel-url.txt""", 0, False

' Open Chrome in app mode
Dim localAppData
localAppData = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
WshShell.Run """C:\Program Files\Google\Chrome\Application\chrome.exe"" --kiosk --app=http://localhost:5173 --window-position=0,0 --disable-session-crashed-bubble --noerrdialogs --disable-infobars --user-data-dir=""" & localAppData & "\ThiloDashboard\chrome-profile""", 1, False

Set WshShell = Nothing
