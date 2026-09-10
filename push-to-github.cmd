@echo off
setlocal
cd /d "%~dp0"
if not exist "work" mkdir "work"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push-github.ps1" > "%~dp0work\github-push.log" 2>&1
set "pushResult=%errorlevel%"
if not "%pushResult%"=="0" start "" notepad.exe "%~dp0work\github-push.log"
exit /b %pushResult%
