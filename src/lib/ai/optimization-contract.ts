import { z } from "zod";
import type { ResumeData } from "@/lib/resume/schema";

const proposalSchema = z.object({
  id: z.string().min(1).max(80),
  target: z.discriminatedUnion("section", [
    z.object({ section: z.literal("summary"), experienceId: z.null(), bulletIndex: z.null() }),
    z.object({ section: z.literal("experienceBullet"), experienceId: z.string().min(1).max(64), bulletIndex: z.number().int().min(0).max(15) }),
  ]),
  original: z.string().max(3000),
  revised: z.string().min(1).max(3000),
  rationale: z.string().min(1).max(600),
  supportingEvidence: z.array(z.string().min(1).max(300)).min(1).max(4),
  requiresUserConfirmation: z.literal(true),
});

export const optimizationResponseSchema = z.object({
  proposals: z.array(proposalSchema).max(12),
  caveats: z.array(z.string().max(300)).max(8),
});

export type OptimizationResponse = z.infer<typeof optimizationResponseSchema>;
export type OptimizationProposal = z.infer<typeof proposalSchema>;

const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "by", "for", "from", "in", "into", "is", "it", "of", "on", "or", "the", "to", "with", "within", "across", "through", "using", "while", "that", "this", "their", "your", "our", "team", "work", "working", "experience", "including", "such", "than", "more", "less", "strong", "proven", "demonstrated", "focused", "skilled", "relevant", "role", "position", "opportunity", "professional", "responsible", "responsibilities", "candidate", "resume", "summary", "background", "contributed", "contribution", "results", "result", "successfully", "effectively", "various", "multiple", "several", "key", "new", "existing", "improved", "developed", "built", "created", "managed", "led", "support", "supported", "helped", "delivered", "designed", "implemented", "used", "use", "based", "aligned", "align", "demonstrates", "demonstrate", "ensure", "ensuring", "ability", "able", "can", "will", "may", "should", "has", "have", "had", "was", "were", "be", "been", "being", "they", "them", "who", "which", "what", "when", "where", "how", "also", "about", "after", "before", "during", "over", "under", "per", "each", "all", "both", "any", "one", "two", "first", "second", "previous", "current", "future", "clear", "concise", "specific", "accurate", "evidence", "skill", "skills", "requirement", "requirements", "qualification", "qualifications", "keyword", "keywords", "add", "added", "remove", "removed", "retain", "retained", "rewrite", "rewritten", "rather", "without", "not", "but", "because", "so", "if", "then", "very", "highly", "strongly", "respectively", "responsibly", "experienced", "career",
]);

function searchableResume(resume: ResumeData): string {
  return [
    resume.summary,
    ...resume.experience.flatMap((item) => [item.role, item.company, item.location, ...item.bullets]),
    ...resume.education.flatMap((item) => [item.school, item.degree, item.field, item.details]),
    ...resume.skills,
    ...resume.projects.flatMap((item) => [item.name, item.role, item.description]),
    ...resume.certifications.flatMap((item) => [item.name, item.issuer]),
    ...resume.additionalSections.flatMap((section) => [section.title, ...section.items]),
  ].filter(Boolean).join("\n");
}

function wordSet(text: string): Set<string> {
  return new Set(text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}+#.]+/gu) ?? []);
}

export function validateOptimizationOutput(value: unknown, resume: ResumeData): {
  success: true;
  response: OptimizationResponse;
  rejectedCount: number;
} | {
  success: false;
  message: string;
} {
  const parsed = optimizationResponseSchema.safeParse(value);
  if (!parsed.success) return { success: false, message: "The suggestion service returned an unexpected structure." };

  const corpus = searchableResume(resume);
  const normalizedCorpus = corpus.toLocaleLowerCase();
  const sourceWords = wordSet(corpus);
  const response = parsed.data;
  const acceptedTargets = new Set<string>();
  const acceptedIds = new Set<string>();
  const proposals = response.proposals.filter((proposal) => {
    if (acceptedIds.has(proposal.id)) return false;
    let targetText: string;
    const targetKey = proposal.target.section === "summary"
      ? "summary"
      : `bullet:${proposal.target.experienceId}:${proposal.target.bulletIndex}`;
    if (acceptedTargets.has(targetKey)) return false;
    if (proposal.target.section === "summary") {
      if (proposal.original !== resume.summary) return false;
      targetText = resume.summary;
    } else {
      const entry = resume.experience.find((item) => item.id === proposal.target.experienceId);
      const bullet = entry?.bullets[proposal.target.bulletIndex];
      if (typeof bullet !== "string" || proposal.original !== bullet) return false;
      targetText = bullet;
    }

    if (!proposal.supportingEvidence.every((snippet) => normalizedCorpus.includes(snippet.toLocaleLowerCase().trim()))) return false;
    if (!targetText.trim() && proposal.target.section !== "summary") return false;

    const originalNumbers = new Set(targetText.match(/\b\d[\d,.%+/-]*\b/g) ?? []);
    const evidenceNumbers = new Set(proposal.supportingEvidence.flatMap((snippet) => snippet.match(/\b\d[\d,.%+/-]*\b/g) ?? []));
    if ((proposal.revised.match(/\b\d[\d,.%+/-]*\b/g) ?? []).some((number) => !originalNumbers.has(number) && !evidenceNumbers.has(number))) return false;

    const newContentWords = [...wordSet(proposal.revised)].filter((word) => word.length > 2 && !stopWords.has(word) && !sourceWords.has(word));
    if (newContentWords.length > 0) return false;
    acceptedIds.add(proposal.id);
    acceptedTargets.add(targetKey);
    return true;
  });

  return { success: true, response: { ...response, proposals }, rejectedCount: response.proposals.length - proposals.length };
}