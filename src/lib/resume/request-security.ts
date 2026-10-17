import "server-only";

import { getSiteUrl } from "@/lib/supabase/env";

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === getSiteUrl().origin;
  } catch {
    return false;
  }
}

export function hasOversizedContentLength(request: Request, maxBytes: number): boolean {
  const value = request.headers.get("content-length");
  if (!value) return false;
  const length = Number(value);
  return !Number.isSafeInteger(length) || length < 0 || length > maxBytes;
}