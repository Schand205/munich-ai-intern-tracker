from __future__ import annotations

import logging
from typing import Iterable

from rich.console import Console
from rich.logging import RichHandler
from rich.table import Table

from database import DatabaseError, get_database
from models import JobRecord
from scrapers.amazon import AmazonScraper
from scrapers.celonis import CelonisScraper


console = Console()


def _configure_logging() -> None:
    root_logger = logging.getLogger()
    if any(isinstance(handler, RichHandler) for handler in root_logger.handlers):
        return

    handler = RichHandler(console=console, rich_tracebacks=True, show_path=False)
    handler.setFormatter(logging.Formatter("%(message)s"))
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)


def collect_jobs() -> list[JobRecord]:
    scrapers = [AmazonScraper(), CelonisScraper()]
    collected: list[JobRecord] = []

    try:
        for scraper in scrapers:
            with scraper:
                collected.extend(scraper.scrape())
    finally:
        for scraper in scrapers:
            scraper.close()

    deduplicated: dict[str, JobRecord] = {}
    for job in collected:
        deduplicated[job.id] = job
    return list(deduplicated.values())


def print_summary(jobs: Iterable[JobRecord]) -> None:
    jobs = list(jobs)
    table = Table(title="Scrape Summary")
    table.add_column("Company", style="cyan")
    table.add_column("Title", style="white")
    table.add_column("Type", style="green")
    table.add_column("Category", style="magenta")
    table.add_column("Location", style="yellow")

    for job in jobs[:10]:
        table.add_row(job.company, job.title, job.job_type, job.category, job.location)

    console.print(table)
    console.print(f"Collected {len(jobs)} filtered jobs.")


def main() -> int:
    _configure_logging()
    logger = logging.getLogger("munich_tracker.main")

    try:
        jobs = collect_jobs()
    except Exception as exc:  # pragma: no cover - runtime integration path
        logger.exception("Scraping failed: %s", exc)
        return 1

    print_summary(jobs)

    if not jobs:
        logger.info("No jobs matched the filter rules.")
        return 0

    try:
        database = get_database()
        upserted = database.upsert_jobs(jobs)
        logger.info("Upserted %s jobs.", upserted)
    except DatabaseError as exc:
        logger.exception("Database upsert failed: %s", exc)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
