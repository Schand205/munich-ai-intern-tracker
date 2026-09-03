"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildFilterHref, type JobFilters } from "@/lib/job-filters";
import type { JobRecord, JobsSummary } from "@/lib/jobs";

const filterGroups = {
  company: ["Amazon", "Apple", "Celonis", "Microsoft", "NVIDIA", "Google"],
  job_type: ["Internship", "Working Student", "Early Career", "Professional", "Thesis"],
  category: ["AI Engineering", "Applied AI", "Machine Learning", "AI Research", "Data Science"],
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
  const focusBadges = ["Applied AI", "Machine Learning", "AI Research", "Under 5 years"];

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
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-stone-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(45,212,191,0.09),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.12),_transparent_30%),linear-gradient(180deg,_rgba(7,17,31,1)_0%,_rgba(5,10,20,1)_100%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[1.5fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.28em] text-stone-400">
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-amber-100">Public</span>
              <span>Munich AI jobs</span>
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              A focused board for Munich AI roles.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
              The board now stays focused on applied AI, ML, research, and data roles in Munich that look early-career friendly or ask for under five years of experience.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {focusBadges.map((badge) => (
                <span key={badge} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-stone-200">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <SimpleStat label="Jobs" value={summary?.total ?? 0} />
            <SimpleStat label="Companies" value={summary?.companies ?? 0} />
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 shadow-sm backdrop-blur-xl">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-400">Scope</p>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                Munich-linked roles from Amazon, Apple, Celonis, Microsoft, NVIDIA, and similar boards when they fit the AI and experience rules.
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[1.75rem] border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-4 shadow-sm backdrop-blur-xl sm:p-5">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input type="hidden" name="company" value={filters.company ?? ""} />
            <input type="hidden" name="job_type" value={filters.job_type ?? ""} />
            <input type="hidden" name="category" value={filters.category ?? ""} />
            <div className="flex-1">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-stone-400">Search</label>
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Try AI, Munich, ML engineer, research scientist..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-amber-300/60"
              />
            </div>
            <button className="rounded-2xl bg-gradient-to-r from-amber-300 via-orange-400 to-teal-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:opacity-95">
              Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-3">
            <SimplePillGroup label="Company" options={filterGroups.company} active={filters.company} param="company" current={filters} />
            <SimplePillGroup label="Type" options={filterGroups.job_type} active={filters.job_type} param="job_type" current={filters} />
            <SimplePillGroup label="Field" options={filterGroups.category} active={filters.category} param="category" current={filters} />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-400">Live results</h2>
              <p className="mt-1 text-sm text-stone-300">{loading ? "Refreshing the board..." : `Showing ${latestJobs.length} of ${summary?.total ?? 0}`}</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-stone-300">
              {loading ? "Loading" : `${summary?.active ?? 0} active`}
            </div>
          </div>

          {latestJobs.length ? (
            <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
              {latestJobs.map((job) => (
                <article
                  key={job.id}
                  className="flex h-full flex-col rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300/20 hover:bg-slate-950/80 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a href={job.url} target="_blank" rel="noreferrer" className="block text-lg font-semibold leading-7 text-white hover:text-amber-200 hover:underline">
                        {job.title}
                      </a>
                      <p className="mt-1 text-sm text-stone-300">{job.company}</p>
                    </div>
                    <StatusBadge status={job.status ?? "NEW"} active={job.is_active !== false} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.18em] text-stone-300">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{job.job_type}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{job.category ?? "AI"}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{job.location ?? "Munich"}</span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-stone-300">
                    {job.description_summary || "A Munich-based role that fits the broader AI-focused board."}
                  </p>

                  {job.tags?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {job.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-stone-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-auto pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-400">
                      <span>First seen {new Date(job.first_seen).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      <a href={job.url} target="_blank" rel="noreferrer" className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100 transition hover:bg-amber-300/20">
                        Open job
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-4 py-12 text-center text-stone-400 sm:px-6">
              {loading ? "Loading jobs from Supabase..." : "No jobs match the current filters."}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SimpleStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-4 shadow-sm backdrop-blur-xl">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function SimplePillGroup({
  label,
  options,
  active,
  param,
  current,
}: {
  label: string;
  options: readonly string[];
  active?: string;
  param: keyof JobFilters;
  current: JobFilters;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">{label}</span>
      <Link
        href={buildFilterHref(current, { [param]: undefined })}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${!active ? "border-amber-300/40 bg-amber-300/15 text-amber-100" : "border-white/10 bg-white/5 text-stone-300 hover:border-white/20 hover:bg-white/10"}`}
      >
        All
      </Link>
      {options.map((option) => {
        const isActive = active?.toLowerCase() === option.toLowerCase();
        return (
          <Link
            key={option}
            href={buildFilterHref(current, { [param]: option })}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${isActive ? "border-amber-300/40 bg-amber-300/15 text-amber-100" : "border-white/10 bg-white/5 text-stone-300 hover:border-white/20 hover:bg-white/10"}`}
          >
            {option}
          </Link>
        );
      })}
    </div>
  );
}

function StatusBadge({ status, active }: { status: string; active: boolean }) {
  const normalized = status.toUpperCase();
  const styles: Record<string, string> = {
    NEW: "border-amber-200 bg-amber-100 text-amber-700",
    BOOKMARKED: "border-sky-200 bg-sky-100 text-sky-700",
    APPLIED: "border-emerald-200 bg-emerald-100 text-emerald-700",
    INTERVIEW: "border-cyan-200 bg-cyan-100 text-cyan-700",
    REJECTED: "border-rose-200 bg-rose-100 text-rose-700",
  };

  return (
    <div className="flex flex-wrap gap-2">
      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[normalized] ?? "border-white/10 bg-white/5 text-stone-300"}`}>
        {normalized}
      </span>
      {!active ? <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-stone-400">Inactive</span> : null}
    </div>
  );
}
