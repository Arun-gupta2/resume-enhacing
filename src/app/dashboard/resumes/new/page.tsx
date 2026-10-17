import Link from "next/link";
import { NewResumeTypePicker } from "@/components/new-resume-type-picker";

export default function NewResumePage() {
  return (
    <main>
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Resume Creator</span>
          <h1>Create a new resume</h1>
          <p>Pick your preferred resume archetype, configure your target title, and jump right into the live editor.</p>
        </div>
        <Link className="button button-outline" href="/dashboard/resumes">
          Back to resumes
        </Link>
      </div>
      <section className="workspace-panel">
        <NewResumeTypePicker />
      </section>
    </main>
  );
}