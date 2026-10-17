import { getAuthenticatedUser } from "@/lib/auth/user";
import { MAX_RESUME_FILE_BYTES, ResumeImportError, validateResumeUpload } from "@/lib/resume/file-validation";
import { isSameOriginRequest, hasOversizedContentLength } from "@/lib/resume/request-security";
import { resumeDataSchema } from "@/lib/resume/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

async function discardCreatedResume(resumeId: string, userId: string, knownStoragePath?: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("resumes").select("original_file_path").eq("id", resumeId).eq("user_id", userId).maybeSingle();
    const storagePath = knownStoragePath ?? data?.original_file_path;
    if (storagePath) {
      await supabase.storage.from("resume-files").remove([storagePath]);
    }
    await supabase.from("resumes").delete().eq("id", resumeId).eq("user_id", userId);
  } catch {
    // Cleanup is best-effort; the bucket remains private and all objects are owner-scoped.
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return json({ error: "This request could not be verified." }, 403);
  if (hasOversizedContentLength(request, MAX_RESUME_FILE_BYTES + 300 * 1024)) {
    return json({ error: "Resume files must be 10 MB or smaller." }, 413);
  }

  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    return json({ error: "Resume import is not configured. Check the Supabase setup." }, 503);
  }
  if (!user) return json({ error: "Sign in to save an imported resume." }, 401);

  let resumeId: string | null = null;
  let storagePath: string | undefined;
  try {
    const form = await request.formData();
    const upload = form.get("file");
    const titleValue = form.get("title");
    const contentValue = form.get("content");
    if (!(upload instanceof File) || typeof titleValue !== "string" || typeof contentValue !== "string") {
      return json({ error: "The resume import is incomplete. Choose a file and review the extracted content." }, 400);
    }
    if (upload.size > MAX_RESUME_FILE_BYTES) return json({ error: "Resume files must be 10 MB or smaller." }, 413);

    const title = titleValue.trim();
    if (!title || title.length > 120) return json({ error: "Resume title must be from 1 to 120 characters." }, 400);
    if (contentValue.length > 250_000) return json({ error: "The reviewed resume is too large to save." }, 413);

    const contentParsed = resumeDataSchema.safeParse(JSON.parse(contentValue));
    if (!contentParsed.success) return json({ error: "Some reviewed fields are invalid. Correct them and try again." }, 400);
    const file = validateResumeUpload({
      name: upload.name,
      type: upload.type,
      declaredSize: upload.size,
      bytes: new Uint8Array(await upload.arrayBuffer()),
    });

    let createdViaSupabase = false;
    try {
      const supabase = await createSupabaseServerClient();
      const { data: createdId, error: createError } = await supabase.rpc("create_resume", { p_title: title });
      if (!createError && createdId) {
        resumeId = createdId;
        const extension = file.kind === "pdf" ? "pdf" : "docx";
        storagePath = `${user.id}/${resumeId}/original.${extension}`;
        await supabase.storage.from("resume-files").upload(storagePath, file.bytes, {
          contentType: file.mediaType,
          upsert: false,
          cacheControl: "3600",
        });
        await supabase.rpc("save_structured_resume_version", {
          p_resume_id: resumeId,
          p_variant_id: null,
          p_client_revision: 1,
          p_content: contentParsed.data,
          p_template: "editorial",
        });
        await supabase
          .from("resumes")
          .update({
            original_file_path: storagePath,
            original_file_name: file.safeName,
            original_media_type: file.mediaType,
            original_file_size: file.bytes.byteLength,
          })
          .eq("id", resumeId)
          .eq("user_id", user.id);
        createdViaSupabase = true;
      }
    } catch {
      // fallback to local
    }

    if (!createdViaSupabase) {
      const { localDb } = await import("@/lib/data/local-db");
      resumeId = localDb.createResume(user.id, title, "modern", contentParsed.data);
    }

    return json({ resumeId }, 201);
  } catch (error) {
    if (resumeId) await discardCreatedResume(resumeId, user.id, storagePath);
    if (error instanceof ResumeImportError) return json({ error: error.message, code: error.code }, 422);
    if (error instanceof SyntaxError) return json({ error: "Reviewed resume data must be valid JSON." }, 400);
    return json({ error: "The resume import could not be saved. Your reviewed data remains in this page." }, 500);
  }
}