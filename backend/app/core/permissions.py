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
        "admin":               "full",
        "supervisor":          "team",
        "coordinator":         "team",
        "finance":             "own",
        "employee":            "own",
        "crm":                 "own",
        # legacy
        "super_admin":         "full",
        "service_coordinator": "team",
        "finance_officer":     "own",
    },
    "expenses": {
        "admin":               "full",
        "supervisor":          "own",
        "finance":             "full",
        "coordinator":         "own",
        "employee":            "own",
        "crm":                 "own",
        # legacy
        "super_admin":         "full",
        "finance_officer":     "full",
    },
    "service_calls": {
        "admin":               "full",
        "coordinator":         "full",
        "supervisor":          "own",
        "finance":             "read",
        "employee":            "own",
        "crm":                 "full",
        # legacy
        "super_admin":         "full",
        "service_coordinator": "full",
        "finance_officer":     "read",
    },
    "documents": {
        "admin":               "full",
        "supervisor":          "team",
        "coordinator":         "read",
        "finance":             "read",
        "employee":            "own",
        "crm":                 "read",
        # legacy
        "super_admin":         "full",
        "service_coordinator": "read",
        "finance_officer":     "read",
    },
    "work_reports": {
        "admin":               "full",
        "supervisor":          "team",
        "coordinator":         "read",
        "finance":             "own",
        "employee":            "own",
        "crm":                 "own",
        # legacy
        "super_admin":         "full",
        "service_coordinator": "read",
        "finance_officer":     "own",
    },
    "crm": {
        "admin":               "full",
        "supervisor":          "full",
        "coordinator":         "full",
        "finance":             "read",
        "employee":            "read",
        "crm":                 "full",
        # legacy
        "super_admin":         "full",
        "service_coordinator": "full",
        "finance_officer":     "read",
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


def require_role(user: TokenUser, *allowed_roles: str) -> None:
    """Raise HTTP 403 if the user's role is not in the allowed set.

    Always implicitly allows super_admin and admin so callers only need to list
    the role-specific allowlist (e.g. 'supervisor', 'finance_officer').
    """
    full_set = {"super_admin", "admin", *allowed_roles}  # admin always has access
    if user.role not in full_set:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{user.role}' is not permitted for this action",
        )
