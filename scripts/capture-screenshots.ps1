# Capture Android screenshots into docs/screenshots/
# Usage: Open each screen on device/emulator, press Enter when prompted.

$outDir = Join-Path $PSScriptRoot '..\docs\screenshots'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  Write-Host 'adb not found. Install Android platform-tools (Android SDK).'
  Write-Host "Save screenshots manually to: $outDir"
  Write-Host ''
  Write-Host 'Manual capture per screen:'
  Write-Host '  adb exec-out screencap -p > docs\screenshots\home.png'
  exit 1
}

$devices = & adb devices 2>$null | Select-String 'device$'
if (-not $devices) {
  Write-Host 'No Android device or emulator connected.'
  exit 1
}

function Capture-Screen {
  param(
    [string]$Name,
    [string]$Hint
  )
  $path = Join-Path $outDir "$Name.png"
  Write-Host ''
  Write-Host ">>> $Hint"
  Write-Host 'Press Enter when that screen is visible...'
  [void](Read-Host)
  $bytes = & adb exec-out screencap -p
  if ($LASTEXITCODE -ne 0 -or -not $bytes) {
    Write-Host "Failed to capture $Name (adb screencap)."
    return
  }
  [System.IO.File]::WriteAllBytes($path, $bytes)
  Write-Host "Saved $path"
}

Write-Host 'Kavya Agri Clinic - screenshot capture'
Write-Host "Output: $outDir"

Capture-Screen -Name 'home' -Hint 'Home dashboard'
Capture-Screen -Name 'profile' -Hint 'Profile'
Capture-Screen -Name 'farmer-detail' -Hint 'Farmer detail'
Capture-Screen -Name 'visit-detail' -Hint 'Visit detail timeline'

Write-Host ''
Write-Host 'Done. Review images in docs\screenshots before APK build.'
