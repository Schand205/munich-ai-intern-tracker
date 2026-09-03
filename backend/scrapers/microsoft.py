from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from filter_engine import normalize_candidate

from .base_scraper import BaseScraper


class MicrosoftScraper(BaseScraper):
    company = "Microsoft"
    source_name = "microsoft"
    base_url = "https://careers.microsoft.com"
    search_endpoint = "https://apply.careers.microsoft.com/api/pcsx/search"

    search_variants: tuple[dict[str, str], ...] = (
        {"query": "AI", "location": "Munich"},
        {"query": "machine learning", "location": "Munich"},
        {"query": "data scientist", "location": "Munich"},
        {"query": "research engineer", "location": "Munich"},
        {"query": "computer vision", "location": "Munich"},
        {"query": "MLOps", "location": "Munich"},
    )

    def fetch_raw_jobs(self) -> Sequence[Mapping[str, Any]]:
        jobs: list[Mapping[str, Any]] = []
        seen_ids: set[str] = set()

        for variant in self.search_variants:
            params = {
                "domain": "microsoft.com",
                "start": "0",
                "sort_by": "timestamp",
                **variant,
            }

            try:
                payload = self.request_json(self.search_endpoint, params=params)
            except Exception as exc:  # pragma: no cover - runtime integration path
                self.logger.warning("Microsoft search request failed for params %s: %s", params, exc)
                continue

            for raw_job in self._extract_jobs(payload):
                job_id = self._extract_job_id(raw_job)
                if job_id and job_id in seen_ids:
                    continue
                if job_id:
                    seen_ids.add(job_id)
                jobs.append(raw_job)

        return jobs

    def normalize_raw_job(self, raw_job: Mapping[str, Any]):
        title = self._extract_text(raw_job, ("name", "title"))
        location = self._extract_locations(raw_job.get("locations"))
        department = self._extract_text(raw_job, ("department", "team", "jobFamily"))
        description = self._extract_text(raw_job, ("description", "summary", "teaser"))
        url = self._extract_text(raw_job, ("positionUrl", "url", "jobUrl"))
        if url and url.startswith("/"):
            url = f"https://apply.careers.microsoft.com{url}"

        payload = {
            **dict(raw_job),
            "title": title,
            "location": location,
            "description": " ".join(part for part in (department, description) if part),
            "url": url,
            "id": self._extract_job_id(raw_job),
        }
        return normalize_candidate(payload, company=self.company)

    @staticmethod
    def _extract_jobs(payload: Mapping[str, Any]) -> Sequence[Mapping[str, Any]]:
        data = payload.get("data")
        if not isinstance(data, Mapping):
            return []

        positions = data.get("positions")
        if not isinstance(positions, list):
            return []

        return [position for position in positions if isinstance(position, Mapping)]

    @staticmethod
    def _extract_job_id(raw_job: Mapping[str, Any]) -> str:
        for key in ("displayJobId", "atsJobId", "id"):
            value = raw_job.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
            if isinstance(value, int):
                return str(value)
        return ""

    @staticmethod
    def _extract_locations(raw_locations: Any) -> str:
        if isinstance(raw_locations, str):
            return raw_locations.strip()
        if isinstance(raw_locations, Sequence) and not isinstance(raw_locations, (str, bytes, bytearray)):
            values = [str(location).strip() for location in raw_locations if str(location).strip()]
            return ", ".join(values)
        return ""

    @staticmethod
    def _extract_text(raw_job: Mapping[str, Any], keys: Sequence[str]) -> str:
        for key in keys:
            value = raw_job.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return ""