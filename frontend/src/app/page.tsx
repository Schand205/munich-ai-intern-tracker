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
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-stone-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(45,212,191,0.09),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.12),_transparent_30%),linear-gradient(180deg,_rgba(7,17,31,1)_0%,_rgba(5,10,20,1)_100%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8">
          <div className="h-3 w-24 rounded-full bg-amber-300/70" />
          <div className="mt-4 h-12 w-3/4 rounded-2xl bg-white/10" />
          <div className="mt-3 h-5 w-1/2 rounded-full bg-white/10" />
        </div>
      </div>
    </main>
  );
}