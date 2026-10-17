"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/user";
import { applyApprovedProposals } from "@/lib/ai/apply-proposals";
import { getOptimizationProvider, OptimizationError } from "@/lib/ai/optimization";
import { optimizationResponseSchema } from "@/lib/ai/optimization-contract";
import { atsReportSchema } from "@/lib/ats/schema";
import { normalizeResumeData } from "@/lib/resume/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localDb } from "@/lib/data/local-db";

type ActionResult<T> = { ok: true; value: T } | { ok: false; message: string };

export type GenerateProposalsResult = ActionResult<{
  proposals: z.infer<typeof optimizationResponseSchema>["proposals"];
  caveats: string[];
}>;

export async function generateOptimizationProposalsAction(analysisId: string): Promise<GenerateProposalsResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { ok: false, message: "Sign in again before requesting suggestions." };
  if (!z.string().uuid().safeParse(analysisId).success) return { ok: false, message: "This analysis reference is invalid." };

  const provider = getOptimizationProvider();

  // Try loading from local or supabase
  let resumeData: ReturnType<typeof normalizeResumeData> | null = null;
  let jobData: { title: string; company: string | null; description: string } | null = null;
  let reportData: z.infer<typeof atsReportSchema> | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: analysis } = await supabase
      .from("analysis_results")
      .select("id,resume_id,resume_version_id,job_description_id,ats_report")
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (analysis) {
      const [versionResult, jobResult] = await Promise.all([
        supabase.from("resume_versions").select("content").eq("id", analysis.resume_version_id).eq("resume_id", analysis.resume_id).eq("user_id", user.id).maybeSingle(),
        supabase.from("job_descriptions").select("title,company,description").eq("id", analysis.job_description_id).eq("resume_id", analysis.resume_id).eq("user_id", user.id).maybeSingle(),
      ]);

      if (versionResult.data && jobResult.data) {
        const parsedReport = atsReportSchema.safeParse(analysis.ats_report);
        if (parsedReport.success) {
          resumeData = normalizeResumeData(versionResult.data.content);
          jobData = jobResult.data;
          reportData = parsedReport.data;
        }
      }
    }
  } catch {
    // fallback
  }

  if (!resumeData || !jobData || !reportData) {
    const localAnalysis = localDb.getAnalysis(user.id, analysisId);
    if (!localAnalysis) return { ok: false, message: "This analysis is not available in your workspace." };
    resumeData = normalizeResumeData(localAnalysis.resumeData);
    jobData = localAnalysis.jobDescription;
    reportData = localAnalysis.report;
  }

  try {
    const proposalSet = await provider.proposeEdits({ resume: resumeData, job: jobData, report: reportData });
    const validated = optimizationResponseSchema.safeParse(proposalSet);
    if (!validated.success) return { ok: false, message: "Suggestions failed validation and were not saved." };

    try {
      const supabase = await createSupabaseServerClient();
      await supabase
        .from("analysis_results")
        .update({ optimization_proposals: validated.data })
        .eq("id", analysisId)
        .eq("user_id", user.id);
    } catch {
      // local fallback
    }

    localDb.updateAnalysisProposals(user.id, analysisId, validated.data);

    revalidatePath(`/dashboard/analysis/${analysisId}`);
    return { ok: true, value: validated.data };
  } catch (error) {
    if (error instanceof OptimizationError) return { ok: false, message: error.message };
    return { ok: false, message: "Suggestions are temporarily unavailable. The deterministic analysis remains available." };
  }
}

const applyInputSchema = z.object({
  analysisId: z.string().uuid(),
  proposalIds: z.array(z.string().min(1).max(80)).min(1).max(12),
}).refine((input) => new Set(input.proposalIds).size === input.proposalIds.length, "Duplicate proposal selection.");

export type ApplyProposalsResult = ActionResult<{ resumeId: string; variantId: string }>;

export async function applyApprovedOptimizationAction(input: unknown): Promise<ApplyProposalsResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { ok: false, message: "Sign in again before applying changes." };
  const parsedInput = applyInputSchema.safeParse(input);
  if (!parsedInput.success) return { ok: false, message: "Choose at least one valid proposed edit." };

  const analysis = localDb.getAnalysis(user.id, parsedInput.data.analysisId);
  if (!analysis) return { ok: false, message: "This analysis is not available in your workspace." };

  const proposalSet = optimizationResponseSchema.safeParse(analysis.proposals);
  if (!proposalSet.success) return { ok: false, message: "Saved suggestions could not be validated." };
  const selected = proposalSet.data.proposals.filter((proposal) => parsedInput.data.proposalIds.includes(proposal.id));
  if (selected.length !== parsedInput.data.proposalIds.length || selected.some((proposal) => !proposal.requiresUserConfirmation)) {
    return { ok: false, message: "One or more selected suggestions are no longer valid." };
  }

  const source = normalizeResumeData(analysis.resumeData);
  const updated = applyApprovedProposals(source, selected);
  if (!updated) return { ok: false, message: "A selected edit no longer matches the analyzed version. Nothing was applied." };

  const variantName = `Optimized - ${analysis.jobDescription.title}`.slice(0, 120);

  let variantId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: createdVariantId, error: variantError } = await supabase.rpc("create_resume_variant", {
      p_resume_id: analysis.resume.id,
      p_job_description_id: analysis.jobDescription.id,
      p_name: variantName,
    });

    if (!variantError && createdVariantId) {
      variantId = createdVariantId;
      await supabase.rpc("save_structured_resume_version", {
        p_resume_id: analysis.resume.id,
        p_variant_id: variantId,
        p_client_revision: 1,
        p_content: updated,
        p_template: "modern",
      });
    }
  } catch {
    // fallback
  }

  if (!variantId) {
    variantId = localDb.createVariant(user.id, analysis.resume.id, analysis.jobDescription.id, variantName);
    if (!variantId) return { ok: false, message: "Could not create optimized version." };

    localDb.saveStructuredResumeVersion({
      resumeId: analysis.resume.id,
      variantId,
      clientRevision: 1,
      content: updated,
      template: "modern",
      userId: user.id,
    });
  }

  revalidatePath(`/dashboard/resumes/${analysis.resume.id}`);
  revalidatePath("/dashboard");
  return { ok: true, value: { resumeId: analysis.resume.id, variantId } };
}