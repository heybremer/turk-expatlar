# Türk Expatlar Mobile — Expo başlat (Node 20 + QR kod)
$nodeDir = "$env:LOCALAPPDATA\node20"
if (-not (Test-Path "$nodeDir\node.exe")) {
  Write-Host "Node 20 kuruluyor..."
  $zip = "$env:TEMP\node-v20.19.0-win-x64.zip"
  Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.19.0/node-v20.19.0-win-x64.zip" -OutFile $zip -UseBasicParsing
  New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
  Expand-Archive -Path $zip -DestinationPath "$env:TEMP\node20extract" -Force
  Copy-Item -Path "$env:TEMP\node20extract\node-v20.19.0-win-x64\*" -Destination $nodeDir -Recurse -Force
}

$mobileDir = $PSScriptRoot
$env:PATH = "$nodeDir;$env:PATH"
$env:CI = "0"

# Yerel IP (Expo Go manuel bağlantı için)
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169\.' } | Select-Object -First 1).IPAddress
if ($ip) {
  Write-Host ""
  Write-Host "=== Expo Go ile baglan ===" -ForegroundColor Cyan
  Write-Host "exp://$ip`:8081" -ForegroundColor Green
  Write-Host "Expo Go > Enter URL manually > yukaridaki adresi yapistirin" -ForegroundColor Yellow
  Write-Host ""
}

Write-Host "QR kod icin yeni terminal aciliyor..." -ForegroundColor Cyan
Write-Host "Yeni pencerede QR kod gorunecek. Gorunmezse tarayicida http://localhost:8081 acin." -ForegroundColor Gray
Write-Host ""
Write-Host "Baglanti hatasi alirsaniz:" -ForegroundColor Yellow
Write-Host "  1. Ayni WiFi:  .\open-firewall.ps1  (Yonetici PowerShell)" -ForegroundColor Gray
Write-Host "  2. Farkli ag:  .\start-remote.ps1" -ForegroundColor Gray
Write-Host ""

# Etkilesimli terminalde baslat (QR kod burada gorunur)
$cmd = @"
`$env:PATH = '$nodeDir;' + `$env:PATH
`$env:CI = '0'
Set-Location '$mobileDir'
Write-Host 'Node:' (node --version)
Write-Host ''
npx expo start --lan
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd
