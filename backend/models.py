from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class JobRecord:
    id: str
    company: str
    title: str
    location: str = "Munich"
    job_type: str = ""
    category: str = "ML/AI"
    url: str = ""
    description_summary: str = ""
    tags: list[str] = field(default_factory=list)
    first_seen: datetime = field(default_factory=_utc_now)
    status: str = "NEW"
    is_active: bool = True

    def to_db_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "id": self.id,
            "company": self.company,
            "title": self.title,
            "location": self.location,
            "job_type": self.job_type,
            "category": self.category,
            "url": self.url,
            "description_summary": self.description_summary or None,
            "tags": self.tags,
            "first_seen": self.first_seen.astimezone(timezone.utc).isoformat(),
            "status": self.status,
            "is_active": self.is_active,
        }
        return payload


@dataclass(slots=True)
class ScrapeResult:
    source: str
    jobs: list[JobRecord] = field(default_factory=list)
    skipped: int = 0
    errors: list[str] = field(default_factory=list)
