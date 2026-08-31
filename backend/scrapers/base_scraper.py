from __future__ import annotations

from abc import ABC, abstractmethod
import logging
from typing import Any, Mapping, Sequence

import httpx
from rich.console import Console
from rich.logging import RichHandler

from filter_engine import normalize_candidate
from models import JobRecord


console = Console()


def _build_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = RichHandler(console=console, rich_tracebacks=True, show_path=False)
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger


class BaseScraper(ABC):
    company: str = ""
    source_name: str = ""
    base_url: str = ""
    timeout_seconds: float = 30.0

    def __init__(self, client: httpx.Client | None = None) -> None:
        self.logger = _build_logger(f"munich_tracker.scraper.{self.source_name or self.company}")
        self.client = client or httpx.Client(
            timeout=self.timeout_seconds,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
                "Accept": "application/json,text/plain,*/*",
                "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
            },
        )

    def close(self) -> None:
        self.client.close()

    def __enter__(self) -> BaseScraper:
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    def request_json(self, url: str, params: Mapping[str, Any] | None = None) -> dict[str, Any]:
        response = self.client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError(f"Expected JSON object from {url}, got {type(data).__name__}")
        return data

    def request_text(self, url: str, params: Mapping[str, Any] | None = None) -> str:
        response = self.client.get(url, params=params)
        response.raise_for_status()
        return response.text

    def scrape(self) -> list[JobRecord]:
        raw_jobs = list(self.fetch_raw_jobs())
        self.logger.info("%s: fetched %s raw jobs.", self.company, len(raw_jobs))

        jobs: list[JobRecord] = []
        skipped = 0
        for raw_job in raw_jobs:
            try:
                job = self.normalize_raw_job(raw_job)
            except Exception as exc:  # pragma: no cover - runtime integration path
                skipped += 1
                self.logger.warning("%s: failed to normalize a job payload: %s", self.company, exc)
                continue

            if job is None:
                skipped += 1
                continue

            jobs.append(job)

        self.logger.info("%s: kept %s jobs after filtering (%s skipped).", self.company, len(jobs), skipped)
        return self.deduplicate(jobs)

    @staticmethod
    def deduplicate(jobs: Sequence[JobRecord]) -> list[JobRecord]:
        deduplicated: dict[str, JobRecord] = {}
        for job in jobs:
            deduplicated[job.id] = job
        return list(deduplicated.values())

    @abstractmethod
    def fetch_raw_jobs(self) -> Sequence[Mapping[str, Any]]:
        raise NotImplementedError

    def normalize_raw_job(self, raw_job: Mapping[str, Any]) -> JobRecord | None:
        return normalize_candidate(raw_job, company=self.company)
