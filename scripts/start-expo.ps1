# Always start Expo with tunnel (works when LAN QR fails on phone).
# Usage: .\scripts\start-expo.ps1           — normal start
#        .\scripts\start-expo.ps1 -Clear     — clear Metro cache
param([switch]$Clear)

Set-Location $PSScriptRoot\..

$args = @("start", "--tunnel")
if ($Clear) { $args += "-c" }

Write-Host ""
Write-Host "Starting Expo with TUNNEL (not LAN). Wait for 'Tunnel ready', then scan QR in Expo Go." -ForegroundColor Green
Write-Host "Do NOT use: npx expo start -c  (that uses 192.168.x.x and often fails on phone)" -ForegroundColor Yellow
Write-Host ""

npx expo @args
