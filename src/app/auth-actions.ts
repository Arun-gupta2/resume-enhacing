"use server";

import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";

export type AuthActionState = {
  error?: string;
  success?: string;
};

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readPassword(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (normalized.includes("email not confirmed")) return "Confirm your email before signing in.";
  if (normalized.includes("rate limit")) return "Too many attempts. Wait a moment and try again.";
  if (normalized.includes("password")) return "Choose a password that meets your Supabase project's password rules.";
  return "We could not complete that request. Check your details and try again.";
}

function setupError(error: unknown): string {
  if (error instanceof Error && error.message.includes("not configured")) {
    return "Sign-in is not configured yet. Add the Supabase values from the setup guide to .env.local.";
  }
  if (error instanceof Error && error.message.includes("SUPABASE_")) {
    return "The Supabase settings are invalid. Check the project URL and publishable key in .env.local.";
  }
  return "We could not reach the authentication service. Please try again shortly.";
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = readText(formData, "email").toLowerCase();
  const password = readPassword(formData, "password");
  const next = safeRedirectPath(formData.get("next"));

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8 || password.length > 128) {
    return { error: "Enter a password between 8 and 128 characters." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: authErrorMessage(error.message) };
  } catch (error) {
    return { error: setupError(error) };
  }

  redirect(next);
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = readText(formData, "fullName");
  const email = readText(formData, "email").toLowerCase();
  const password = readPassword(formData, "password");
  const confirmation = readPassword(formData, "passwordConfirmation");
  const next = safeRedirectPath(formData.get("next"));

  if (fullName.length > 80) return { error: "Name must be 80 characters or fewer." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8 || password.length > 128) {
    return { error: "Choose a password between 8 and 128 characters." };
  }
  if (password !== confirmation) return { error: "Those passwords do not match." };

  let redirectAfterSignup = false;
  try {
    const supabase = await createSupabaseServerClient();
    const callbackUrl = new URL("/auth/callback", getSiteUrl());
    callbackUrl.searchParams.set("next", next);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || null },
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) return { error: authErrorMessage(error.message) };
    redirectAfterSignup = Boolean(data.session);
  } catch (error) {
    return { error: setupError(error) };
  }

  if (redirectAfterSignup) redirect(next);
  return { success: "If this address can register, check your inbox for a confirmation link." };
}

