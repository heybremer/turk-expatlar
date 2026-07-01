# Windows Firewall — Metro bundler (8081) icin gelen baglantiya izin ver
$ruleName = "Expo Metro Bundler 8081"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existing) {
  Write-Host "Firewall kurali zaten mevcut: $ruleName" -ForegroundColor Green
} else {
  Write-Host "Firewall kurali ekleniyor (8081/TCP)..." -ForegroundColor Yellow
  New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 8081 `
    -Action Allow `
    -Profile Private, Domain | Out-Null
  Write-Host "Tamam — yerel agdan 8081 portu acildi." -ForegroundColor Green
}

Write-Host ""
Write-Host "Not: Telefon ve PC ayni WiFi'de olmali." -ForegroundColor Cyan
Write-Host "Farkli agdaysaniz: .\start-remote.ps1 kullanin." -ForegroundColor Cyan
