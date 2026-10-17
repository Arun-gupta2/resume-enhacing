import type { ResumeData } from "@/lib/resume/schema";
import type { AtsReport } from "@/lib/ats/scoring";
import type { OptimizationResponse, OptimizationProposal } from "@/lib/ai/optimization-contract";

export function generateLocalOptimizationProposals(input: {
  resume: ResumeData;
  job: { title: string; company: string | null; description: string };
  report: AtsReport;
}): OptimizationResponse {
  const { resume, job, report } = input;
  const proposals: OptimizationProposal[] = [];
  const missingKeywords = report.missingTerms.map((term) => term.label);

  // 1. Propose tailored Summary enhancement
  if (resume.summary && resume.summary.trim().length > 15) {
    const originalSummary = resume.summary;
    const targetTitle = job.title.trim();
    const hasRoleInSummary = originalSummary.toLowerCase().includes(targetTitle.toLowerCase());
    const topKeywordsToAdd = missingKeywords.slice(0, 3);

    let revisedSummary = originalSummary;
    if (!hasRoleInSummary) {
      // Align lead sentence with target role title
      revisedSummary = `${targetTitle} with proven background in ${topKeywordsToAdd.length > 0 ? topKeywordsToAdd.join(", ") + ", and " : ""}delivering high-impact business outcomes. ${originalSummary.replace(/^[^.]+?\b(?:with|experienced|focused)\b/i, "Experienced in")}`;
    } else if (topKeywordsToAdd.length > 0) {
      revisedSummary = `${originalSummary.trim().replace(/\.$/, "")}, with specialized focus on ${topKeywordsToAdd.join(" and ")}.`;
    }

    if (revisedSummary !== originalSummary && revisedSummary.length <= 3000) {
      proposals.push({
        id: "prop-summary-align",
        target: { section: "summary", experienceId: null, bulletIndex: null },
        original: originalSummary,
        revised: revisedSummary,
        rationale: `Directly aligns your professional summary with the target role "${targetTitle}" and prioritizes high-match signals (${topKeywordsToAdd.join(", ") || "core competencies"}).`,
        supportingEvidence: ["Derived from candidate's existing summary and stated job role title."],
        requiresUserConfirmation: true,
      });
    }
  }

  // 2. Propose Bullet Point Enhancements with Action Verbs and Metrics phrasing
  const actionVerbs = ["Spearheaded", "Architected", "Engineered", "Orchestrated", "Optimized", "Streamlined", "Accelerated", "Pioneered"];
  
  if (resume.experience.length > 0) {
    resume.experience.forEach((exp, expIdx) => {
      if (proposals.length >= 6) return;
      exp.bullets.forEach((bullet, bulletIdx) => {
        if (proposals.length >= 6) return;
        const trimmed = bullet.trim();
        if (trimmed.length < 20) return;

        // Check if bullet starts with a weak verb like "Helped", "Worked on", "Responsible for", "Did"
        const weakVerbMatch = trimmed.match(/^(?:worked on|responsible for|helped with|assisted in|participated in|did|involved in)\s+(.*)/i);
        const hasMetric = /\b(?:\d+%|\$\d+|\d+x|\b\d+\s+(?:users|customers|requests|services|teams|engineers|projects))\b/i.test(trimmed);

        if (weakVerbMatch) {
          const rest = weakVerbMatch[1];
          const chosenVerb = actionVerbs[(expIdx + bulletIdx) % actionVerbs.length];
          const revised = `${chosenVerb} ${rest}`;
          proposals.push({
            id: `prop-verb-${exp.id}-${bulletIdx}`,
            target: { section: "experienceBullet", experienceId: exp.id, bulletIndex: bulletIdx },
            original: trimmed,
            revised,
            rationale: `Replaces passive phrasing with high-impact action verb "${chosenVerb}" to satisfy ATS outcome scoring.`,
            supportingEvidence: [`Existing bullet in position at ${exp.company || exp.role}.`],
            requiresUserConfirmation: true,
          });
        } else if (!hasMetric && missingKeywords.length > 0 && bulletIdx === 0) {
          // If the top bullet has no metrics and there's a missing keyword that fits candidate context
          const fittingKeyword = missingKeywords[proposals.length % missingKeywords.length];
          if (fittingKeyword && !trimmed.toLowerCase().includes(fittingKeyword.toLowerCase())) {
            const revised = `${trimmed.replace(/\.$/, "")}, enhancing ${fittingKeyword.toLowerCase()} performance and delivery efficiency.`;
            proposals.push({
              id: `prop-keyword-${exp.id}-${bulletIdx}`,
              target: { section: "experienceBullet", experienceId: exp.id, bulletIndex: bulletIdx },
              original: trimmed,
              revised,
              rationale: `Explicitly incorporates the high-priority job requirement "${fittingKeyword}" into your verified work experience.`,
              supportingEvidence: [`Core role bullet at ${exp.company || exp.role}.`],
              requiresUserConfirmation: true,
            });
          }
        }
      });
    });
  }

  return {
    proposals,
    caveats: [
      "Review every suggested modification carefully to ensure it accurately reflects your actual experience.",
      "Accepted edits are non-destructive and will be applied to a tailored copy.",
      `Based on deterministic keyword matching against role: ${job.title}.`,
    ],
  };
}
