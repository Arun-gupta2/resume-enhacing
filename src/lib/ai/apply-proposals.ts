import { resumeDataSchema, type ResumeData } from "@/lib/resume/schema";
import type { OptimizationProposal } from "@/lib/ai/optimization-contract";

export function applyApprovedProposals(
  source: ResumeData,
  proposals: OptimizationProposal[],
): ResumeData | null {
  let next: ResumeData = {
    ...source,
    contact: { ...source.contact },
    experience: source.experience.map((entry) => ({ ...entry, bullets: [...entry.bullets] })),
  };

  for (const proposal of proposals) {
    if (!proposal.requiresUserConfirmation) return null;
    if (proposal.target.section === "summary") {
      if (next.summary !== proposal.original) return null;
      next = { ...next, summary: proposal.revised };
      continue;
    }

    const index = next.experience.findIndex((entry) => entry.id === proposal.target.experienceId);
    if (index < 0 || next.experience[index]!.bullets[proposal.target.bulletIndex] !== proposal.original) return null;
    next = {
      ...next,
      experience: next.experience.map((entry, currentIndex) => {
        if (currentIndex !== index) return entry;
        return {
          ...entry,
          bullets: entry.bullets.map((bullet, bulletIndex) => bulletIndex === proposal.target.bulletIndex ? proposal.revised : bullet),
        };
      }),
    };
  }

  const parsed = resumeDataSchema.safeParse(next);
  return parsed.success ? parsed.data : null;
}