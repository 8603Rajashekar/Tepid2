# ─────────────────────────────────────────────────────────────────────────────
# deploy_backend.ps1
#
# Stages a clean Azure Functions bundle:
#   1. Copies azure-functions/ content (host.json, function_app.py, etc.)
#   2. Copies backend/ code as backend/ subfolder (excludes .venv, __pycache__)
#   3. Copies backend/requirements.txt to bundle root
#   4. Deploys with remote Oryx build (no .venv needed in the zip)
# ─────────────────────────────────────────────────────────────────────────────

$Root     = $PSScriptRoot
$AzureFn  = Join-Path $Root "azure-functions"
$Backend  = Join-Path $Root "backend"
$Stage    = Join-Path $Root "_deploy_stage"

Write-Host "`n[1/5] Cleaning staging folder..." -ForegroundColor Cyan
if (Test-Path $Stage) { Remove-Item $Stage -Recurse -Force }
New-Item -ItemType Directory -Path $Stage | Out-Null

Write-Host "[2/5] Copying azure-functions/ content to stage root..." -ForegroundColor Cyan
Copy-Item "$AzureFn\host.json"        "$Stage\host.json"
Copy-Item "$AzureFn\function_app.py"  "$Stage\function_app.py"
# Do NOT copy local.settings.json — env vars live in Azure portal

Write-Host "[3/5] Copying backend/requirements.txt to stage root..." -ForegroundColor Cyan
Copy-Item "$Backend\requirements.txt" "$Stage\requirements.txt"

Write-Host "[4/5] Copying backend/ code (excluding .venv, __pycache__)..." -ForegroundColor Cyan
$BackendDest = Join-Path $Stage "backend"
New-Item -ItemType Directory -Path $BackendDest | Out-Null

# Robocopy: copy backend/ → stage/backend/, excluding .venv, __pycache__, alembic/versions
$Excludes = @(".venv", "__pycache__", "*.pyc", "*.pyo", "tests")
robocopy $Backend $BackendDest /E /XD ".venv" "__pycache__" "tests" /XF "*.pyc" "*.pyo" /NP /NFL /NDL /NJH | Out-Null
Write-Host "   Copied $(( Get-ChildItem $BackendDest -Recurse -File ).Count) files"

Write-Host "[5/5] Deploying to Azure Function App 'FieldOps'..." -ForegroundColor Cyan
Push-Location $Stage
try {
    $env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
    func azure functionapp publish FieldOps --python
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Deployment failed (exit code $LASTEXITCODE)" -ForegroundColor Red
    }
} finally {
    Pop-Location
}

Write-Host "`nCleaning up staging folder..." -ForegroundColor Cyan
Remove-Item $Stage -Recurse -Force
Write-Host "Done.`n"
