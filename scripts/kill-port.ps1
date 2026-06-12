param(
  [int] $Port = 5000
)

$ErrorActionPreference = "Stop"

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if (-not $connections) {
  Write-Host "No process is listening on port $Port." -ForegroundColor Green
  exit 0
}

$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $processIds) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if (-not $process) {
    continue
  }

  Write-Host "Killing process $($process.ProcessName) (PID $processId) on port $Port..." -ForegroundColor Yellow
  Stop-Process -Id $processId -Force
}

Start-Sleep -Milliseconds 500

if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
  Write-Error "Port $Port is still in use."
  exit 1
}

Write-Host "Port $Port is free." -ForegroundColor Green
