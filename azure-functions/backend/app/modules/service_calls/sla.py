from datetime import datetime, UTC

SLA_CONFIG = {
    "critical": {"response": 30,  "resolution": 240},   # 30 min / 4 h
    "high":     {"response": 120, "resolution": 480},   # 2 h  / 8 h
    "medium":   {"response": 240, "resolution": 1440},  # 4 h  / 24 h
    "low":      {"response": 480, "resolution": 4320},  # 8 h  / 72 h
}


def get_sla(priority: str) -> dict:
    """Return {'response': int, 'resolution': int} in minutes for a priority level."""
    return SLA_CONFIG.get(priority, SLA_CONFIG["medium"])


def sla_elapsed_minutes(created_at: datetime) -> float:
    """Minutes since this call was created."""
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=UTC)
    return (datetime.now(UTC) - created_at).total_seconds() / 60


def is_breached(created_at: datetime, resolution_sla_minutes: int | None) -> bool:
    if not resolution_sla_minutes:
        return False
    return sla_elapsed_minutes(created_at) > resolution_sla_minutes


def should_escalate(created_at: datetime, resolution_sla_minutes: int | None) -> bool:
    """Returns True when 80% of the resolution SLA window has elapsed."""
    if not resolution_sla_minutes:
        return False
    return sla_elapsed_minutes(created_at) >= 0.8 * resolution_sla_minutes
