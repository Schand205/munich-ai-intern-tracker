import type { JobFilters } from "@/lib/job-filters";

export type JobStatus = "NEW" | "BOOKMARKED" | "APPLIED" | "INTERVIEW" | "REJECTED";

export type JobRecord = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  job_type: string;
  category: string | null;
  url: string;
  description_summary: string | null;
  tags: string[] | null;
  first_seen: string;
  status: JobStatus | string | null;
  is_active: boolean | null;
};

export type JobsSummary = {
  jobs: JobRecord[];
  total: number;
  active: number;
  newCount: number;
  bookmarked: number;
  applied: number;
  companies: number;
  categories: Array<{ label: string; count: number }>;
  jobTypes: Array<{ label: string; count: number }>;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function matchesFilter(job: JobRecord, filters: JobFilters) {
  const company = normalize(filters.company);
  const jobType = normalize(filters.job_type);
  const category = normalize(filters.category);
  const query = normalize(filters.q);

  if (company && normalize(job.company) !== company) {
    return false;
  }

  if (jobType && normalize(job.job_type) !== jobType) {
    return false;
  }

  if (category && normalize(job.category) !== category) {
    return false;
  }

  if (!query) {
    return true;
  }

  const haystack = [job.company, job.title, job.location, job.category, job.job_type, job.description_summary, ...(job.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function countBy<T extends string>(items: T[]) {
  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function summarizeJobs(allJobs: JobRecord[], filters: JobFilters = {}): JobsSummary {
  const jobs = allJobs.filter((job) => matchesFilter(job, filters));
  const status = (job: JobRecord) => normalize(job.status as string | null | undefined);

  return {
    jobs,
    total: jobs.length,
    active: jobs.filter((job) => job.is_active !== false).length,
    newCount: jobs.filter((job) => status(job) === "new").length,
    bookmarked: jobs.filter((job) => status(job) === "bookmarked").length,
    applied: jobs.filter((job) => status(job) === "applied").length,
    companies: new Set(jobs.map((job) => job.company)).size,
    categories: countBy(jobs.map((job) => job.category ?? "Uncategorized")),
    jobTypes: countBy(jobs.map((job) => job.job_type)),
  };
}

