"use client";

import { useState, useActionState } from "react";
import { analyzeJobDescriptionAction, type DashboardActionState } from "@/app/dashboard/actions";
import type { ResumeSummary } from "@/lib/data/dashboard";
import { FormSubmitButton } from "@/components/form-submit-button";

const emptyState: DashboardActionState = {};

const SAMPLE_ROLES = [
  {
    label: "Lead Full Stack Engineer (Stripe)",
    title: "Lead Full Stack Engineer",
    company: "Stripe",
    description: `We are looking for a Lead Full Stack Engineer to help build the future of global internet commerce.

About the Role:
You will design and build scalable services, high-performance web applications, and developer-facing APIs. You will work across the entire stack using TypeScript, React, Next.js, and Node.js.

Requirements:
- 5+ years of software engineering experience building production web applications.
- Strong proficiency in TypeScript, React, Next.js, and modern JavaScript.
- Backend experience with Node.js, PostgreSQL, Redis, and distributed systems.
- Proven experience with cloud infrastructure (AWS or GCP) and Docker containerization.
- Solid track record of system design, performance optimization, and architectural decision-making.
- Strong leadership and mentorship abilities for guiding junior engineers.`,
  },
  {
    label: "Senior Frontend Engineer (Linear / Figma)",
    title: "Senior Frontend Engineer",
    company: "Linear",
    description: `We are looking for a craft-obsessed Senior Frontend Engineer to build fluid, high-performance user interfaces.

Requirements:
- 4+ years of professional frontend engineering experience.
- Deep expertise in React, TypeScript, HTML5, modern CSS, and state management.
- Passion for 60fps animations, keyboard navigation, and web accessibility (a11y).
- Experience optimizing Core Web Vitals (LCP, INP) and client-side rendering performance.
- Familiarity with Next.js, WebSockets, and real-time collaborative state sync.`,
  },
  {
    label: "Staff DevOps & Cloud Platform Engineer",
    title: "Staff Cloud Platform Engineer",
    company: "Datadog",
    description: `Looking for an experienced Cloud Infrastructure and DevOps Engineer to scale our global platforms.

Requirements:
- 6+ years managing large-scale cloud infrastructure on AWS or Google Cloud Platform.
- Hands-on expertise with Kubernetes, Docker, Terraform, and Infrastructure as Code.
- Proficient in CI/CD pipelines (GitHub Actions, GitLab CI), automated testing, and zero-downtime deployments.
- Strong automation scripting in Python, Bash, or Go.
- Experience with monitoring and observability stacks (Prometheus, Grafana, Datadog).`,
  },
];

export function JobDescriptionForm({ resumes }: { resumes: ResumeSummary[] }) {
  const [selectedResume, setSelectedResume] = useState<string>(resumes[0]?.id || "");
  const [title, setTitle] = useState("Lead Full Stack Engineer");
  const [company, setCompany] = useState("Stripe");
  const [description, setDescription] = useState(SAMPLE_ROLES[0].description);
  const [state, action] = useActionState(analyzeJobDescriptionAction, emptyState);

  function applySample(sample: typeof SAMPLE_ROLES[number]) {
    setTitle(sample.title);
    setCompany(sample.company);
    setDescription(sample.description);
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setDescription(text);
        if (!title || title === "Lead Full Stack Engineer") {
          const firstLine = text.split("\n")[0]?.replace(/^[#\s]+/, "").trim();
          if (firstLine && firstLine.length < 80) setTitle(firstLine);
        }
      }
    };
    reader.readAsText(file);
  }

  return (
    <form className="workspace-form" action={action}>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
        <span style={{ fontSize: "11px", fontWeight: 650, color: "var(--green)" }}>Quick-fill sample job descriptions:</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {SAMPLE_ROLES.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => applySample(sample)}
              style={{
                fontSize: "11px",
                padding: "4px 9px",
                borderRadius: "14px",
                border: "1px solid #c9d8c6",
                background: "#f4f7f2",
                color: "#204630",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              + {sample.label}
            </button>
          ))}
        </div>
      </div>

      <label htmlFor="role-resume">Resume to evaluate</label>
      <select
        id="role-resume"
        name="resumeId"
        required
        value={selectedResume}
        onChange={(e) => setSelectedResume(e.target.value)}
      >
        <option disabled value="">Choose a resume</option>
        {resumes.map((resume) => (
          <option key={resume.id} value={resume.id}>
            {resume.title}
          </option>
        ))}
      </select>

      <label htmlFor="role-title">Target Role Title</label>
      <input
        id="role-title"
        name="title"
        required
        maxLength={160}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Senior Software Engineer"
      />

      <label htmlFor="role-company">Company <span>Optional</span></label>
      <input
        id="role-company"
        name="company"
        maxLength={160}
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder="e.g. Stripe, Airbnb, Google"
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label htmlFor="role-description">Job description text</label>
        <label
          htmlFor="jd-file-input"
          style={{
            cursor: "pointer",
            fontSize: "11px",
            color: "var(--green)",
            textDecoration: "underline",
            fontWeight: 600,
          }}
        >
          📂 Upload .txt file
          <input
            id="jd-file-input"
            type="file"
            accept=".txt,.md"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </label>
      </div>

      <textarea
        id="role-description"
        name="description"
        required
        minLength={20}
        maxLength={30_000}
        rows={10}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Paste full job description, role requirements, qualifications, and responsibilities..."
      />

      {state.error && <p className="action-feedback error" role="alert">{state.error}</p>}
      {state.success && <p className="action-feedback success" role="status">{state.success}</p>}

      <FormSubmitButton pendingLabel="Calculating ATS Compatibility…">
        Calculate ATS Score & Optimize Resume →
      </FormSubmitButton>

      <p className="field-hint">
        Evaluates keyword alignment, experience signals, hard and soft qualifications, and generates evidence-supported optimization suggestions.
      </p>
    </form>
  );
}