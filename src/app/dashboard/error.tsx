"use client";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="dashboard-error" role="alert">
      <span className="eyebrow">Workspace unavailable</span>
      <h1>We could not load your workspace.</h1>
      <p>Check the Supabase connection and migration setup, then try again.</p>
      <button className="button button-dark" onClick={reset} type="button">Try again</button>
    </main>
  );
}