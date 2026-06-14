# USB fallback: phone loads Metro via localhost when cable-connected (Android + adb).
# Run AFTER: npx expo start  (LAN mode on PC is OK with reverse)
$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  Write-Host "adb not found. Install Android platform-tools or Android Studio." -ForegroundColor Red
  exit 1
}
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000
adb reverse tcp:19000 tcp:19000
adb reverse tcp:19001 tcp:19001
Write-Host ""
Write-Host "USB port reverse OK (Metro + Django 8000)." -ForegroundColor Green
Write-Host "1. Django:  python manage.py runserver 127.0.0.1:8000"
Write-Host "2. .env.local:  EXPO_PUBLIC_DEV_API_URL=http://127.0.0.1:8000/api/v1/"
Write-Host "3. Metro:  npx expo start --localhost"
Write-Host "4. Expo Go URL:  exp://127.0.0.1:8081"
Write-Host "5. Restart Metro after changing .env.local (press r in Expo)"
Write-Host ""
