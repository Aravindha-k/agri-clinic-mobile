# Configure ANDROID_HOME and PATH for Expo / Gradle after Android Studio is installed.
# Run in PowerShell (as your user):  .\scripts\setup-android-sdk.ps1

$ErrorActionPreference = 'Stop'

$candidates = @(
  "$env:LOCALAPPDATA\Android\Sdk",
  "$env:USERPROFILE\AppData\Local\Android\Sdk"
)

$sdk = $null
foreach ($c in $candidates) {
  if (Test-Path (Join-Path $c 'platform-tools\adb.exe')) {
    $sdk = $c
    break
  }
}

if (-not $sdk) {
  Write-Host 'Android SDK not found.'
  Write-Host ''
  Write-Host '1. Install Android Studio: https://developer.android.com/studio'
  Write-Host '2. Open Android Studio -> More Actions -> SDK Manager'
  Write-Host '3. Install: Android SDK Platform, SDK Build-Tools, Android SDK Platform-Tools'
  Write-Host '4. Default SDK path: %LOCALAPPDATA%\Android\Sdk'
  Write-Host '5. Run this script again.'
  exit 1
}

$platformTools = Join-Path $sdk 'platform-tools'
$buildTools = Get-ChildItem (Join-Path $sdk 'build-tools') -Directory -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending |
  Select-Object -First 1
$jbrCandidates = @(
  "${env:ProgramFiles}\Android\Android Studio\jbr",
  "${env:ProgramFiles}\Android\Android Studio\jre"
)
$javaHome = $jbrCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

Write-Host "Found SDK: $sdk"

# Current session only
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
if ($javaHome) {
  $env:JAVA_HOME = $javaHome
}

$pathAdd = @($platformTools)
if ($buildTools) {
  $pathAdd += $buildTools.FullName
}
if ($javaHome) {
  $pathAdd += Join-Path $javaHome 'bin'
}
foreach ($p in $pathAdd) {
  if ($env:Path -notlike "*$p*") {
    $env:Path = "$p;$env:Path"
  }
}

# Persist for user (Windows)
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $sdk, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $sdk, 'User')
if ($javaHome) {
  [Environment]::SetEnvironmentVariable('JAVA_HOME', $javaHome, 'User')
}

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
foreach ($p in $pathAdd) {
  if ($userPath -notlike "*$p*") {
    $userPath = if ($userPath) { "$p;$userPath" } else { $p }
  }
}
[Environment]::SetEnvironmentVariable('Path', $userPath, 'User')

# Gradle local.properties
$localProps = Join-Path $PSScriptRoot '..\android\local.properties'
$sdkEscaped = $sdk -replace '\\', '/'
Set-Content -Path $localProps -Value "sdk.dir=$sdkEscaped" -Encoding ASCII

Write-Host ''
Write-Host 'Configured for this session and saved user environment variables.'
Write-Host "Wrote $localProps"
Write-Host ''
Write-Host 'Close and reopen PowerShell, then run:'
Write-Host '  adb devices'
Write-Host '  npx expo run:android'
Write-Host ''
& (Join-Path $platformTools 'adb.exe') version
