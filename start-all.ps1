# Start all services for Inventory Management System
# This script uses the .env file for configuration

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Starting Inventory Management System (StockIQ)           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path ".\.env")) {
    Write-Host "❌ .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".\.env.example") {
        Copy-Item ".\.env.example" ".\.env"
        Write-Host "✅ .env created. Update it with your configuration if needed." -ForegroundColor Green
    } else {
        Write-Host "❌ .env.example not found. Please create .env file manually." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 1: Starting Docker services..." -ForegroundColor Yellow

Push-Location ".\docker"
docker compose up -d
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker services started" -ForegroundColor Green
} else {
    Write-Host "❌ Docker startup failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⏳ Waiting 5 seconds for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Step 2: Starting Spring Boot backend (port 8080)..." -ForegroundColor Yellow

# Load .env variables for backend
$env_content = Get-Content ".\.env"
foreach ($line in $env_content) {
    if ($line -and -not $line.StartsWith("#")) {
        $key, $value = $line.Split("=", 2)
        [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim())
    }
}

Start-Process -FilePath "pwsh" -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$((Join-Path (Get-Location) 'backend'))'; mvn spring-boot:run"
) -PassThru | Out-Null

Write-Host "✅ Backend starting in background. Check logs in Spring Boot terminal." -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Starting React frontend (port 3001)..." -ForegroundColor Yellow

Start-Process -FilePath "pwsh" -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$((Join-Path (Get-Location) 'frontend'))'; npm run dev -- --port 3001"
) -PassThru | Out-Null

Write-Host "✅ Frontend starting in background." -ForegroundColor Green

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  🎉 All services are starting!                            ║" -ForegroundColor Green
Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Backend:      http://localhost:8080                      ║" -ForegroundColor Cyan
Write-Host "║  Frontend:     http://localhost:3001                      ║" -ForegroundColor Cyan
Write-Host "║  pgAdmin:      http://localhost:5050                      ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║  Demo Login:   admin / Admin@123                          ║" -ForegroundColor Cyan
Write-Host "║                manager1 / Admin@123                       ║" -ForegroundColor Cyan
Write-Host "║                employee1 / Admin@123                      ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║  To stop services, run: .\\stop-all.ps1                    ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
