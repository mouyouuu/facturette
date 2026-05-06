@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\setup-and-build.ps1"
endlocal
