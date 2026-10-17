import { getAuthenticatedUser } from "@/lib/auth/user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: RouteContext<"/api/resumes/[resumeId]/original">) {
  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    return Response.json({ error: "The file service is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!user) return Response.json({ error: "Sign in to download this file." }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const { resumeId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: resume, error } = await supabase
    .from("resumes")
    .select("original_file_path,original_file_name,original_media_type,original_file_size")
    .eq("id", resumeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !resume?.original_file_path || !resume.original_file_name || !resume.original_media_type) {
    return Response.json({ error: "This file is not available in your workspace." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  const { data: file, error: storageError } = await supabase.storage.from("resume-files").download(resume.original_file_path);
  if (storageError || !file) {
    return Response.json({ error: "The private file could not be downloaded." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  const safeName = resume.original_file_name.replace(/[\r\n"\\]/g, "_").slice(0, 180);
  return new Response(await file.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": resume.original_media_type,
      "Content-Length": String(resume.original_file_size ?? file.size),
      "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}