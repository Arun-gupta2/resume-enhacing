import { notFound } from "next/navigation";
import { ResumeStudio } from "@/components/resume-studio";
import { GuardedLink } from "@/components/unsaved-changes";
import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getResumeStudioData } from "@/lib/data/dashboard";
import { normalizeResumeData, resumeTemplateSchema } from "@/lib/resume/schema";

type ResumeEditorProps = {
  params: Promise<{ resumeId: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
};

export default async function ResumeEditorPage({ params, searchParams }: ResumeEditorProps) {
  const user = await requireAuthenticatedUser();
  const [{ resumeId }, query] = await Promise.all([params, searchParams]);
  const variantId = typeof query.variant === "string" ? query.variant : undefined;
  const studio = await getResumeStudioData(user.id, resumeId, variantId);
  if (!studio) notFound();

  const data = normalizeResumeData(studio.content);
  const templateParsed = resumeTemplateSchema.safeParse(studio.template);
  const template = templateParsed.success ? templateParsed.data : "modern";

  return (
    <main>
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Resume studio · Autosaved</span>
          <h1>{studio.variantName ?? studio.resume.title}</h1>
          <p>Build your resume one section at a time. Your changes stay private to your account.</p>
        </div>
        <GuardedLink className="button button-outline" href="/dashboard/resumes">Back to resumes</GuardedLink>
      </div>
      <ResumeStudio
        key={`${resumeId}:${studio.variantId ?? "base"}`}
        resumeId={studio.resume.id}
        variantId={studio.variantId}
        variantName={studio.variantName}
        initialContent={data}
        initialTemplate={template}
        initialRevision={studio.clientRevision}
        variants={studio.variants}
        jobDescriptions={studio.jobDescriptions}
      />
    </main>
  );
}