import "server-only";

import type { ResumeStatus } from "@/lib/supabase/database.types";
import { atsReportSchema } from "@/lib/ats/schema";
import { optimizationResponseSchema } from "@/lib/ai/optimization-contract";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { localDb } from "@/lib/data/local-db";
import { normalizeResumeData, type ResumeData, type ResumeTemplate } from "@/lib/resume/schema";

export type ResumeSummary = {
  id: string;
  title: string;
  status: ResumeStatus;
  updatedAt: string;
};

export type AnalysisSummary = {
  id: string;
  score: number | null;
  createdAt: string;
  resumeTitle: string | null;
  jobTitle: string | null;
};

export async function getResumeList(userId: string, query = ""): Promise<ResumeSummary[]> {
  try {
    const supabase = await createSupabaseServerClient();
    let request = supabase
      .from("resumes")
      .select("id,title,status,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100);

    const search = query.trim().slice(0, 100);
    if (search) request = request.ilike("title", `%${search}%`);

    const { data, error } = await request;
    if (!error && data) {
      return data.map((resume) => ({
        id: resume.id,
        title: resume.title,
        status: resume.status,
        updatedAt: resume.updated_at,
      }));
    }
  } catch {
    // fallback to local db
  }

  const localResumes = localDb.listResumes(userId, query);
  return localResumes.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    updatedAt: r.updated_at,
  }));
}

export async function getDashboardOverview(userId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const [resumeResult, analysisResult] = await Promise.all([
      supabase
        .from("resumes")
        .select("id,title,status,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("analysis_results")
        .select("id,resume_id,job_description_id,score,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (!resumeResult.error && !analysisResult.error && resumeResult.data && analysisResult.data) {
      const analyses = analysisResult.data;
      const resumeIds = [...new Set(analyses.map((analysis) => analysis.resume_id))];
      const jobIds = [...new Set(analyses.map((analysis) => analysis.job_description_id))];
      const [relatedResumes, relatedJobs] = await Promise.all([
        resumeIds.length
          ? supabase.from("resumes").select("id,title").eq("user_id", userId).in("id", resumeIds)
          : Promise.resolve({ data: [], error: null }),
        jobIds.length
          ? supabase.from("job_descriptions").select("id,title").eq("user_id", userId).in("id", jobIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const resumeTitles = new Map(relatedResumes.data?.map((resume) => [resume.id, resume.title]) ?? []);
      const jobTitles = new Map(relatedJobs.data?.map((job) => [job.id, job.title]) ?? []);

      return {
        resumes: resumeResult.data.map((resume) => ({
          id: resume.id,
          title: resume.title,
          status: resume.status,
          updatedAt: resume.updated_at,
        })),
        analyses: analyses.map((analysis) => ({
          id: analysis.id,
          score: analysis.score,
          createdAt: analysis.created_at,
          resumeTitle: resumeTitles.get(analysis.resume_id) ?? null,
          jobTitle: jobTitles.get(analysis.job_description_id) ?? null,
        } satisfies AnalysisSummary)),
      };
    }
  } catch {
    // fallback to local db
  }

  return localDb.getOverview(userId);
}

export async function getResumeForEditor(userId: string, resumeId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("resumes")
      .select("id,title,status,template,client_revision,current_version_id,updated_at")
      .eq("id", resumeId);

    if (userId && !userId.startsWith("00000000-")) {
      query = query.eq("user_id", userId);
    }

    const { data: resume, error } = await query.maybeSingle();
    if (!error && resume) return { ...resume, __source: "supabase" as const };
  } catch {
    // fallback
  }

  const localResume = localDb.getResume(userId, resumeId) || localDb.getResume(localDb.getDefaultUserId(), resumeId);
  return localResume ? { ...localResume, __source: "local" as const } : null;
}

export async function getResumeStudioData(userId: string, resumeId: string, variantId?: string) {
  try {
    const resume = await getResumeForEditor(userId, resumeId);
    if (!resume) return null;

    if (resume.__source === "local") {
      const localData = localDb.getStudioData(userId, resumeId, variantId) || localDb.getStudioData(localDb.getDefaultUserId(), resumeId, variantId);
      if (localData) return localData;
    }

    const supabase = await createSupabaseServerClient();
    let variantsQuery = supabase
      .from("resume_variants")
      .select("id,name,job_description_id,template,client_revision,current_version_id,updated_at")
      .eq("resume_id", resumeId)
      .order("updated_at", { ascending: false });

    let jobsQuery = supabase
      .from("job_descriptions")
      .select("id,title,company,created_at")
      .eq("resume_id", resumeId)
      .order("created_at", { ascending: false });

    if (userId && !userId.startsWith("00000000-")) {
      variantsQuery = variantsQuery.eq("user_id", userId);
      jobsQuery = jobsQuery.eq("user_id", userId);
    }

    const [variantsResult, jobsResult] = await Promise.all([variantsQuery, jobsQuery]);
    const variantsData = variantsResult.data ?? [];
    const jobsData = jobsResult.data ?? [];

    const selectedVariant = variantId
      ? variantsData.find((variant) => variant.id === variantId)
      : null;
    if (variantId && !selectedVariant) return null;

    const versionId = selectedVariant ? selectedVariant.current_version_id : resume.current_version_id;
    let content: Record<string, unknown> = {};
    if (versionId) {
      let versionQuery = supabase
        .from("resume_versions")
        .select("content")
        .eq("id", versionId)
        .eq("resume_id", resume.id);

      if (userId && !userId.startsWith("00000000-")) {
        versionQuery = versionQuery.eq("user_id", userId);
      }

      const { data: version } = await versionQuery.maybeSingle();

      if (version?.content && typeof version.content === "object" && !Array.isArray(version.content)) {
        content = version.content;
      }
    }

    return {
      resume,
      content,
      template: (selectedVariant?.template ?? resume.template ?? "modern") as ResumeTemplate,
      clientRevision: selectedVariant?.client_revision ?? resume.client_revision ?? 1,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      variants: variantsData.map(({ id, name, job_description_id: jobDescriptionId }) => ({ id, name, jobDescriptionId })),
      jobDescriptions: jobsData,
    };
  } catch {
    // fallback to local db
  }

  return localDb.getStudioData(userId, resumeId, variantId) || localDb.getStudioData(localDb.getDefaultUserId(), resumeId, variantId);
}

export async function getJobDescriptions(userId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("job_descriptions")
      .select("id,title,company,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) return data;
  } catch {
    // fallback
  }

  return localDb.listJobDescriptions(userId);
}

export async function getAnalysisResult(userId: string, analysisId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: analysis, error } = await supabase
      .from("analysis_results")
      .select("id,resume_id,resume_version_id,resume_variant_id,job_description_id,score,ats_report,optimization_proposals,created_at")
      .eq("id", analysisId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && analysis) {
      const [resumeResult, versionResult, jobResult] = await Promise.all([
        supabase.from("resumes").select("id,title").eq("id", analysis.resume_id).eq("user_id", userId).maybeSingle(),
        supabase.from("resume_versions").select("content,version_number").eq("id", analysis.resume_version_id).eq("resume_id", analysis.resume_id).eq("user_id", userId).maybeSingle(),
        supabase.from("job_descriptions").select("id,title,company,description").eq("id", analysis.job_description_id).eq("resume_id", analysis.resume_id).eq("user_id", userId).maybeSingle(),
      ]);

      if (resumeResult.data && versionResult.data && jobResult.data) {
        const report = atsReportSchema.safeParse(analysis.ats_report);
        const proposals = optimizationResponseSchema.safeParse(analysis.optimization_proposals);

        let variantName: string | null = null;
        if (analysis.resume_variant_id) {
          const { data: variant } = await supabase
            .from("resume_variants")
            .select("name")
            .eq("id", analysis.resume_variant_id)
            .eq("resume_id", analysis.resume_id)
            .eq("user_id", userId)
            .maybeSingle();
          variantName = variant?.name ?? null;
        }

        if (report.success) {
          return {
            id: analysis.id,
            createdAt: analysis.created_at,
            score: analysis.score,
            resume: resumeResult.data,
            versionNumber: versionResult.data.version_number,
            resumeVariantId: analysis.resume_variant_id,
            variantName,
            resumeData: versionResult.data.content,
            jobDescription: jobResult.data,
            report: report.data,
            proposals: proposals.success ? proposals.data : { proposals: [], caveats: [] },
          };
        }
      }
    }
  } catch {
    // fallback
  }

  return localDb.getAnalysis(userId, analysisId);
}