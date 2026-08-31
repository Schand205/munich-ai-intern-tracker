import { NextResponse } from "next/server";

import type { JobFilters } from "@/lib/job-filters";
import { summarizeJobs, type JobRecord } from "@/lib/jobs";
import { getServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function normalizeFilterValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: JobFilters = {
      company: normalizeFilterValue(searchParams.get("company") ?? undefined),
      job_type: normalizeFilterValue(searchParams.get("job_type") ?? undefined),
      category: normalizeFilterValue(searchParams.get("category") ?? undefined),
      q: normalizeFilterValue(searchParams.get("q") ?? undefined),
    };

    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
      .from("jobs")
      .select("id,company,title,location,job_type,category,url,description_summary,tags,first_seen,status,is_active")
      .order("first_seen", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allJobs = (data ?? []) as JobRecord[];
    const jobs = allJobs.filter((job) => matchesFilter(job, filters));
    const summary = summarizeJobs(allJobs, filters);

    return NextResponse.json({ jobs, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
