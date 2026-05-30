# Backend

FastAPI backend for the Enterprise Field Operations Platform.

## Run locally

From the project root:

```powershell
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH="backend"
uvicorn app.main:app --reload --app-dir backend
```

API docs:

```text
http://127.0.0.1:8001/api/v1/docs
```

## Test

```powershell
$env:PYTHONPATH="backend"
pytest backend/tests
```
