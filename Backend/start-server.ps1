# PowerShell script to start the backend server
Set-Location "D:\b2b Main web\b2bbillings\Backend"
Write-Host "Starting B2B Billings Backend Server..." -ForegroundColor Green
Write-Host "Current Directory: $(Get-Location)" -ForegroundColor Cyan

# Check if server.js exists
if (Test-Path "server.js") {
    Write-Host "Found server.js, starting server..." -ForegroundColor Green
    node server.js
} else {
    Write-Host "Error: server.js not found in current directory" -ForegroundColor Red
    Write-Host "Current files:" -ForegroundColor Yellow
    Get-ChildItem
}

# Keep window open if running from double-click
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")