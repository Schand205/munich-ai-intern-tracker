from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from typing import Any

from filter_engine import normalize_candidate

from .base_scraper import BaseScraper


class AmazonScraper(BaseScraper):
    company = "Amazon"
    source_name = "amazon"
    base_url = "https://www.amazon.jobs"
    search_endpoint = "https://www.amazon.jobs/en/search.json"

    def fetch_raw_jobs(self) -> Sequence[Mapping[str, Any]]:
        search_variants: tuple[dict[str, Any], ...] = (
            {"offset": 0, "result_limit": 100, "sort": "recent", "country": "DE", "location": "Munich"},
            {"offset": 0, "result_limit": 100, "sort": "recent", "keywords": "Munich AI internship"},
            {"offset": 0, "result_limit": 100, "sort": "recent", "keywords": "Munich working student machine learning"},
            {"offset": 0, "result_limit": 100, "sort": "recent", "keywords": "Munich thesis data science"},
        )

        jobs: list[Mapping[str, Any]] = []
        seen_ids: set[str] = set()

        for params in search_variants:
            try:
                payload = self.request_json(self.search_endpoint, params=params)
            except Exception as exc:  # pragma: no cover - runtime integration path
                self.logger.warning("Amazon search request failed for params %s: %s", params, exc)
                continue

            for raw_job in self._extract_jobs(payload):
                job_id = self._extract_text(raw_job, ("id", "job_id", "jobId", "req_id"))
                if job_id and job_id in seen_ids:
                    continue
                if job_id:
                    seen_ids.add(job_id)
                jobs.append(raw_job)

        return jobs

    def normalize_raw_job(self, raw_job: Mapping[str, Any]):
        title = self._extract_text(raw_job, ("title", "job_title", "name"))
        location = self._extract_text(raw_job, ("location", "location_name", "city", "locations"))
        description = self._extract_text(raw_job, ("description", "summary", "teaser", "job_description"))
        url = self._extract_text(raw_job, ("url", "absolute_url", "job_url", "jobPath", "job_path"))
        if url and url.startswith("/"):
            url = f"{self.base_url}{url}"

        normalized_job = normalize_candidate(
            {
                **dict(raw_job),
                "title": title,
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
                for nested_key in ("name", "title", "location", "value"):
                    nested = value.get(nested_key)
                    if isinstance(nested, str) and nested.strip():
                        return nested
            if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
                for item in value:
                    if isinstance(item, Mapping):
                        candidate = item.get("name") or item.get("title") or item.get("location")
                        if isinstance(candidate, str) and candidate.strip():
                            return candidate
        return ""

    @staticmethod
    def _extract_jobs(payload: Mapping[str, Any]) -> Iterable[Mapping[str, Any]]:
        candidate_keys = ("jobs", "jobResults", "results", "items", "searchResults", "content")
        for key in candidate_keys:
            value = payload.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, Mapping)]

        for value in payload.values():
            if isinstance(value, dict):
                nested = AmazonScraper._extract_jobs(value)
                if nested:
                    return nested
        return []
