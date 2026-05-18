from fastapi import HTTPException

from app.core.security import TokenUser

# Hierarchy: read(0) < own(1) < team(2) < full(3)
# "view" is an alias for "read" — same level, different semantic label
ACCESS_LEVEL: dict[str, int] = {
    "read": 0,
    "view": 0,
    "own":  1,
    "team": 2,
    "full": 3,
}

PERMISSIONS: dict[str, dict[str, str]] = {
    "tasks": {
        "super_admin": "full",
        "admin":       "full",
        "supervisor":  "team",
        "coordinator": "read",
        "finance":     "read",
        "employee":    "own",
        "viewer":      "read",
        # legacy role aliases — kept so existing DB accounts continue to work
        "manager":     "team",
        "agent":       "own",
    },
    "expenses": {
        "super_admin": "full",
        "admin":       "full",
        "supervisor":  "view",
        "finance":     "full",
        "employee":    "own",
        "viewer":      "read",
        "manager":     "view",
        "agent":       "own",
    },
    "service_calls": {
        "super_admin": "full",
        "admin":       "full",
        "coordinator": "full",
        "supervisor":  "view",
        "employee":    "view",
        "viewer":      "read",
        "manager":     "full",
        "agent":       "view",
    },
    "documents": {
        "super_admin": "full",
        "admin":       "full",
        "supervisor":  "team",
        "coordinator": "read",
        "finance":     "read",
        "employee":    "own",
        "viewer":      "read",
        "manager":     "team",
        "agent":       "own",
    },
    "work_reports": {
        "super_admin": "full",
        "admin":       "full",
        "supervisor":  "team",
        "coordinator": "read",
        "finance":     "read",
        "employee":    "own",
        "viewer":      "read",
        "manager":     "team",
        "agent":       "own",
    },
}


def _best_access(user: TokenUser, module: str) -> str | None:
    """Return the highest access level granted by any of the user's roles."""
    best = -1
    best_name: str | None = None
    for role in user.roles:
        level_name = PERMISSIONS.get(module, {}).get(role)
        if level_name is not None:
            lvl = ACCESS_LEVEL.get(level_name, -1)
            if lvl > best:
                best = lvl
                best_name = level_name
    return best_name


def check_permission(user: TokenUser, module: str, required: str) -> bool:
    """
    Raise HTTP 403 if none of the user's roles meets the required access level.
    Returns True on success so callers can write: check_permission(...) and proceed.
    """
    access = _best_access(user, module)
    if access is None:
        raise HTTPException(
            status_code=403,
            detail=f"Role(s) {user.roles} have no access to '{module}'",
        )
    if ACCESS_LEVEL.get(access, -1) >= ACCESS_LEVEL.get(required, 0):
        return True
    raise HTTPException(
        status_code=403,
        detail=f"Requires '{required}' access on '{module}'; your best level is '{access}'",
    )


def has_permission(user: TokenUser, module: str, required: str) -> bool:
    """Non-raising version — use for conditional branching inside service methods."""
    access = _best_access(user, module)
    if access is None:
        return False
    return ACCESS_LEVEL.get(access, -1) >= ACCESS_LEVEL.get(required, 0)
