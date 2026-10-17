import { getAuthenticatedUser } from "@/lib/auth/user";
import { parseResumeUpload } from "@/lib/resume/import";
import { ResumeImportError, MAX_RESUME_FILE_BYTES } from "@/lib/resume/file-validation";
import { hasOversizedContentLength, isSameOriginRequest } from "@/lib/resume/request-security";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return json({ error: "This request could not be verified." }, 403);
  if (hasOversizedContentLength(request, MAX_RESUME_FILE_BYTES + 256 * 1024)) {
    return json({ error: "Resume files must be 10 MB or smaller." }, 413);
  }

  let user;
  try {
    user = await getAuthenticatedUser();
  } catch {
    return json({ error: "Resume import is not configured. Check the Supabase setup." }, 503);
  }
  if (!user) return json({ error: "Sign in to import a resume." }, 401);

  try {
    const form = await request.formData();
    const upload = form.get("file");
    if (!(upload instanceof File)) return json({ error: "Choose a PDF or DOCX file." }, 400);
    if (upload.size > MAX_RESUME_FILE_BYTES) return json({ error: "Resume files must be 10 MB or smaller." }, 413);

    const result = await parseResumeUpload({
      name: upload.name,
      type: upload.type,
      declaredSize: upload.size,
      bytes: new Uint8Array(await upload.arrayBuffer()),
    });
    return json({ data: result });
  } catch (error) {
    if (error instanceof ResumeImportError) {
      const status = error.code === "file_too_large" ? 413 : error.code === "unsupported_type" ? 415 : 422;
      return json({ error: error.message, code: error.code }, status);
    }
    return json({ error: "This document could not be processed. Try another PDF or DOCX file." }, 400);
  }
}