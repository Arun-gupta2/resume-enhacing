import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Get started", robots: { index: false, follow: false } };

export default function SignUpPage() {
  return (
    <main className="account-wrap">
      <AuthForm mode="signup" nextPath="/dashboard" />
    </main>
  );
}