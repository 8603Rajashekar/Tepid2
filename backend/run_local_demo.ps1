$ErrorActionPreference = "Stop"

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DbPath = Join-Path $BackendDir "fieldops_local.db"
$DbUrlPath = $DbPath -replace "\\", "/"

$env:DATABASE_URL = "sqlite+aiosqlite:///$DbUrlPath"
$env:SYNC_DATABASE_URL = "sqlite:///$DbUrlPath"

Set-Location $BackendDir
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --app-dir .
