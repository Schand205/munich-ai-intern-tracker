from __future__ import annotations

import logging
import os
from typing import Any

from dotenv import load_dotenv
from rich.console import Console
from rich.logging import RichHandler
from supabase import Client, create_client

from models import JobRecord


load_dotenv()

console = Console()


def _build_logger() -> logging.Logger:
    logger = logging.getLogger("munich_tracker.database")
    if not logger.handlers:
        handler = RichHandler(console=console, rich_tracebacks=True, show_path=False)
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger


logger = _build_logger()


class DatabaseError(RuntimeError):
    pass


class SupabaseDatabase:
    def __init__(self, client: Client | None = None) -> None:
        self.url = os.getenv("SUPABASE_URL", "").strip()
        self.service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if client is not None:
            self.client = client
        else:
            if not self.url or not self.service_role_key:
                raise DatabaseError(
                    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set before running the scraper."
                )
            self.client = create_client(self.url, self.service_role_key)

    def fetch_existing_jobs(self, job_ids: list[str]) -> dict[str, dict[str, Any]]:
        if not job_ids:
            return {}
        response = self.client.table("jobs").select("id,status,first_seen").in_("id", job_ids).execute()
        existing_rows = response.data or []
        return {row["id"]: row for row in existing_rows if row.get("id")}

    @staticmethod
    def _merge_with_existing(job: JobRecord, existing: dict[str, Any] | None) -> dict[str, Any]:
        payload = job.to_db_payload()
        if not existing:
            return payload

        existing_status = str(existing.get("status") or "").strip()
        if existing_status and existing_status != "NEW":
            payload["status"] = existing_status

        if existing.get("first_seen"):
            payload["first_seen"] = existing["first_seen"]

        return payload

    def upsert_jobs(self, jobs: list[JobRecord], batch_size: int = 50) -> int:
        if not jobs:
            logger.info("No jobs to upsert.")
            return 0

        total_upserted = 0
        for start in range(0, len(jobs), batch_size):
            batch = list(jobs[start : start + batch_size])
            try:
                existing_by_id = self.fetch_existing_jobs([job.id for job in batch])
            except Exception as exc:  # pragma: no cover - runtime integration path
                message = str(exc).lower()
                if "permission denied" in message or "42501" in message:
                    logger.warning(
                        "Supabase denied SELECT on public.jobs. Continuing without status preservation. "
                        "Run GRANT SELECT ON public.jobs TO service_role; to preserve existing job status values."
                    )
                    existing_by_id = {}
                else:
                    raise
            payloads = [self._merge_with_existing(job, existing_by_id.get(job.id)) for job in batch]

            try:
                result = self.client.table("jobs").upsert(payloads, on_conflict="id").execute()
            except Exception as exc:  # pragma: no cover - runtime integration path
                message = str(exc).lower()
                if "permission denied" in message or "42501" in message:
                    raise DatabaseError(
                        "Supabase denied INSERT/UPDATE on public.jobs. "
                        "Run `grant select, insert, update on public.jobs to service_role;` in the Supabase SQL editor."
                    ) from exc
                raise DatabaseError(f"Failed to upsert batch starting at index {start}: {exc}") from exc

            affected = len(result.data or payloads)
            total_upserted += affected
            logger.info("Upserted %s jobs into Supabase.", affected)

        return total_upserted


def get_database() -> SupabaseDatabase:
    return SupabaseDatabase()
