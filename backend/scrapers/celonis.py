from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from filter_engine import normalize_candidate

from .base_scraper import BaseScraper


class CelonisScraper(BaseScraper):
    company = "Celonis"
    source_name = "celonis"
    base_url = "https://boards-api.greenhouse.io"
    search_endpoint = "https://boards-api.greenhouse.io/v1/boards/celonis/jobs"

    def fetch_raw_jobs(self) -> Sequence[Mapping[str, Any]]:
        payload = self.request_json(self.search_endpoint, params={"content": "true", "location": "Munich"})
        jobs = payload.get("jobs", [])
        if not isinstance(jobs, list):
            return []
        return [job for job in jobs if isinstance(job, Mapping)]

    def normalize_raw_job(self, raw_job: Mapping[str, Any]):
        location = ""
        raw_location = raw_job.get("location")
        if isinstance(raw_location, Mapping):
            location = str(raw_location.get("name") or "")
        elif isinstance(raw_location, str):
            location = raw_location

        description = self._extract_text(raw_job, ("content", "description", "teaser"))
        url = self._extract_text(raw_job, ("absolute_url", "url"))

        normalized_job = normalize_candidate(
            {
                **dict(raw_job),
                "location": location,
                "description": description,
                "url": url,
            },
            company=self.company,
        )
        return normalized_job

    @staticmethod
    def _extract_text(raw_job: Mapping[str, Any], keys: Sequence[str]) -> str:
        for key in keys:
            value = raw_job.get(key)
            if isinstance(value, str) and value.strip():
                return value
            if isinstance(value, Mapping):
                nested = value.get("name") or value.get("title")
                if isinstance(nested, str) and nested.strip():
                    return nested
        return ""
