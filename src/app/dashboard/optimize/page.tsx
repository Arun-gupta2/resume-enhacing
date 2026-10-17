import Link from "next/link";
import { JobDescriptionForm } from "@/components/job-description-form";
import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getJobDescriptions, getResumeList } from "@/lib/data/dashboard";

export default async function OptimizePage() {
  const user = await requireAuthenticatedUser();
  const [resumes, jobDescriptions] = await Promise.all([
    getResumeList(user.id),
    getJobDescriptions(user.id),
  ]);

  return (
    <main>
      <div className="workspace-heading"><div><span className="eyebrow">Role workspace</span><h1>Bring a role into focus.</h1><p>Analyze a saved resume against a job description, or upload one to get started.</p></div><Link className="button button-outline" href="/dashboard/resumes/upload">Upload a resume</Link></div>
      {resumes.length ? <div className="optimize-layout"><section className="workspace-panel"><h2>Save a job description</h2><JobDescriptionForm resumes={resumes} /></section><section className="saved-roles"><div className="workspace-section-heading"><div><h2>Saved roles</h2><p>Private to your account.</p></div></div>{jobDescriptions.length ? <ul>{jobDescriptions.map((role) => <li key={role.id}><span><strong>{role.title}</strong><small>{role.company || "Company not specified"}</small></span><time dateTime={role.created_at}>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(role.created_at))}</time></li>)}</ul> : <div className="analysis-empty"><span aria-hidden="true">↗</span><div><h3>No saved roles yet.</h3><p>Saved descriptions will appear here. Matching will be added in a later product stage.</p></div></div>}</section></div> : <div className="workspace-empty"><div><span className="empty-icon" aria-hidden="true">R</span><h2>Create a resume before adding a role.</h2><p>Your job descriptions are kept with the resume you plan to tailor.</p><Link className="button button-dark" href="/dashboard/resumes/new">Create resume</Link></div></div>}
    </main>
  );
}