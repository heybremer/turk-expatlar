# Uzak baglanti (farkli WiFi / mobil veri) - Cloudflare Tunnel + EXPO_PACKAGER_PROXY_URL
$nodeDir = "$env:LOCALAPPDATA\node20"
if (-not (Test-Path "$nodeDir\node.exe")) {
  Write-Host "Node 20 bulunamadi. Once .\start.ps1 calistirin." -ForegroundColor Red
  exit 1
}

$mobileDir = $PSScriptRoot
$env:PATH = "$nodeDir;$env:PATH"
$env:CI = "0"

$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {
  $wingetPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe"
  if (Test-Path $wingetPath) { $cloudflared = $wingetPath }
}
if (-not $cloudflared) {
  Write-Host "cloudflared bulunamadi. Kurun:" -ForegroundColor Yellow
  Write-Host "  winget install Cloudflare.cloudflared" -ForegroundColor Green
  exit 1
}

Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=== UZAK BAGLANTI (Cloudflare) ===" -ForegroundColor Cyan
Write-Host ""

$cfLog = Join-Path $env:TEMP "turkexpatlar-cloudflared.log"
if (Test-Path $cfLog) { Remove-Item $cfLog -Force }

Write-Host "Cloudflare tunnel baslatiliyor..." -ForegroundColor Gray
$cfProc = Start-Process -FilePath $cloudflared `
  -ArgumentList "tunnel", "--url", "http://127.0.0.1:8081" `
  -RedirectStandardError $cfLog `
  -RedirectStandardOutput $cfLog `
  -PassThru `
  -WindowStyle Hidden

$tunnelUrl = $null
$tunnelHost = $null
for ($i = 0; $i -lt 45; $i++) {
  Start-Sleep -Seconds 1
  if (-not (Test-Path $cfLog)) { continue }
  $content = Get-Content $cfLog -Raw -ErrorAction SilentlyContinue
  if ($content -match 'https://([a-z0-9-]+\.trycloudflare\.com)') {
    $tunnelHost = $matches[1]
    $tunnelUrl = "https://$tunnelHost"
    break
  }
}

if (-not $tunnelUrl) {
  Stop-Process -Id $cfProc.Id -Force -ErrorAction SilentlyContinue
  Write-Host "Tunnel URL alinamadi. Log:" -ForegroundColor Red
  if (Test-Path $cfLog) { Get-Content $cfLog | Select-Object -Last 20 }
  exit 1
}

$env:EXPO_PACKAGER_PROXY_URL = $tunnelUrl
$expoUrl = "exp://$tunnelHost"

Write-Host ""
Write-Host "Tunnel hazir:" -ForegroundColor Green
Write-Host "  $tunnelUrl" -ForegroundColor White
Write-Host ""
Write-Host "Expo Go > Enter URL manually:" -ForegroundColor Yellow
Write-Host "  $expoUrl" -ForegroundColor Green -BackgroundColor Black
Write-Host ""
Write-Host "LAN QR kodu KULLANMAYIN - 192.168.x.x calismaz" -ForegroundColor Red
Write-Host "Expo baslatiliyor..." -ForegroundColor Cyan
Write-Host ""

Set-Location $mobileDir
try {
  npx expo start --lan
} finally {
  Stop-Process -Id $cfProc.Id -Force -ErrorAction SilentlyContinue
}
