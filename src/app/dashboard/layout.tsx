import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireAuthenticatedUser } from "@/lib/auth/user";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="dashboard-loading" role="status">Loading your workspace…</div>}><VerifiedDashboard>{children}</VerifiedDashboard></Suspense>;
}

async function VerifiedDashboard({ children }: { children: ReactNode }) {
  const user = await requireAuthenticatedUser();
  return <DashboardShell user={user}>{children}</DashboardShell>;
}