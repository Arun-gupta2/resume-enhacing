import Link from "next/link";
import { ResumeItem } from "@/components/resume-item";
import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getResumeList } from "@/lib/data/dashboard";

type ResumeListProps = { searchParams: Promise<{ query?: string | string[] }> };

export default async function ResumesPage({ searchParams }: ResumeListProps) {
  const user = await requireAuthenticatedUser();
  const params = await searchParams;
  const query = typeof params.query === "string" ? params.query.slice(0, 100) : "";
  const resumes = await getResumeList(user.id, query);

  return (
    <main>
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Your work</span>
          <h1>My resumes</h1>
          <p>Search, manage, rate, and optimize the resumes saved to your account.</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
      <form className="resume-search" action="/dashboard/resumes" role="search"><label className="visually-hidden" htmlFor="resume-search">Search resumes</label><input id="resume-search" name="query" maxLength={100} placeholder="Search by title" defaultValue={query} /><button className="button button-outline" type="submit">Search</button>{query && <Link className="button-text" href="/dashboard/resumes">Clear</Link>}</form>
      {resumes.length ? <div className="resume-list">{resumes.map((resume) => <ResumeItem key={resume.id} resume={resume} />)}</div> : query ? <div className="workspace-empty"><div><h2>No resumes match “{query}”.</h2><p>Try another title or clear your search.</p></div><Link className="button button-outline" href="/dashboard/resumes">Clear search</Link></div> : <div className="workspace-empty"><div><span className="empty-icon" aria-hidden="true">R</span><h2>Your workspace is ready for a first draft.</h2><p>Create a resume to begin. You can edit, rename, duplicate, and manage it here.</p><Link className="button button-dark" href="/dashboard/resumes/new">Create your first resume</Link></div></div>}
    </main>
  );
}