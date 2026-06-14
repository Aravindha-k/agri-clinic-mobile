# Run on your PC while Django should be running.
$urls = @(
  "http://127.0.0.1:8000/api/v1/",
  "http://192.168.29.18:8000/api/v1/"
)

$ip = (
  Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -First 1 -ExpandProperty IPAddress
)
if ($ip -and $ip -ne "192.168.29.18") {
  $urls += "http://${ip}:8000/api/v1/"
}

Write-Host "Checking Django API from this PC..." -ForegroundColor Cyan
$anyOk = $false
foreach ($u in $urls) {
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 5
    Write-Host "OK  $u  (HTTP $($r.StatusCode))" -ForegroundColor Green
    $anyOk = $true
  } catch {
    Write-Host "FAIL $u" -ForegroundColor Red
    Write-Host "     $($_.Exception.Message)" -ForegroundColor DarkGray
  }
}

$listen = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $listen) {
  Write-Host ""
  Write-Host "Nothing is listening on port 8000 on this PC." -ForegroundColor Yellow
  Write-Host "Start Django from agri_clinic folder:" -ForegroundColor Yellow
  Write-Host "  cd D:\agri_clinic"
  Write-Host "  python manage.py runserver 0.0.0.0:8000"
} elseif (-not $anyOk) {
  Write-Host ""
  Write-Host "Port 8000 is open but HTTP failed - check Django errors in that terminal."
}

if ($anyOk) {
  Write-Host ""
  Write-Host "PC can reach API. Phone must use same Wi-Fi + firewall:" -ForegroundColor Green
  Write-Host "  .\scripts\allow-django-firewall.ps1   (Admin PowerShell)"
  Write-Host "  EXPO_PUBLIC_DEV_API_URL=http://${ip}:8000/api/v1/  in .env.local"
  Write-Host ""
  Write-Host "USB: npm run start:usb and use EXPO_PUBLIC_DEV_API_URL=http://127.0.0.1:8000/api/v1/"
}
