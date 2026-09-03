from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from bs4 import BeautifulSoup

from filter_engine import normalize_candidate

from .base_scraper import BaseScraper


class AppleScraper(BaseScraper):
    company = "Apple"
    source_name = "apple"
    base_url = "https://jobs.apple.com"
    search_endpoint = "https://jobs.apple.com/en-us/search"

    search_variants: tuple[dict[str, str], ...] = (
        {"search": "AI", "sort": "relevance"},
        {"search": "machine learning", "sort": "relevance"},
        {"search": "artificial intelligence", "sort": "relevance"},
        {"search": "computer vision", "sort": "relevance"},
        {"search": "data scientist", "sort": "relevance"},
        {"search": "research engineer", "sort": "relevance"},
        {"search": "MLOps", "sort": "relevance"},
    )

    def fetch_raw_jobs(self) -> Sequence[Mapping[str, Any]]:
        jobs: list[Mapping[str, Any]] = []
        seen_ids: set[str] = set()

        for params in self.search_variants:
            try:
                html = self.request_text(self.search_endpoint, params=params)
            except Exception as exc:  # pragma: no cover - runtime integration path
                self.logger.warning("Apple search request failed for params %s: %s", params, exc)
                continue

            for raw_job in self._extract_jobs(html):
                job_id = self._extract_job_id(raw_job)
                if job_id and job_id in seen_ids:
                    continue
                if job_id:
                    seen_ids.add(job_id)
                jobs.append(raw_job)

        return jobs

    def normalize_raw_job(self, raw_job: Mapping[str, Any]):
        title = self._extract_text(raw_job, ("title", "name"))
        location = self._extract_text(raw_job, ("location", "city", "place"))
        department = self._extract_text(raw_job, ("category", "team", "department", "product"))
        description = self._extract_text(raw_job, ("description", "summary", "teaser", "excerpt"))
        url = self._extract_text(raw_job, ("url", "href", "link"))
        if url and url.startswith("/"):
            url = f"{self.base_url}{url}"

        payload = {
            **dict(raw_job),
            "title": title,
            "location": location,
            "description": " ".join(part for part in (department, description) if part),
            "url": url,
        }
        return normalize_candidate(payload, company=self.company)

    @staticmethod
    def _extract_jobs(html: str) -> Sequence[Mapping[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        cards = soup.select('a[href*="/en-us/details/"]')
        jobs: list[Mapping[str, Any]] = []

        for anchor in cards:
            title = " ".join(anchor.stripped_strings).strip()
            href = anchor.get("href") or ""
            parent = anchor
            for _ in range(4):
                parent = parent.parent if parent else None
            card_text = parent.get_text(" | ", strip=True) if parent else title
            location = AppleScraper._extract_location(card_text)
            department = AppleScraper._extract_department(card_text)
            jobs.append(
                {
                    "title": title,
                    "location": location,
                    "description": department,
                    "url": href,
                    "id": href,
                }
            )

        return jobs

    @staticmethod
    def _extract_location(card_text: str) -> str:
        if "Location | " not in card_text:
            return ""
        after_location = card_text.split("Location | ", 1)[1]
        for separator in (" | Actions", " | Apply", " | See full role description"):
            if separator in after_location:
                after_location = after_location.split(separator, 1)[0]
        return after_location.strip()

    @staticmethod
    def _extract_department(card_text: str) -> str:
        parts = [part.strip() for part in card_text.split(" | ") if part.strip()]
        if len(parts) < 2:
            return ""
        return parts[1]

    @staticmethod
    def _extract_text(raw_job: Mapping[str, Any], keys: Sequence[str]) -> str:
        for key in keys:
            value = raw_job.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return ""

    @staticmethod
    def _extract_job_id(raw_job: Mapping[str, Any]) -> str:
        url = raw_job.get("url")
        if isinstance(url, str) and url.strip():
            return url.strip()
        return ""