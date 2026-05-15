# Stop all services for Inventory Management System

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Stopping Inventory Management System                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
Write-Host "Stopping Docker services..." -ForegroundColor Yellow

Push-Location ".\docker"
docker compose down
Pop-Location

Write-Host ""
Write-Host "Stopping background Node/Maven processes..." -ForegroundColor Yellow

# Stop npm (frontend)
$npmProcess = Get-Process "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*dev*" }
if ($npmProcess) {
    Stop-Process -InputObject $npmProcess -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Frontend process stopped" -ForegroundColor Green
}

# Maven processes will stop when you close the terminal, or kill java:
$javaProcess = Get-Process "java" -ErrorAction SilentlyContinue
if ($javaProcess) {
    Write-Host "📝 Note: Spring Boot is still running. Close the terminal window or run: Stop-Process -Name 'java' -Force" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Shutdown complete" -ForegroundColor Green
