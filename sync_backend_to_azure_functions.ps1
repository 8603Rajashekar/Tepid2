param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $projectRoot "backend"
$destination = Join-Path $projectRoot "azure-functions\backend"

if (-not (Test-Path -LiteralPath $source)) {
    throw "Source folder not found: $source"
}

if (-not (Test-Path -LiteralPath (Split-Path -Parent $destination))) {
    throw "azure-functions folder not found: $(Split-Path -Parent $destination)"
}

if (-not (Test-Path -LiteralPath $destination)) {
    New-Item -ItemType Directory -Path $destination | Out-Null
}

$excludedDirs = @(
    ".venv",
    ".python_packages",
    ".vscode",
    "__pycache__",
    ".pytest_cache",
    "uploads"
)

$excludedFiles = @(
    "*.log",
    "*.db",
    "*.pyc",
    ".env"
)

$args = @(
    $source,
    $destination,
    "/MIR",
    "/R:1",
    "/W:1",
    "/XD"
) + $excludedDirs + @(
    "/XF"
) + $excludedFiles

if ($DryRun) {
    $args += "/L"
}

Write-Host "Syncing backend -> azure-functions/backend"
Write-Host "Source      : $source"
Write-Host "Destination : $destination"
if ($DryRun) {
    Write-Host "Mode        : Dry run (no files changed)"
}

& robocopy @args
$code = $LASTEXITCODE

# Robocopy codes 0-7 are considered success states.
if ($code -gt 7) {
    throw "robocopy failed with exit code $code"
}

Write-Host "Sync completed (robocopy exit code: $code)."
