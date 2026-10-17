import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const destination = new URL(safeRedirectPath(requestUrl.searchParams.get("next")), getSiteUrl());

  if (!code) {
    destination.pathname = "/login";
    destination.search = "?error=missing_code";
    return NextResponse.redirect(destination);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    destination.pathname = "/login";
    destination.search = "?error=confirmation";
  }

  return NextResponse.redirect(destination);
}