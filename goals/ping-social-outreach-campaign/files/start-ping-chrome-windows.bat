@echo off
REM PING Social dedicated Chrome starter (Windows)
REM Double-click this file, then log into Facebook and Instagram once
REM in the Chrome window it opens. Leave that Chrome window running
REM and the laptop awake and plugged in.

set PROFILE=%USERPROFILE%\PINGSocialChrome
if not exist "%PROFILE%" mkdir "%PROFILE%"

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
) else (
  set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

start "" %CHROME% --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --remote-allow-origins=* --user-data-dir="%PROFILE%"
echo.
echo Chrome is starting on the PING Social profile.
echo Log into Facebook and Instagram once in that window, then leave it open.
echo You can close this black window.
pause
