import Link from "next/link";
import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getDashboardOverview } from "@/lib/data/dashboard";

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();
  const { resumes, analyses } = await getDashboardOverview(user.id);
  const firstName = user.fullName?.split(/\s+/)[0] || "there";

  return (
    <main>
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Your workspace</span>
          <h1>Welcome, {firstName}.</h1>
          <p>Create, rate, and optimize your resumes against any job description.</p>
        </div>
        <div className="workspace-actions">
          <Link className="button button-dark" href="/dashboard/resumes/new">
            Create resume <span aria-hidden="true">+</span>
          </Link>
          <Link className="button button-outline" href="/dashboard/resumes/upload">
            Upload resume <span aria-hidden="true">📄</span>
          </Link>
          <Link className="button button-outline" href="/dashboard/optimize">
            Match job description <span aria-hidden="true">🎯</span>
          </Link>
        </div>
      </div>

      <section className="workspace-section">
        <div className="workspace-section-heading">
          <div>
            <h2>Your resumes</h2>
            <p>Edit, preview, rate, and duplicate your resumes.</p>
          </div>
          <Link className="button-text" href="/dashboard/resumes">
            All resumes <span aria-hidden="true">→</span>
          </Link>
        </div>
        {resumes.length ? (
          <div className="recent-resume-list">
            {resumes.map((resume) => (
              <Link className="recent-resume" href={`/dashboard/resumes/${resume.id}`} key={resume.id}>
                <span className="recent-resume-icon" aria-hidden="true">R</span>
                <span>
                  <strong>{resume.title}</strong>
                  <small>
                    Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(resume.updatedAt))}
                  </small>
                </span>
                <span className={`status-badge status-${resume.status}`}>{resume.status}</span>
                <span className="row-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="workspace-empty">
            <span className="empty-icon" aria-hidden="true">R</span>
            <div>
              <h3>Your first resume starts here.</h3>
              <p>Nothing in this space yet. Choose your preferred archetype or upload an existing file.</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Link className="button button-dark" href="/dashboard/resumes/new">Create from scratch</Link>
              <Link className="button button-outline" href="/dashboard/resumes/upload">Upload PDF</Link>
            </div>
          </div>
        )}
      </section>

      <section className="workspace-section">
        <div className="workspace-section-heading">
          <div>
            <h2>Recent ATS analyses & matches</h2>
            <p>Targeted evaluations comparing your resumes to job descriptions.</p>
          </div>
          <Link className="button-text" href="/dashboard/optimize">
            New evaluation <span aria-hidden="true">→</span>
          </Link>
        </div>
        {analyses.length ? (
          <div className="analysis-list">
            {analyses.map((analysis) => (
              <Link className="analysis-row" href={`/dashboard/analysis/${analysis.id}`} key={analysis.id}>
                <div>
                  <h3>{analysis.jobTitle || "Job description"}</h3>
                  <p>
                    {analysis.resumeTitle || "Resume"} ·{" "}
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(analysis.createdAt))}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="analysis-score" style={{ fontWeight: 700 }}>
                    {analysis.score === null ? "Evaluating" : `${analysis.score} / 100`}
                  </span>
                  <span className="row-arrow" aria-hidden="true">↗</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="analysis-empty">
            <span aria-hidden="true">🎯</span>
            <div>
              <h3>No role evaluations yet.</h3>
              <p>Compare any resume to a target job description to get instant ATS scores, keyword gaps, and AI optimization.</p>
            </div>
            <Link className="button button-outline" href="/dashboard/optimize">
              Match a job description
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}