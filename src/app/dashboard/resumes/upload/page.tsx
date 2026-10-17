import Link from "next/link";
import { ResumeImportFlow } from "@/components/resume-import-flow";

export default function UploadResumePage() {
  return (
    <main>
      <div className="workspace-heading">
        <div><span className="eyebrow">Resume import</span><h1>Bring an existing resume.</h1><p>We extract readable text, keep uncertain sections for review, and save only after you confirm.</p></div>
        <Link className="button button-outline" href="/dashboard/resumes">Back to resumes</Link>
      </div>
      <ResumeImportFlow />
    </main>
  );
}