from __future__ import annotations

import hashlib
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any, Mapping, Sequence

from models import JobRecord


MUNICH_LOCATION_KEYWORDS: tuple[str, ...] = (
    "munich",
    "muenchen",
    "münchen",
    "greater munich",
    "munich area",
    "parkstadt schwabing",
    "arnulfpark",
    "theresienstrasse",
    "theresienstraße",
    "karlstrasse",
    "karlstraße",
    "unterfoehring",
    "unterföhring",
    "garching",
    "ismaning",
    "ottobrunn",
    "aschheim",
)

ROLE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Internship": (
        r"\bintern(ship)?\b",
        r"\bpraktikum\b",
        r"\bstudent intern\b",
    ),
    "Working Student": (
        r"\bworking student\b",
        r"\bwerkstudent\b",
        r"\bstudent worker\b",
        r"\bstudent assistant\b",
    ),
    "Thesis": (
        r"\bthesis\b",
        r"\bbachelor thesis\b",
        r"\bmaster thesis\b",
        r"\babschlussarbeit\b",
    ),
}

FIELD_PATTERNS: dict[str, tuple[str, ...]] = {
    "AI Engineering": (
        r"\bai\b",
        r"\bartificial intelligence\b",
        r"\bgenerative ai\b",
        r"\bgenai\b",
        r"\bllm\b",
        r"\bnlp\b",
        r"\bcomputer vision\b",
        r"\bmlops\b",
    ),
    "Machine Learning": (
        r"\bmachine learning\b",
        r"\bdeep learning\b",
        r"\brecommendation\b",
        r"\brecommender\b",
        r"\bmodel training\b",
        r"\bml\b",
    ),
    "Data Science": (
        r"\bdata science\b",
        r"\bdata scientist\b",
        r"\banalytics\b",
        r"\bstatistics\b",
        r"\bsql\b",
        r"\bexperiment\b",
        r"\bdata analysis\b",
    ),
}

FIELD_TAGS: dict[str, tuple[str, ...]] = {
    "AI Engineering": ("AI", "GenAI", "NLP", "Computer Vision", "MLOps"),
    "Machine Learning": ("ML", "Deep Learning", "Modeling", "Recommendation"),
    "Data Science": ("Data", "Analytics", "Statistics", "SQL"),
}


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", ascii_text).strip().lower()


def slugify(value: str) -> str:
    normalized = normalize_text(value)
    slug = re.sub(r"[^a-z0-9]+", "_", normalized).strip("_")
    return slug or "job"


def build_job_id(company: str, external_id: str | None = None, url: str | None = None, title: str | None = None) -> str:
    company_slug = slugify(company)
    stable_source = external_id or url or title or company
    source_slug = slugify(stable_source)
    if len(source_slug) > 80:
        source_slug = hashlib.sha1(stable_source.encode("utf-8")).hexdigest()[:16]
    return f"{company_slug}_{source_slug}"


def _matches_any_pattern(text: str, patterns: Sequence[str]) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def has_munich_location(*values: str | None) -> bool:
    text = normalize_text(" ".join(value or "" for value in values))
    return any(keyword in text for keyword in MUNICH_LOCATION_KEYWORDS)


def infer_job_type(*values: str | None) -> str | None:
    text = normalize_text(" ".join(value or "" for value in values))
    for job_type, patterns in ROLE_KEYWORDS.items():
        if _matches_any_pattern(text, patterns):
            return job_type
    return None


def infer_category(*values: str | None) -> str | None:
    text = normalize_text(" ".join(value or "" for value in values))
    for category, patterns in FIELD_PATTERNS.items():
        if _matches_any_pattern(text, patterns):
            return category
    return None


def extract_tags(*values: str | None) -> list[str]:
    text = normalize_text(" ".join(value or "" for value in values))
    tags: list[str] = []
    for category, patterns in FIELD_PATTERNS.items():
        if _matches_any_pattern(text, patterns):
            tags.extend(FIELD_TAGS.get(category, ()))
    for job_type, patterns in ROLE_KEYWORDS.items():
        if _matches_any_pattern(text, patterns):
            tags.append(job_type)
    deduped: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        normalized_tag = tag.lower()
        if normalized_tag not in seen:
            seen.add(normalized_tag)
            deduped.append(tag)
    return deduped


def summarize_description(description: str | None, max_length: int = 220) -> str:
    if not description:
        return ""
    cleaned = re.sub(r"<[^>]+>", " ", description)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) <= max_length:
        return cleaned
    cutoff = cleaned.rfind(".", 0, max_length)
    if cutoff == -1:
        cutoff = cleaned.rfind(" ", 0, max_length)
    if cutoff == -1:
        cutoff = max_length
    return f"{cleaned[:cutoff].rstrip()}..."


def _extract_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, Mapping):
        for key in ("name", "title", "location", "label", "value"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate
        return " ".join(_extract_text(item) for item in value.values())
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return " ".join(_extract_text(item) for item in value)
    return str(value)


def _first_present(mapping: Mapping[str, Any], keys: Sequence[str]) -> str:
    for key in keys:
        value = mapping.get(key)
        text = _extract_text(value).strip()
        if text:
            return text
    return ""


def normalize_candidate(
    raw_job: Mapping[str, Any],
    *,
    company: str,
    default_location: str = "Munich",
    url_keys: Sequence[str] = ("url", "absolute_url", "job_url", "jobPath"),
    id_keys: Sequence[str] = ("id", "job_id", "jobId", "req_id", "requisition_id"),
    title_keys: Sequence[str] = ("title", "job_title", "name"),
    location_keys: Sequence[str] = ("location", "location_name", "locations", "city"),
    description_keys: Sequence[str] = ("description", "content", "summary", "teaser", "job_description"),
) -> JobRecord | None:
    title = _first_present(raw_job, title_keys)
    location = _first_present(raw_job, location_keys) or default_location
    description = _first_present(raw_job, description_keys)
    url = _first_present(raw_job, url_keys)
    external_id = _first_present(raw_job, id_keys)

    if not title or not url:
        return None

    if not has_munich_location(location, description, title):
        return None

    job_type = infer_job_type(title, description)
    if not job_type:
        return None

    category = infer_category(title, description)
    if not category:
        return None

    return JobRecord(
        id=build_job_id(company=company, external_id=external_id, url=url, title=title),
        company=company,
        title=title.strip(),
        location=location.strip() or default_location,
        job_type=job_type,
        category=category,
        url=url.strip(),
        description_summary=summarize_description(description),
        tags=extract_tags(title, location, description),
        first_seen=datetime.now(timezone.utc),
        status="NEW",
        is_active=True,
    )
