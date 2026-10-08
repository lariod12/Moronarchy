@echo off
rem Double-click: start the dev server and a Cloudflare tunnel, then open the printed https URL on your phone.
cd /d "%~dp0"
pnpm dev:tunnel
pause
