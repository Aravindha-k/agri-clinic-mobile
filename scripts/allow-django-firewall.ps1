# Run in PowerShell as Administrator — allows phones on your Wi-Fi to reach Django on port 8000.
$ruleName = "Agri Clinic Django Dev 8000"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Firewall rule already exists: $ruleName"
  exit 0
}
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8000
Write-Host "Added inbound TCP 8000 rule. Retry the app on your phone (same Wi-Fi as this PC)."
