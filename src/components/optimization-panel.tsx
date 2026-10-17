"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { applyApprovedOptimizationAction, generateOptimizationProposalsAction } from "@/app/dashboard/analysis/actions";
import type { OptimizationResponse } from "@/lib/ai/optimization-contract";
import type { AtsReport } from "@/lib/ats/scoring";
import type { ResumeData } from "@/lib/resume/schema";
import styles from "@/app/dashboard/analysis/[analysisId]/analysis.module.css";

export function OptimizationPanel({
  analysisId,
  resumeData,
  report,
  initialProposals,
}: {
  analysisId: string;
  resumeData: ResumeData;
  report: AtsReport;
  initialProposals: OptimizationResponse;
}) {
  const router = useRouter();
  const [proposals, setProposals] = useState(initialProposals);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<"generate" | "apply" | null>(null);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  function generate() {
    setPending("generate");
    setMessage("");
    startTransition(async () => {
      const result = await generateOptimizationProposalsAction(analysisId);
      if (!result.ok) {
        setMessage(result.message);
        setMessageIsError(true);
      } else {
        setProposals({ proposals: result.value.proposals, caveats: result.value.caveats });
        setSelected([]);
        setMessage(
          result.value.proposals.length
            ? "Review each proposed change. None have been applied."
            : "No evidence-supported edits were proposed. No changes were made.",
        );
        setMessageIsError(false);
      }
      setPending(null);
    });
  }

  function applySelected() {
    if (!selected.length) return;
    setPending("apply");
    setMessage("");
    startTransition(async () => {
      const result = await applyApprovedOptimizationAction({ analysisId, proposalIds: selected });
      if (!result.ok) {
        setMessage(result.message);
        setMessageIsError(true);
        setPending(null);
        return;
      }
      router.push(`/dashboard/resumes/${result.value.resumeId}?variant=${result.value.variantId}`);
    });
  }

  const selectedSet = new Set(selected);

  return (
    <section className={styles.aiSection} aria-labelledby="optimization-heading">
      <div className={styles.sectionHeading}>
        <div>
          <span className="eyebrow">Optional AI review</span>
          <h2 id="optimization-heading">Suggestions you stay in control of.</h2>
        </div>
        <button className="button button-outline" disabled={pending !== null} onClick={generate} type="button">
          {pending === "generate" ? "Reviewing…" : proposals.proposals.length ? "Generate new suggestions" : "Request AI suggestions"}
        </button>
      </div>

      <p className={styles.aiDisclosure}>
        The deterministic score above did not use an LLM. If configured, this request sends only the resume summary, work roles and bullets, skills, job description, and unverified requirement labels. Contact details are excluded.
      </p>

      {message && <p className={messageIsError ? styles.aiError : styles.aiStatus} role={messageIsError ? "alert" : "status"}>{message}</p>}
      {proposals.caveats.map((caveat, index) => (
        <p className={styles.aiCaveat} key={`${caveat}-${index}`}>{caveat}</p>
      ))}

      {proposals.proposals.length > 0 && (
        <>
          <div className={styles.proposalHeader}>
            <h3>Proposed edits</h3>
            <span>{selected.length} selected</span>
          </div>

          <ul className={styles.proposalList}>
            {proposals.proposals.map((proposal) => {
              const checked = selectedSet.has(proposal.id);
              return (
                <li key={proposal.id}>
                  <label className={styles.proposalSelect}>
                    <input
                      checked={checked}
                      onChange={(event) => {
                        setSelected((current) =>
                          event.target.checked ? [...current, proposal.id] : current.filter((id) => id !== proposal.id),
                        );
                      }}
                      type="checkbox"
                    />
                    <span>{checked ? "Include in new copy" : "Review this edit"}</span>
                  </label>

                  <div className={styles.beforeAfter}>
                    <div>
                      <span>Before</span>
                      <p>{proposal.original || "No summary yet"}</p>
                    </div>
                    <div>
                      <span>Suggested</span>
                      <p>{proposal.revised}</p>
                    </div>
                  </div>

                  <p className={styles.proposalRationale}>{proposal.rationale}</p>

                  <div className={styles.proposalEvidence}>
                    <strong>Resume evidence</strong>
                    {proposal.supportingEvidence.map((evidence) => (
                      <blockquote key={evidence}>{evidence}</blockquote>
                    ))}
                  </div>

                  <p className={styles.confirmationNote}>Requires your review and confirmation. This suggestion will only be written to a new version.</p>
                </li>
              );
            })}
          </ul>

          <button className="button button-dark" disabled={!selected.length || pending !== null} onClick={applySelected} type="button">
            {pending === "apply" ? "Creating version…" : `Apply ${selected.length || "selected"} edit${selected.length === 1 ? "" : "s"} to a new version`}
          </button>
        </>
      )}

      {!proposals.proposals.length && !message && (
        <p className={styles.aiStatus}>AI suggestions are optional. Your deterministic ATS analysis is complete and saved without a model call.</p>
      )}

      <span className={styles.visuallyHidden} aria-live="polite">
        Resume has {resumeData.experience.length} experience entries and {report.missingTerms.length} unverified requirements.
      </span>
    </section>
  );
}
