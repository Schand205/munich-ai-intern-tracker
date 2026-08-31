"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildFilterHref, type JobFilters } from "@/lib/job-filters";
import type { JobRecord, JobsSummary } from "@/lib/jobs";

const filterGroups = {
  company: ["Amazon", "Celonis", "Apple", "Google", "Microsoft", "NVIDIA"],
  job_type: ["Internship", "Working Student", "Thesis"],
  category: ["AI Engineering", "Machine Learning", "Data Science"],
} as const;

type ApiResponse = {
  jobs: JobRecord[];
  summary: JobsSummary;
  error?: string;
};

function normalizeFilterValue(value: string | null) {
  return value ?? "";
}

function filtersFromSearchParams(searchParams: ReturnType<typeof useSearchParams>): JobFilters {
  return {
    company: normalizeFilterValue(searchParams.get("company")),
    job_type: normalizeFilterValue(searchParams.get("job_type")),
    category: normalizeFilterValue(searchParams.get("category")),
    q: normalizeFilterValue(searchParams.get("q")),
  };
}

function useDashboardData() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const filters = filtersFromSearchParams(searchParams);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/jobs?${queryString}`, { signal: controller.signal, cache: "no-store" });
        const payload = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load jobs");
        }

        setData(payload);
      } catch (loadError) {
        if ((loadError as Error).name === "AbortError") {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load jobs");
      } finally {
        setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [queryString]);

  return { data, error, filters, loading };
}

export default function TrackerDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, error, filters, loading } = useDashboardData();
  const latestJobs = data?.jobs.slice(0, 12) ?? [];
  const summary = data?.summary;
  const activeFilters = Object.values(filters).filter(Boolean).length;

  function updateSearch(next: JobFilters) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    updateSearch({
      company: normalizeFilterValue(formData.get("company")?.toString() ?? ""),
      job_type: normalizeFilterValue(formData.get("job_type")?.toString() ?? ""),
      category: normalizeFilterValue(formData.get("category")?.toString() ?? ""),
      q: normalizeFilterValue(formData.get("q")?.toString() ?? ""),
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#081120] text-stone-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_26%),linear-gradient(180deg,_rgba(8,17,32,1)_0%,_rgba(5,10,20,1)_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(8,15,30,0.25)] backdrop-blur-xl lg:grid-cols-[1.5fr_1fr] lg:items-end">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.45em] text-amber-200/80">Munich AI/ML Intern & Working Student Tracker</p>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Live opportunities for AI, ML, and Data Science roles in Munich.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
                A focused dashboard for internships, working student roles, and thesis projects at companies that actually matter for Munich&apos;s AI market.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Matched roles" value={summary?.total.toString() ?? (loading ? "..." : "0")} accent="amber" />
            <StatCard label="Active roles" value={summary?.active.toString() ?? (loading ? "..." : "0")} accent="cyan" />
            <StatCard label="New today" value={summary?.newCount.toString() ?? (loading ? "..." : "0")} accent="emerald" />
            <StatCard label="Companies" value={summary?.companies.toString() ?? (loading ? "..." : "0")} accent="rose" />
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(8,15,30,0.25)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-stone-400">Search state</p>
                <h2 className="mt-1 text-lg font-medium text-white">Filtered live board</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-stone-300">
                {activeFilters ? `${activeFilters} active filters` : "No filters active"}
              </div>
            </div>

            {error ? (
              <div className="rounded-3xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile label="New" value={summary?.newCount ?? 0} />
              <MetricTile label="Bookmarked" value={summary?.bookmarked ?? 0} />
              <MetricTile label="Applied" value={summary?.applied ?? 0} />
              <MetricTile label="Latest 12 shown" value={Math.min(latestJobs.length, 12)} />
            </div>

            <div className="grid gap-3">
              <label className="space-y-2 text-sm text-stone-300">
                <span className="text-xs uppercase tracking-[0.35em] text-stone-500">Keyword search</span>
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <input type="hidden" name="company" value={filters.company ?? ""} />
                  <input type="hidden" name="job_type" value={filters.job_type ?? ""} />
                  <input type="hidden" name="category" value={filters.category ?? ""} />
                  <input
                    name="q"
                    defaultValue={filters.q}
                    placeholder="Search title, company, skill, location"
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-stone-100 outline-none ring-0 transition placeholder:text-stone-500 focus:border-amber-300/60"
                  />
                  <button className="rounded-2xl bg-amber-300 px-4 py-3 font-medium text-slate-950 transition hover:bg-amber-200">
                    Search
                  </button>
                </form>
              </label>

              <div className="grid gap-3 xl:grid-cols-3">
                <FilterPills title="Company" options={filterGroups.company} active={filters.company} param="company" current={filters} />
                <FilterPills title="Role type" options={filterGroups.job_type} active={filters.job_type} param="job_type" current={filters} />
                <FilterPills title="Field" options={filterGroups.category} active={filters.category} param="category" current={filters} />
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_80px_rgba(8,15,30,0.25)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.35em] text-stone-400">Distribution</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DistributionCard title="Categories" rows={summary?.categories ?? []} />
              <DistributionCard title="Role types" rows={summary?.jobTypes ?? []} />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(8,15,30,0.25)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-stone-400">Latest jobs</p>
              <h2 className="mt-1 text-xl font-medium text-white">Recent matches from the pipeline</h2>
            </div>
            <div className="text-sm text-stone-400">
              {loading ? "Loading latest roles..." : `Showing ${latestJobs.length} of ${summary?.total ?? 0}`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left">
              <thead className="text-xs uppercase tracking-[0.35em] text-stone-500">
                <tr>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Company</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Location</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm text-stone-200">
                {latestJobs.length ? (
                  latestJobs.map((job) => (
                    <tr key={job.id} className="align-top transition hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <a href={job.url} target="_blank" rel="noreferrer" className="font-medium text-white transition hover:text-amber-200">
                          {job.title}
                        </a>
                        <p className="mt-1 max-w-2xl text-xs leading-6 text-stone-400">{job.description_summary ?? "No summary available yet."}</p>
                      </td>
                      <td className="px-5 py-4 text-stone-200">{job.company}</td>
                      <td className="px-5 py-4">{job.job_type}</td>
                      <td className="px-5 py-4">{job.category ?? "Uncategorized"}</td>
                      <td className="px-5 py-4">{job.location ?? "Munich"}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={job.status ?? "NEW"} active={job.is_active !== false} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-14 text-center text-stone-400" colSpan={6}>
                      {loading ? "Loading jobs from Supabase..." : "No jobs match the current filters. Try clearing a chip or search term."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function FilterPills({
  title,
  options,
  active,
  param,
  current,
}: {
  title: string;
  options: readonly string[];
  active?: string;
  param: keyof JobFilters;
  current: JobFilters;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-[0_20px_80px_rgba(8,15,30,0.25)] backdrop-blur-xl">
      <p className="mb-3 text-xs uppercase tracking-[0.35em] text-stone-400">{title}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildFilterHref(current, { [param]: undefined })}
          className={`rounded-full border px-3 py-1.5 text-sm transition ${!active ? "border-amber-300 bg-amber-300 text-slate-950" : "border-white/10 bg-white/5 text-stone-300 hover:border-white/25 hover:bg-white/10"}`}
        >
          All
        </Link>
        {options.map((option) => {
          const isActive = active?.toLowerCase() === option.toLowerCase();
          return (
            <Link
              key={option}
              href={buildFilterHref(current, { [param]: option })}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${isActive ? "border-amber-300 bg-amber-300 text-slate-950" : "border-white/10 bg-white/5 text-stone-300 hover:border-white/25 hover:bg-white/10"}`}
            >
              {option}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: "amber" | "cyan" | "emerald" | "rose" }) {
  const accentClasses = {
    amber: "from-amber-300/25 to-amber-300/5 text-amber-100",
    cyan: "from-cyan-300/25 to-cyan-300/5 text-cyan-100",
    emerald: "from-emerald-300/25 to-emerald-300/5 text-emerald-100",
    rose: "from-rose-300/25 to-rose-300/5 text-rose-100",
  };

  return (
    <div className={`rounded-[1.5rem] border border-white/10 bg-gradient-to-br ${accentClasses[accent]} p-4`}>
      <p className="text-xs uppercase tracking-[0.35em] text-stone-400">{label}</p>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.35em] text-stone-500">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function DistributionCard({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.slice(0, 6).map((row) => (
            <div key={row.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-stone-300">{row.label}</span>
                <span className="text-stone-500">{row.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-cyan-300" style={{ width: `${Math.min(100, Math.max(12, row.count * 12))}%` }} />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-stone-500">No data yet.</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, active }: { status: string; active: boolean }) {
  const normalized = status.toUpperCase();
  const styles: Record<string, string> = {
    NEW: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    BOOKMARKED: "border-sky-300/30 bg-sky-300/10 text-sky-100",
    APPLIED: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    INTERVIEW: "border-violet-300/30 bg-violet-300/10 text-violet-100",
    REJECTED: "border-rose-300/30 bg-rose-300/10 text-rose-100",
  };

  return (
    <div className="flex flex-wrap gap-2">
      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[normalized] ?? "border-white/10 bg-white/5 text-stone-200"}`}>
        {normalized}
      </span>
      {!active ? (
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-stone-400">Inactive</span>
      ) : null}
    </div>
  );
}
