# Local Expo against Django on this PC (LAN).
# Usage: npm run start:local
param(
  [switch]$Clear = $true
)

Set-Location $PSScriptRoot\..

$ApiUrl = "http://192.168.29.18:8000/api/v1/"
$env:EXPO_PUBLIC_ENV = "development"
$env:EXPO_PUBLIC_API_URL = $ApiUrl
$env:EXPO_PUBLIC_API_BASE_URL = $ApiUrl
Remove-Item Env:EXPO_PUBLIC_USE_PRODUCTION_API -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_PUBLIC_DEV_API_URL -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Expo LOCAL API ===" -ForegroundColor Cyan
Write-Host "[API Config] environment=development"
Write-Host "[API Config] base=$ApiUrl"
Write-Host "Django must listen on 0.0.0.0:8000 (same Wi-Fi as the phone)." -ForegroundColor Yellow
Write-Host ""

$expoArgs = @("start", "--lan")
if ($Clear) { $expoArgs += "-c" }
npx expo @expoArgs
