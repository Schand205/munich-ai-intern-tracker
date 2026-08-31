import { Suspense } from "react";

import TrackerDashboard from "@/components/tracker-dashboard";

export default function Home() {
  return (
    <Suspense fallback={<DashboardShell />}>
      <TrackerDashboard />
    </Suspense>
  );
}

function DashboardShell() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#081120] text-stone-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_26%),linear-gradient(180deg,_rgba(8,17,32,1)_0%,_rgba(5,10,20,1)_100%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.45em] text-amber-200/80">Munich AI/ML Intern & Working Student Tracker</p>
          <div className="mt-4 h-10 w-2/3 rounded-2xl bg-white/10" />
          <div className="mt-3 h-5 w-1/2 rounded-full bg-white/10" />
        </div>
      </div>
    </main>
  );
}