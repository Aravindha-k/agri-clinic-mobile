# Expo against AWS API (HTTPS target from .env.production).
# Usage: npm run start:aws
# Optional: -HttpQa uses working HTTP :80 until TLS on :443 is ready.
param(
  [switch]$Clear = $true,
  [switch]$HttpQa
)

Set-Location $PSScriptRoot\..

$HttpsUrl = "https://13.207.17.117/api/v1/"
$HttpUrl = "http://13.207.17.117/api/v1/"

if ($HttpQa) {
  $ApiUrl = $HttpUrl
  $env:EXPO_PUBLIC_ALLOW_INSECURE_HTTP = "1"
  Write-Host "Using interim HTTP QA (port 80). Prefer HTTPS once TLS is live." -ForegroundColor Yellow
} else {
  $ApiUrl = $HttpsUrl
  Remove-Item Env:EXPO_PUBLIC_ALLOW_INSECURE_HTTP -ErrorAction SilentlyContinue
}

$env:EXPO_PUBLIC_ENV = "production"
$env:EXPO_PUBLIC_API_URL = $ApiUrl
$env:EXPO_PUBLIC_API_BASE_URL = $ApiUrl

Write-Host ""
Write-Host "=== Expo AWS API ===" -ForegroundColor Cyan
Write-Host "[API Config] environment=production"
Write-Host "[API Config] base=$ApiUrl"
Write-Host "If HTTPS fails with Network request failed, :443 may be closed — retry with:" -ForegroundColor Yellow
Write-Host "  npm run start:aws:http" -ForegroundColor Yellow
Write-Host ""

$expoArgs = @("start", "--lan")
if ($Clear) { $expoArgs += "-c" }
npx expo @expoArgs
