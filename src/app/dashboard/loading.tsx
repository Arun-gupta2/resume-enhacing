export default function DashboardLoading() {
  return (
    <main className="dashboard-loading" role="status" aria-live="polite">
      <span className="loading-mark" aria-hidden="true" />
      Loading your workspace…
    </main>
  );
}