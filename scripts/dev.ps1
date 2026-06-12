$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

function Test-PortListen {
  param([int] $Port)
  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  return $null -ne $connection
}

function Start-DevProcess {
  param(
    [string] $Name,
    [string] $WorkingDirectory,
    [string[]] $Arguments
  )

  Write-Host "Starting $Name..." -ForegroundColor Cyan
  return Start-Process -FilePath "npm.cmd" `
    -ArgumentList $Arguments `
    -WorkingDirectory $WorkingDirectory `
    -PassThru
}

if (-not (Test-Path (Join-Path $backend "node_modules"))) {
  Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
  npm --prefix $backend install
}

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
  Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
  npm --prefix $frontend install
}

if (Test-PortListen 5000) {
  Write-Host "Backend already appears to be listening on http://localhost:5000" -ForegroundColor Green
} else {
  Start-DevProcess -Name "backend" -WorkingDirectory $backend -Arguments @("run", "dev") | Out-Null
}

if (Test-PortListen 3000) {
  Write-Host "Frontend already appears to be listening on http://localhost:3000" -ForegroundColor Green
} else {
  Start-DevProcess -Name "frontend" -WorkingDirectory $frontend -Arguments @("start") | Out-Null
}

Write-Host ""
Write-Host "MotoCore dev servers:" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000"
Write-Host "  Backend : http://localhost:5000"
Write-Host ""
Write-Host "Health check: npm run health"
