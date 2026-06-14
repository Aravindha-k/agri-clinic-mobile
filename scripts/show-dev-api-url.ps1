# Prints URLs to put in .env.local — run while Django is on: python manage.py runserver 0.0.0.0:8000
$ips = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -ExpandProperty IPAddress -Unique
Write-Host ""
Write-Host "Use ONE of these in .env.local (phone must reach that IP on port 8000):"
foreach ($ip in $ips) {
  Write-Host "  EXPO_PUBLIC_DEV_API_URL=http://${ip}:8000/api/v1/"
}
Write-Host ""
Write-Host "Wi-Fi (192.168.29.x): phone on same home Wi-Fi as this PC."
Write-Host "Hotspot (192.168.137.x): phone connected to THIS PC's mobile hotspot only."
Write-Host ""
Write-Host "If phone browser cannot open the URL, run as Admin:"
Write-Host "  .\scripts\allow-django-firewall.ps1"
Write-Host ""
Write-Host "Or use cloud API in .env.local:"
Write-Host "  EXPO_PUBLIC_USE_PRODUCTION_API=1"
