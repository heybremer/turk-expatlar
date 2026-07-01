# EAS Production Build (iOS + Android)
# Once: npx eas-cli login
$nodeDir = "$env:LOCALAPPDATA\node20"
if (Test-Path "$nodeDir\node.exe") { $env:PATH = "$nodeDir;$env:PATH" }

Set-Location $PSScriptRoot

Write-Host "EAS hesap kontrolu..." -ForegroundColor Cyan
npx eas-cli whoami
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Once Expo hesabiniza girin:" -ForegroundColor Yellow
  Write-Host "  npx eas-cli login" -ForegroundColor Green
  exit 1
}

Write-Host ""
Write-Host "Production build baslatiliyor (Expo cloud)..." -ForegroundColor Cyan
npx eas-cli build --profile production --platform all
