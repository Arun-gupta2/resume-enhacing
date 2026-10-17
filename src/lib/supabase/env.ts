import "server-only";

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url && !publishableKey) return null;
  if (!url || !publishableKey) {
    throw new Error("Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL must be a valid HTTPS URL.");
  }

  if (
    parsedUrl.protocol !== "https:" &&
    !(parsedUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsedUrl.hostname))
  ) {
    throw new Error("SUPABASE_URL must use HTTPS (HTTP is allowed for local development).");
  }
  if (
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new Error("SUPABASE_URL must be the project origin without a path, query, or fragment.");
  }

  const key = publishableKey.trim();
  if (key.startsWith("sb_secret_") || key.length < 20) {
    throw new Error("Use a Supabase publishable key or legacy anon key, never a secret/service-role key.");
  }

  const isPublishableKey = /^sb_publishable_[\w-]{20,}$/.test(key);
  const jwtParts = key.split(".");
  let isLegacyAnonKey = false;
  if (jwtParts.length === 3) {
    try {
      const claims = JSON.parse(Buffer.from(jwtParts[1], "base64url").toString("utf8")) as { role?: unknown };
      isLegacyAnonKey = claims.role === "anon";
    } catch {
      isLegacyAnonKey = false;
    }
  }
  if (!isPublishableKey && !isLegacyAnonKey) {
    throw new Error("Use a Supabase publishable key or legacy anon key, never a secret/service-role key.");
  }

  return { url: parsedUrl.origin, publishableKey: key };
}

export function getSiteUrl(): URL {
  const value = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid absolute URL.");
  }

  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
  ) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.");
  }
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an origin without credentials, path, query, or fragment.");
  }

  return url;
}