export type JobFilters = {
  company?: string;
  job_type?: string;
  category?: string;
  q?: string;
};

export function buildFilterHref(current: JobFilters, updates: Partial<JobFilters> = {}) {
  const merged = { ...current, ...updates };
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(merged)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}
