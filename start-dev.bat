@echo off
setlocal

cd /d "%~dp0"

echo Starting Moronarchy frontend and backend...
echo.

where pnpm >nul 2>nul
if errorlevel 1 (
  echo pnpm was not found. Install pnpm or run this from a shell where pnpm is available.
  pause
  exit /b 1
)

cmd /c pnpm dev

echo.
echo Moronarchy dev server stopped.
pause
