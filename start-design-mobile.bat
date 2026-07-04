@echo off
setlocal

cd /d "%~dp0"

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8088"

echo.
echo Moronarchy Design Mobile Preview
echo ---------------------------------
echo Serving folder: %CD%\design
echo Port: %PORT%
echo.
echo Open on this computer:
echo   http://localhost:%PORT%/
echo.
echo Open on a phone connected to the same Wi-Fi:
powershell -NoProfile -ExecutionPolicy Bypass -Command "$port='%PORT%'; $ips = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } | ForEach-Object { $_.IPv4Address.IPAddress } | Where-Object { $_ -notlike '169.254.*' }; if (-not $ips) { $ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress }; foreach ($ip in $ips) { Write-Host ('  http://' + $ip + ':' + $port + '/'); Write-Host ('  http://' + $ip + ':' + $port + '/02-room-lobby.html') }"
echo.
echo Keep this window open while testing on mobile.
echo Press Ctrl+C to stop the design server.
echo.

cmd /c pnpm exec vite design --host 0.0.0.0 --port %PORT%

endlocal
