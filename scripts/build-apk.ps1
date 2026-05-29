# Build client-test APK via EAS (preview profile, production API).
# Prerequisites: npx eas-cli login
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Verifying production API..."
npm run verify:api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Starting EAS Android APK build (preview profile)..."
npx eas-cli build -p android --profile preview

Write-Host ""
Write-Host "When complete, download the APK from https://expo.dev"
Write-Host "Install: copy APK to phone -> open file -> Allow unknown sources if prompted."
