from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from filter_engine import normalize_candidate

from .base_scraper import BaseScraper


class NvidiaScraper(BaseScraper):
    company = "NVIDIA"
    source_name = "nvidia"
    base_url = "https://jobs.nvidia.com"
    search_endpoint = "https://jobs.nvidia.com/api/pcsx/search"
    page_size = 10
    max_pages = 6

    search_variants: tuple[dict[str, str], ...] = (
        {"query": "AI", "location": "Munich"},
        {"query": "machine learning", "location": "Munich"},
        {"query": "generative AI", "location": "Munich"},
        {"query": "computer vision", "location": "Munich"},
        {"query": "data science", "location": "Munich"},
        {"query": "MLOps", "location": "Munich"},
        {"query": "applied scientist", "location": "Munich"},
        {"query": "research scientist", "location": "Munich"},
        {"query": "robotics", "location": "Munich"},
    )

    def fetch_raw_jobs(self) -> Sequence[Mapping[str, Any]]:
        jobs: list[Mapping[str, Any]] = []
        seen_ids: set[str] = set()

        for variant in self.search_variants:
            for page in range(self.max_pages):
                params: dict[str, Any] = {
                    "domain": "nvidia.com",
                    "sort_by": "timestamp",
                    "filter_distance": "160",
                    "filter_include_remote": "1",
                    "start": str(page * self.page_size),
                    **variant,
                }

                try:
                    payload = self.request_json(self.search_endpoint, params=params)
                except Exception as exc:  # pragma: no cover - runtime integration path
                    self.logger.warning("NVIDIA search request failed for params %s: %s", params, exc)
                    break

                positions = self._extract_positions(payload)
                if not positions:
                    break

                new_results = 0
                for position in positions:
                    job_id = self._extract_job_id(position)
                    if job_id and job_id in seen_ids:
                        continue
                    if job_id:
                        seen_ids.add(job_id)
                    jobs.append(position)
                    new_results += 1

                if new_results == 0:
                    break

        return jobs

    def normalize_raw_job(self, raw_job: Mapping[str, Any]):
        title = self._extract_text(raw_job, ("name", "title"))
        locations = raw_job.get("locations")
        location = self._extract_location(locations)
        description = self._extract_text(raw_job, ("department", "description", "summary"))
        url = self._extract_text(raw_job, ("positionUrl", "url", "job_url"))
        if url and url.startswith("/"):
            url = f"{self.base_url}{url}"

        payload = {
            **dict(raw_job),
            "title": title,
            "location": location,
            "description": description,
            "url": url,
            "id": self._extract_job_id(raw_job),
        }

        return normalize_candidate(payload, company=self.company)

    @staticmethod
    def _extract_positions(payload: Mapping[str, Any]) -> list[Mapping[str, Any]]:
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
    def _extract_location(raw_locations: Any) -> str:
        if isinstance(raw_locations, str):
            return raw_locations
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