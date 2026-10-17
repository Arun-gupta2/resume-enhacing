import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  fullName: string | null;
};

import { localDb } from "@/lib/data/local-db";

export const getAuthenticatedUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const url = process.env.SUPABASE_URL ?? "";
  if (!url || url.includes("your-project-id")) {
    const defaultUser = localDb.getUser();
    return {
      id: defaultUser.id,
      email: defaultUser.email,
      fullName: defaultUser.fullName,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!error && user) {
      const email = user.email ?? null;
      const fullName = (user.user_metadata?.full_name as string) || (email ? email.split("@")[0] : null);

      return {
        id: user.id,
        email,
        fullName,
      };
    }
  } catch {
    // Supabase not reachable; fall through to local workspace session
  }

  const defaultUser = localDb.getUser();
  return {
    id: defaultUser.id,
    email: defaultUser.email,
    fullName: defaultUser.fullName,
  };
});

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?next=%2Fdashboard");
  return user;
}