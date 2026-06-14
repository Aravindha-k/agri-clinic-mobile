# Run PowerShell as Administrator — lets your phone reach Metro on the same Wi-Fi.
$rules = @(
  @{ Name = "Agri Clinic Metro 8081"; Port = 8081 },
  @{ Name = "Agri Clinic Metro 19000"; Port = 19000 },
  @{ Name = "Agri Clinic Metro 19001"; Port = 19001 }
)

foreach ($r in $rules) {
  $existing = Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Exists: $($r.Name)"
    continue
  }
  New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $r.Port
  Write-Host "Added: $($r.Name) (TCP $($r.Port))"
}

Write-Host ""
Write-Host "Done. Start Metro with: npm run start:phone"
Write-Host "Phone must use the SAME Wi-Fi as this PC, then scan the LAN QR."
