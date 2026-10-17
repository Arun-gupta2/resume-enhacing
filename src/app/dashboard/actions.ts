"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth/user";
import { scoreResumeAgainstJob } from "@/lib/ats/scoring";
import { normalizeResumeData, type ResumeTemplate } from "@/lib/resume/schema";
import { resumeDataSchema, resumeTemplateSchema } from "@/lib/resume/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localDb } from "@/lib/data/local-db";

export type DashboardActionState = { error?: string; success?: string };

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function safeActionError(): DashboardActionState {
  return { error: "That change could not be saved. Refresh the page and try again." };
}

function validateTitle(title: string): boolean {
  return title.length > 0 && title.length <= 120;
}

export async function createResumeAction(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  const user = await requireAuthenticatedUser();
  const title = textField(formData, "title");
  const rawTemplate = textField(formData, "template");
  const templateParsed = resumeTemplateSchema.safeParse(rawTemplate);
  const template: ResumeTemplate = templateParsed.success ? templateParsed.data : "modern";

  if (!validateTitle(title)) return { error: "Give this resume a title of 1 to 120 characters." };

  let resumeId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("create_resume", { p_title: title });
    if (!error && data) {
      resumeId = data;
    }
  } catch {
    // fallback to local db
  }

  if (!resumeId) {
    resumeId = localDb.createResume(user.id, title, template);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/resumes");
  redirect(`/dashboard/resumes/${resumeId}`);
}

export async function renameResumeAction(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  const user = await requireAuthenticatedUser();
  const resumeId = textField(formData, "resumeId");
  const title = textField(formData, "title");
  if (!resumeId || !validateTitle(title)) return { error: "Enter a title from 1 to 120 characters." };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("resumes")
      .update({ title })
      .eq("id", resumeId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (!error && data) {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/resumes");
      return { success: "Resume renamed." };
    }
  } catch {
    // fallback
  }

  const ok = localDb.renameResume(user.id, resumeId, title);
  if (!ok) return safeActionError();

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/resumes");
  return { success: "Resume renamed." };
}

export async function updateResumeStatusAction(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  const user = await requireAuthenticatedUser();
  const resumeId = textField(formData, "resumeId");
  const status = textField(formData, "status");
  if (!resumeId || !["draft", "ready", "archived"].includes(status)) {
    return { error: "Choose a valid resume status." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("resumes")
      .update({ status: status as "draft" | "ready" | "archived" })
      .eq("id", resumeId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (!error && data) {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/resumes");
      return { success: "Status updated." };
    }
  } catch {
    // fallback
  }

  const ok = localDb.updateResumeStatus(user.id, resumeId, status as "draft" | "ready" | "archived");
  if (!ok) return safeActionError();

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/resumes");
  return { success: "Status updated." };
}

export async function duplicateResumeAction(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  const user = await requireAuthenticatedUser();
  const resumeId = textField(formData, "resumeId");
  const title = textField(formData, "title");
  if (!resumeId || !validateTitle(title)) return { error: "Enter a title from 1 to 120 characters." };

  let newId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("duplicate_resume", {
      p_resume_id: resumeId,
      p_title: title,
    });
    if (!error && data) {
      newId = data;
    }
  } catch {
    // fallback
  }

  if (!newId) {
    newId = localDb.duplicateResume(user.id, resumeId, title);
  }

  if (!newId) return safeActionError();

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/resumes");
  redirect(`/dashboard/resumes/${newId}`);
}

export async function deleteResumeAction(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  const user = await requireAuthenticatedUser();
  const resumeId = textField(formData, "resumeId");
  if (!resumeId) return safeActionError();

  try {
    const supabase = await createSupabaseServerClient();
    const { data: resume, error: lookupError } = await supabase
      .from("resumes")
      .select("original_file_path")
      .eq("id", resumeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lookupError && resume) {
      if (resume.original_file_path) {
        await supabase.storage.from("resume-files").remove([resume.original_file_path]);
      }
      const { data, error } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resumeId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (!error && data) {
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/resumes");
        return { success: "Resume deleted." };
      }
    }
  } catch {
    // fallback
  }

  const ok = localDb.deleteResume(user.id, resumeId);
  if (!ok) return safeActionError();

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/resumes");
  return { success: "Resume deleted." };
}

const structuredSaveSchema = z.object({
  resumeId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  clientRevision: z.number().int().positive().safe(),
  template: resumeTemplateSchema,
  content: resumeDataSchema,
});

export type StructuredSaveInput = z.input<typeof structuredSaveSchema>;
export type StructuredSaveResult =
  | { ok: true; savedVersionId: string }
  | { ok: false; code: "validation" | "conflict" | "save"; message: string };

export async function saveStructuredResumeAction(input: unknown): Promise<StructuredSaveResult> {
  const user = await requireAuthenticatedUser();
  const parsed = structuredSaveSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      code: "validation",
      message: `${issue.path.join(".") || "Resume"}: ${issue.message}`,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("save_structured_resume_version", {
      p_resume_id: parsed.data.resumeId,
      p_variant_id: parsed.data.variantId,
      p_client_revision: parsed.data.clientRevision,
      p_content: parsed.data.content,
      p_template: parsed.data.template,
    });

    if (error?.code === "40001") {
      return {
        ok: false,
        code: "conflict",
        message: "A newer edit exists in another tab. Reload the latest version before continuing.",
      };
    }
    if (!error && data) {
      revalidatePath(`/dashboard/resumes/${parsed.data.resumeId}`);
      revalidatePath("/dashboard");
      return { ok: true, savedVersionId: data };
    }
  } catch {
    // fallback to local
  }

  const result = localDb.saveStructuredResumeVersion({
    resumeId: parsed.data.resumeId,
    variantId: parsed.data.variantId,
    clientRevision: parsed.data.clientRevision,
    content: parsed.data.content,
    template: parsed.data.template,
    userId: user.id,
  });

  if (result.code === "conflict") {
    return {
      ok: false,
      code: "conflict",
      message: "A newer edit exists in another tab. Reload the latest version before continuing.",
    };
  }
  if (!result.ok || !result.savedVersionId) {
    return { ok: false, code: "save", message: "Autosave failed. Your changes are still here; retry when you are back online." };
  }

  revalidatePath(`/dashboard/resumes/${parsed.data.resumeId}`);
  revalidatePath("/dashboard");
  return { ok: true, savedVersionId: result.savedVersionId };
}

export async function createResumeVariantAction(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  const user = await requireAuthenticatedUser();
  const resumeId = textField(formData, "resumeId");
  const jobDescriptionId = textField(formData, "jobDescriptionId");
  const name = textField(formData, "name");
  if (!z.string().uuid().safeParse(resumeId).success) return { error: "Choose a valid resume." };
  if (!z.string().uuid().safeParse(jobDescriptionId).success) return { error: "Choose a saved job description." };
  if (!name || name.length > 120) return { error: "Variant name must be from 1 to 120 characters." };

  let variantId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("create_resume_variant", {
      p_resume_id: resumeId,
      p_job_description_id: jobDescriptionId,
      p_name: name,
    });
    if (!error && data) {
      variantId = data;
    }
  } catch {
    // fallback
  }

  if (!variantId) {
    variantId = localDb.createVariant(user.id, resumeId, jobDescriptionId, name);
  }

  if (!variantId) return { error: "A tailored version could not be created. Confirm the role is saved for this resume." };

  revalidatePath(`/dashboard/resumes/${resumeId}`);
  redirect(`/dashboard/resumes/${resumeId}?variant=${variantId}`);
}

export async function analyzeJobDescriptionAction(
  _previousState: DashboardActionState,
  formData: FormData,
): Promise<DashboardActionState> {
  const user = await requireAuthenticatedUser();
  const resumeId = textField(formData, "resumeId");
  const title = textField(formData, "title");
  const company = textField(formData, "company");
  const description = textField(formData, "description");

  if (!resumeId) return { error: "Choose a resume first." };
  if (!title || title.length > 160) return { error: "Role title must be from 1 to 160 characters." };
  if (company.length > 160) return { error: "Company name must be 160 characters or fewer." };
  if (description.length < 20 || description.length > 30_000) {
    return { error: "Job description must be from 20 to 30,000 characters." };
  }

  let resumeContent: ReturnType<typeof normalizeResumeData> | null = null;
  let versionId: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: ownedResume } = await supabase
      .from("resumes")
      .select("id,current_version_id")
      .eq("id", resumeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownedResume?.current_version_id) {
      const { data: version } = await supabase
        .from("resume_versions")
        .select("id,content")
        .eq("id", ownedResume.current_version_id)
        .eq("resume_id", ownedResume.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (version?.content) {
        resumeContent = normalizeResumeData(version.content);
        versionId = version.id;
      }
    }
  } catch {
    // fallback
  }

  if (!resumeContent || !versionId) {
    const localResume = localDb.getResume(user.id, resumeId);
    if (!localResume) return { error: "That resume is not available in your workspace." };
    const studio = localDb.getStudioData(user.id, resumeId);
    if (!studio) return { error: "Resume data could not be loaded." };
    resumeContent = studio.content;
    versionId = localResume.current_version_id || "v1";
  }

  const report = scoreResumeAgainstJob(resumeContent, description);

  let savedAnalysisId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: savedJob } = await supabase.from("job_descriptions").insert({
      user_id: user.id,
      resume_id: resumeId,
      title,
      company: company || null,
      description,
    }).select("id").single();

    if (savedJob) {
      const { data: analysis } = await supabase.from("analysis_results").insert({
        user_id: user.id,
        resume_id: resumeId,
        resume_version_id: versionId,
        resume_variant_id: null,
        job_description_id: savedJob.id,
        score: report.overallScore,
        matched_terms: report.matchedTerms,
        missing_terms: report.missingTerms,
        explanation: { disclaimer: report.disclaimer, components: report.components, risks: report.risks },
        ats_report: report,
      }).select("id").single();

      if (analysis) {
        savedAnalysisId = analysis.id;
      }
    }
  } catch {
    // fallback
  }

  if (!savedAnalysisId) {
    const job = localDb.saveJobDescription({
      userId: user.id,
      resumeId,
      title,
      company: company || null,
      description,
    });
    const analysis = localDb.saveAnalysis({
      userId: user.id,
      resumeId,
      resumeVersionId: versionId,
      resumeVariantId: null,
      jobDescriptionId: job.id,
      score: report.overallScore,
      matchedTerms: report.matchedTerms,
      missingTerms: report.missingTerms,
      explanation: { disclaimer: report.disclaimer, components: report.components, risks: report.risks },
      atsReport: report,
    });
    savedAnalysisId = analysis.id;
  }

  revalidatePath("/dashboard/optimize");
  revalidatePath("/dashboard");
  redirect(`/dashboard/analysis/${savedAnalysisId}`);
}

export async function signOutDashboardAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // local
  }
  revalidatePath("/dashboard");
  redirect("/login");
}