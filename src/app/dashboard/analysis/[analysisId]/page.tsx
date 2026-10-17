import Link from "next/link";
import { notFound } from "next/navigation";
import { normalizeResumeData } from "@/lib/resume/schema";
import { requireAuthenticatedUser } from "@/lib/auth/user";
import { getAnalysisResult } from "@/lib/data/dashboard";
import { OptimizationPanel } from "@/components/optimization-panel";
import styles from "./analysis.module.css";

type AnalysisPageProps = { params: Promise<{ analysisId: string }> };

const componentNames = {
  skills: "Skills and tools",
  qualifications: "Qualifications",
  experienceSignals: "Experience signals",
  documentStructure: "Document structure",
} as const;

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const user = await requireAuthenticatedUser();
  const { analysisId } = await params;
  const result = await getAnalysisResult(user.id, analysisId);
  if (!result) notFound();

  const versionLink = result.resumeVariantId
    ? `/dashboard/resumes/${result.resume.id}?variant=${result.resumeVariantId}`
    : `/dashboard/resumes/${result.resume.id}`;
  const resume = normalizeResumeData(result.resumeData);
  const components = Object.entries(result.report.components) as [keyof typeof componentNames, typeof result.report.components.skills][];

  return (
    <main className={styles.resultPage}>
      <div className="workspace-heading">
        <div><span className="eyebrow">Deterministic ATS estimate</span><h1>{result.jobDescription.title}</h1><p>{result.jobDescription.company || "Company not specified"} · {result.resume.title}{result.variantName ? ` · ${result.variantName}` : ""} · Version {result.versionNumber}</p></div>
        <div className={styles.headingActions}><Link className="button button-outline" href={versionLink}>View analyzed resume</Link><Link className="button button-text" href="/dashboard/optimize">Analyze another role <span aria-hidden="true">→</span></Link></div>
      </div>

      <section className={styles.scoreSection} aria-labelledby="overall-score-heading">
        <div className={styles.scoreMain}><span className={styles.scoreOverline}>Overall compatibility</span><div className={styles.scoreNumber} id="overall-score-heading">{result.report.overallScore}<span>/ 100</span></div><p>Based on visible text and structured resume fields.</p></div>
        <div className={styles.componentList}>{components.map(([key, component]) => <div className={styles.component} key={key}><div className={styles.componentTop}><h2>{componentNames[key]}</h2><span>{component.score === null ? "Not detected" : `${component.score}/100`}</span></div>{component.score !== null && <div className={styles.progressTrack} role="meter" aria-label={`${componentNames[key]} score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={component.score}><span style={{ width: `${component.score}%` }} /></div>}<p>{component.explanation}</p></div>)}</div>
      </section>

      <p className={styles.disclaimer}>{result.report.disclaimer} No protected traits are used.</p>

      <div className={styles.findingsGrid}>
        <section className={styles.findingsSection}>
          <div className={styles.sectionHeading}><h2>Matched evidence</h2><span>{result.report.matchedTerms.length}</span></div>
          {result.report.matchedTerms.length ? <ul className={styles.requirementList}>{result.report.matchedTerms.map((item) => <li key={item.id}><div className={styles.requirementTop}><strong>{item.label}</strong><span className={styles.priority}>{item.priority}</span></div><p className={styles.termSource}>Role: “{item.jobEvidence}”</p>{item.resumeEvidence.map((evidence) => <blockquote key={evidence}>{evidence}</blockquote>)}</li>)}</ul> : <p className={styles.emptyFinding}>No catalogued requirements could be matched from the visible resume text.</p>}
        </section>
        <section className={styles.findingsSection}>
          <div className={styles.sectionHeading}><h2>Missing or unverified</h2><span>{result.report.missingTerms.length}</span></div>
          {result.report.missingTerms.length ? <ul className={styles.requirementList}>{result.report.missingTerms.map((item) => <li key={item.id}><div className={styles.requirementTop}><strong>{item.label}</strong><span className={`${styles.priority} ${item.priority === "required" ? styles.required : ""}`}>{item.priority}</span></div><p className={styles.termSource}>Role: “{item.jobEvidence}”</p><p>{item.explanation}</p></li>)}</ul> : <p className={styles.emptyFinding}>No catalogued requirements were left unverified.</p>}
        </section>
      </div>

      <section className={styles.findingsSection}>
        <div className={styles.sectionHeading}><h2>Formatting and parsing risks</h2><span>{result.report.risks.length}</span></div>
        {result.report.risks.length ? <ul className={styles.riskList}>{result.report.risks.map((risk) => <li key={risk.id}><span className={`${styles.riskSeverity} ${styles[`severity-${risk.severity}`]}`}>{risk.severity}</span><div><strong>{risk.message}</strong><p>{risk.recommendation}</p></div></li>)}</ul> : <p className={styles.emptyFinding}>No structure issues were detected in the provided fields. This is not a guarantee of how another system will parse a document.</p>}
      </section>

      <section className={styles.findingsSection}>
        <div className={styles.sectionHeading}><h2>Next improvements</h2></div>
        {result.report.recommendations.length ? <ol className={styles.recommendationList}>{result.report.recommendations.map((recommendation, index) => <li key={`${recommendation.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{recommendation.title}</strong><p>{recommendation.detail}</p></div></li>)}</ol> : <p className={styles.emptyFinding}>No recommendations were generated from the detected requirements.</p>}
      </section>

      <OptimizationPanel analysisId={result.id} resumeData={resume} report={result.report} initialProposals={result.proposals} />
    </main>
  );
}