import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Log in", robots: { index: false, follow: false } };

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
};

const callbackNotices: Record<string, string> = {
  confirmation: "That confirmation link could not be verified. Request a fresh link and try again.",
  missing_code: "That confirmation link is incomplete. Request a fresh link and try again.",
  setup: "Authentication is not configured. Follow the Supabase setup guide, then try again.",
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main className="account-wrap">
      <Suspense fallback={<div className="account-panel" role="status">Loading sign-in…</div>}>
        <LoginFormFromQuery searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginFormFromQuery({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : "/dashboard";
  const errorCode = typeof params.error === "string" ? params.error : "";

  return <AuthForm mode="login" nextPath={nextPath} notice={callbackNotices[errorCode]} />;
}