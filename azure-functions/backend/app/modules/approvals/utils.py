import hashlib
from datetime import datetime
from uuid import UUID


def generate_hash(ref_id: UUID | str, actor_id: UUID | str, action: str, timestamp: datetime) -> str:
    raw = f"{ref_id}{actor_id}{action}{timestamp.isoformat()}"
    return hashlib.sha256(raw.encode()).hexdigest()
