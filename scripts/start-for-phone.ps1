# LAN Expo start when tunnel/ngrok fails. Same Wi-Fi required (or use USB script).
param([switch]$Clear)

Set-Location $PSScriptRoot\..

$ip = (
  Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.PrefixOrigin -ne "WellKnown" -and
      $_.InterfaceAlias -notlike "*Loopback*"
    } |
    Select-Object -First 1 -ExpandProperty IPAddress
)

Write-Host ""
Write-Host "=== Expo LAN (no ngrok) ===" -ForegroundColor Cyan
Write-Host "Your PC IP: $ip"
Write-Host "Metro URL:  exp://${ip}:8081"
Write-Host ""
Write-Host "1. Phone on SAME Wi-Fi as this PC (turn off mobile data to test)" -ForegroundColor Yellow
Write-Host "2. If scan fails, run as Admin: .\scripts\allow-metro-firewall.ps1" -ForegroundColor Yellow
Write-Host "3. USB option: npm run start:usb  then open exp://127.0.0.1:8081 in Expo Go" -ForegroundColor Yellow
Write-Host ""

$args = @("start", "--lan")
if ($Clear) { $args += "-c" }
npx expo @args
