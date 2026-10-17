import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthenticatedUser } from "@/lib/auth/user";
import { signOutDashboardAction } from "@/app/dashboard/actions";
import { GuardedLink, UnsavedChangesProvider } from "@/components/unsaved-changes";
import { GuardedSignOutButton } from "@/components/guarded-signout-button";

export function DashboardShell({ user, children }: { user: AuthenticatedUser; children: ReactNode }) {
  const displayName = user.fullName || user.email || "Your workspace";
  const initials = displayName.slice(0, 1).toUpperCase();

  return (
    <UnsavedChangesProvider>
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <GuardedLink className="dashboard-brand" href="/dashboard" aria-label="Proofline dashboard">
          <span className="brand-mark" aria-hidden="true">p</span>
          <span>proofline</span>
        </GuardedLink>
        <nav className="dashboard-nav" aria-label="Workspace navigation">
          <GuardedLink className="dashboard-nav-link" href="/dashboard">Overview</GuardedLink>
          <GuardedLink className="dashboard-nav-link" href="/dashboard/resumes">My resumes</GuardedLink>
          <GuardedLink className="dashboard-nav-link" href="/dashboard/optimize">Job descriptions</GuardedLink>
        </nav>
        <div className="dashboard-account">
          <span className="dashboard-avatar" aria-hidden="true">{initials}</span>
          <span className="dashboard-account-name" title={displayName}>{displayName}</span>
          <form action={signOutDashboardAction}>
            <GuardedSignOutButton />
          </form>
        </div>
        <details className="dashboard-mobile-nav">
          <summary><span aria-hidden="true">☰</span> Workspace menu</summary>
          <nav aria-label="Mobile workspace navigation">
            <GuardedLink href="/dashboard">Overview</GuardedLink>
            <GuardedLink href="/dashboard/resumes">My resumes</GuardedLink>
            <GuardedLink href="/dashboard/optimize">Job descriptions</GuardedLink>
            <form action={signOutDashboardAction}>
              <GuardedSignOutButton />
            </form>
          </nav>
        </details>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <span>Resume workspace</span>
          <span className="dashboard-topbar-user">{user.email}</span>
        </header>
        <div className="dashboard-content">{children}</div>
      </div>
    </div>
    </UnsavedChangesProvider>
  );
}