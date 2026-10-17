import type { ResumeData } from "@/lib/resume/schema";

export const ATS_SCORING_WEIGHTS = {
  skills: 40,
  qualifications: 25,
  experienceSignals: 20,
  documentStructure: 15,
} as const;

export type RequirementPriority = "required" | "preferred" | "unspecified";
export type RequirementCategory = "skill" | "qualification" | "experience";

export type AtsRequirement = {
  id: string;
  label: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  matched: boolean;
  jobEvidence: string;
  resumeEvidence: string[];
  explanation: string;
};

export type AtsComponent = {
  score: number | null;
  weight: number;
  explanation: string;
};

export type AtsRisk = {
  id: string;
  severity: "low" | "medium" | "high";
  message: string;
  recommendation: string;
};

export type AtsReport = {
  version: 1;
  overallScore: number;
  components: {
    skills: AtsComponent;
    qualifications: AtsComponent;
    experienceSignals: AtsComponent;
    documentStructure: AtsComponent;
  };
  matchedTerms: AtsRequirement[];
  missingTerms: AtsRequirement[];
  risks: AtsRisk[];
  recommendations: { priority: number; title: string; detail: string }[];
  disclaimer: string;
};

type CatalogEntry = { id: string; label: string; aliases: string[] };

const skillCatalog: CatalogEntry[] = [
  { id: "javascript", label: "JavaScript", aliases: ["javascript", "ecmascript"] },
  { id: "typescript", label: "TypeScript", aliases: ["typescript"] },
  { id: "python", label: "Python", aliases: ["python"] },
  { id: "java", label: "Java", aliases: ["java"] },
  { id: "csharp", label: "C#", aliases: ["c#", "c sharp", "csharp"] },
  { id: "go", label: "Go", aliases: ["golang", "go language"] },
  { id: "react", label: "React", aliases: ["react.js", "reactjs", "react"] },
  { id: "nextjs", label: "Next.js", aliases: ["next.js", "nextjs"] },
  { id: "nodejs", label: "Node.js", aliases: ["node.js", "nodejs"] },
  { id: "sql", label: "SQL", aliases: ["sql"] },
  { id: "postgresql", label: "PostgreSQL", aliases: ["postgresql", "postgres"] },
  { id: "mysql", label: "MySQL", aliases: ["mysql"] },
  { id: "mongodb", label: "MongoDB", aliases: ["mongodb"] },
  { id: "aws", label: "AWS", aliases: ["aws", "amazon web services"] },
  { id: "azure", label: "Azure", aliases: ["azure", "microsoft azure"] },
  { id: "gcp", label: "Google Cloud", aliases: ["google cloud", "gcp"] },
  { id: "docker", label: "Docker", aliases: ["docker"] },
  { id: "kubernetes", label: "Kubernetes", aliases: ["kubernetes", "k8s"] },
  { id: "terraform", label: "Terraform", aliases: ["terraform"] },
  { id: "git", label: "Git", aliases: ["git"] },
  { id: "cicd", label: "CI/CD", aliases: ["ci/cd", "continuous integration", "continuous delivery"] },
  { id: "rest", label: "REST APIs", aliases: ["rest api", "restful api", "rest apis"] },
  { id: "graphql", label: "GraphQL", aliases: ["graphql"] },
  { id: "html", label: "HTML", aliases: ["html", "html5"] },
  { id: "css", label: "CSS", aliases: ["css", "css3"] },
  { id: "figma", label: "Figma", aliases: ["figma"] },
  { id: "design-systems", label: "Design systems", aliases: ["design system", "design systems"] },
  { id: "user-research", label: "User research", aliases: ["user research", "user interviews"] },
  { id: "usability-testing", label: "Usability testing", aliases: ["usability testing", "usability studies"] },
  { id: "product-strategy", label: "Product strategy", aliases: ["product strategy"] },
  { id: "roadmapping", label: "Roadmapping", aliases: ["roadmap", "roadmapping", "product roadmap"] },
  { id: "project-management", label: "Project management", aliases: ["project management"] },
  { id: "agile", label: "Agile", aliases: ["agile"] },
  { id: "scrum", label: "Scrum", aliases: ["scrum"] },
  { id: "salesforce", label: "Salesforce", aliases: ["salesforce"] },
  { id: "excel", label: "Excel", aliases: ["microsoft excel", "excel"] },
  { id: "tableau", label: "Tableau", aliases: ["tableau"] },
  { id: "power-bi", label: "Power BI", aliases: ["power bi"] },
  { id: "data-analysis", label: "Data analysis", aliases: ["data analysis", "data analytics"] },
  { id: "machine-learning", label: "Machine learning", aliases: ["machine learning", "ml"] },
  { id: "nlp", label: "Natural language processing", aliases: ["natural language processing", "nlp"] },
  { id: "pytorch", label: "PyTorch", aliases: ["pytorch"] },
  { id: "tensorflow", label: "TensorFlow", aliases: ["tensorflow"] },
  { id: "communication", label: "Communication", aliases: ["communication", "communicate"] },
  { id: "stakeholder-management", label: "Stakeholder management", aliases: ["stakeholder management", "stakeholders"] },
  { id: "financial-modeling", label: "Financial modeling", aliases: ["financial modeling", "financial modelling"] },
  { id: "seo", label: "SEO", aliases: ["seo", "search engine optimization"] },
  { id: "content-strategy", label: "Content strategy", aliases: ["content strategy"] },
  { id: "copywriting", label: "Copywriting", aliases: ["copywriting"] },
  { id: "customer-support", label: "Customer support", aliases: ["customer support", "customer service"] },
  { id: "account-management", label: "Account management", aliases: ["account management"] },
];

const experienceCatalog: CatalogEntry[] = [
  { id: "leadership", label: "Leadership", aliases: ["leadership", "led", "lead", "managed", "mentored", "coached"] },
  { id: "delivery", label: "Delivery", aliases: ["delivered", "launched", "implemented", "shipped", "deployed"] },
  { id: "analysis", label: "Analysis", aliases: ["analyzed", "analysed", "evaluated", "measured", "forecasted"] },
  { id: "improvement", label: "Improvement", aliases: ["improved", "increased", "reduced", "optimized", "optimised", "streamlined"] },
  { id: "collaboration", label: "Collaboration", aliases: ["collaborated", "partnered", "coordinated", "facilitated"] },
  { id: "ownership", label: "Ownership", aliases: ["owned", "spearheaded", "established", "built", "created"] },
];

const qualificationPatterns = [
  { id: "phd", label: "Doctoral degree", pattern: /\b(ph\.?d\.?|doctorate|doctoral degree)\b/i },
  { id: "masters", label: "Master's degree", pattern: /\b(master'?s|mba|ms|m\.s\.|ma|m\.a\.)\s*(degree)?\b/i },
  { id: "bachelors", label: "Bachelor's degree", pattern: /\b(bachelor'?s|b\.s\.|b\.a\.|bs|ba)\s*(degree)?\b/i },
  { id: "associate", label: "Associate degree", pattern: /\bassociate'?s?\s*(degree)?\b/i },
  { id: "certification", label: "Professional certification", pattern: /\b(certification|certified|professional certificate)\b/i },
  { id: "license", label: "Professional license", pattern: /\b(license|licensed|licensure)\b/i },
  { id: "years-experience", label: "Relevant years of experience", pattern: /\b(\d{1,2})\+?\s+years?(?:\s+of)?\s+(?:relevant\s+)?experience\b/i },
];

const requiredPattern = /\b(required|required qualification|must have|must be|minimum|at least|need to|needs to)\b/i;
const preferredPattern = /\b(preferred|preferably|nice to have|bonus|a plus|desirable)\b/i;
function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#./ -]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(text: string, term: string): boolean {
  const haystack = ` ${normalize(text)} `;
  const needle = normalize(term);
  if (!needle) return false;
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(needle)}(?:$|[^\\p{L}\\p{N}])`, "u").test(haystack);
}

function resumeCorpus(data: ResumeData): string[] {
  return [
    data.summary,
    ...data.experience.flatMap((entry) => [entry.role, ...entry.bullets]),
    ...data.education.flatMap((entry) => [entry.degree, entry.field, entry.details]),
    ...data.skills,
    ...data.projects.flatMap((entry) => [entry.role, entry.description]),
    ...data.certifications.map((entry) => `${entry.name} ${entry.issuer}`),
    ...data.additionalSections.flatMap((section) => section.items),
  ].filter((part) => part.trim().length > 0);
}

function priorityFor(source: string): RequirementPriority {
  if (requiredPattern.test(source)) return "required";
  if (preferredPattern.test(source)) return "preferred";
  return "unspecified";
}

function findResumeEvidence(corpus: string[], aliases: string[]): string[] {
  const hits: string[] = [];
  for (const line of corpus) {
    if (aliases.some((alias) => containsTerm(line, alias))) {
      const snippet = line.replace(/\s+/g, " ").trim().slice(0, 240);
      if (snippet && !hits.includes(snippet)) hits.push(snippet);
      if (hits.length === 2) break;
    }
  }
  return hits;
}

function extractCatalogRequirements(
  jobDescription: string,
  corpus: string[],
  catalog: CatalogEntry[],
  category: RequirementCategory,
): AtsRequirement[] {
  const sentences = jobDescription.split(/(?<=[.!?;])\s+|\n+/);
  const found = new Map<string, { entry: CatalogEntry; source: string }>();

  for (const entry of catalog) {
    const source = sentences.find((sentence) => entry.aliases.some((alias) => containsTerm(sentence, alias)));
    if (source) found.set(entry.id, { entry, source: source.trim() });
  }

  return [...found.values()].map(({ entry, source }) => {
    const resumeEvidence = findResumeEvidence(corpus, entry.aliases);
    const priority = priorityFor(source);
    return {
      id: `${category}:${entry.id}`,
      label: entry.label,
      category,
      priority,
      matched: resumeEvidence.length > 0,
      jobEvidence: source.slice(0, 280),
      resumeEvidence,
      explanation: resumeEvidence.length
        ? `Found explicit resume evidence for ${entry.label.toLowerCase()}.`
        : `No explicit resume evidence found for ${entry.label.toLowerCase()}; this is unverified, not proof of absence.`,
    };
  });
}

function extractQualifications(jobDescription: string, corpus: string[]): AtsRequirement[] {
  const sentences = jobDescription.split(/(?<=[.!?;])\s+|\n+/);
  const found = new Map<string, { label: string; source: string; aliases: string[] }>();

  for (const { id, label, pattern } of qualificationPatterns) {
    const source = sentences.find((sentence) => pattern.test(sentence));
    if (!source) continue;
    const match = source.match(pattern)?.[0] ?? label;
    found.set(id, { label: id === "years-experience" ? match : label, source: source.trim(), aliases: [match, label] });
  }

  return [...found.entries()].map(([id, item]) => {
    const resumeEvidence = findResumeEvidence(corpus, item.aliases);
    return {
      id: `qualification:${id}`,
      label: item.label,
      category: "qualification",
      priority: priorityFor(item.source),
      matched: resumeEvidence.length > 0,
      jobEvidence: item.source.slice(0, 280),
      resumeEvidence,
      explanation: resumeEvidence.length
        ? `Resume text contains evidence related to ${item.label.toLowerCase()}.`
        : `No explicit evidence found for ${item.label.toLowerCase()}; verify this requirement yourself.`,
    };
  });
}

function calculateCoverage(requirements: AtsRequirement[]): number | null {
  if (requirements.length === 0) return null;
  let available = 0;
  let earned = 0;
  for (const requirement of requirements) {
    const weight = requirement.priority === "required" ? 2 : requirement.priority === "preferred" ? 0.75 : 1;
    available += weight;
    if (requirement.matched) earned += weight;
  }
  return Math.round((earned / available) * 100);
}

function getStructureScore(data: ResumeData): { score: number; risks: AtsRisk[] } {
  let score = 100;
  const risks: AtsRisk[] = [];
  const addRisk = (risk: AtsRisk, deduction: number) => {
    score -= deduction;
    risks.push(risk);
  };

  if (!data.contact.fullName.trim()) addRisk({ id: "missing-name", severity: "medium", message: "No name is present in the resume contact section.", recommendation: "Add the name you use professionally." }, 10);
  if (!data.contact.email.trim()) addRisk({ id: "missing-email", severity: "medium", message: "No email address is present.", recommendation: "Add a reliable contact email." }, 10);
  if (!data.experience.length) addRisk({ id: "missing-experience", severity: "high", message: "No structured work experience entries were detected.", recommendation: "Add relevant roles and specific contributions." }, 25);
  else if (!data.experience.some((entry) => entry.bullets.some((bullet) => bullet.trim()))) addRisk({ id: "no-experience-evidence", severity: "medium", message: "Experience entries have no supporting highlights.", recommendation: "Add concise, factual evidence under each relevant role." }, 12);
  if (!data.summary.trim()) addRisk({ id: "missing-summary", severity: "low", message: "No professional summary is present.", recommendation: "Consider a short, role-relevant introduction." }, 8);
  if (!data.skills.length) addRisk({ id: "missing-skills", severity: "medium", message: "No structured skills are listed.", recommendation: "List relevant skills you can support with experience." }, 12);
  if (!data.education.length) risks.push({ id: "no-education", severity: "low", message: "No education section is present.", recommendation: "Add education if it is relevant or requested by the role." });

  const longParagraph = [data.summary, ...data.experience.flatMap((entry) => entry.bullets)]
    .some((text) => text.length > 900 && !/\n|[.!?]\s/.test(text));
  if (longParagraph) addRisk({ id: "dense-paragraph", severity: "low", message: "A long unbroken text block may be harder to scan.", recommendation: "Split dense content into shorter, readable bullets." }, 8);

  return { score: Math.max(0, score), risks };
}

function weightedScore(components: AtsReport["components"]): number {
  const active = Object.values(components).filter((component) => component.score !== null);
  const totalWeight = active.reduce((sum, component) => sum + component.weight, 0);
  if (!totalWeight) return 0;
  return Math.round(active.reduce((sum, component) => sum + (component.score ?? 0) * component.weight, 0) / totalWeight);
}

export function buildResumeEvidenceText(data: ResumeData): string {
  return resumeCorpus(data).join("\n");
}

export function scoreResumeAgainstJob(data: ResumeData, jobDescription: string): AtsReport {
  const corpus = resumeCorpus(data);
  const skills = extractCatalogRequirements(jobDescription, corpus, skillCatalog, "skill");
  const qualifications = extractQualifications(jobDescription, corpus);
  const experienceCorpus = data.experience.flatMap((entry) => [entry.role, ...entry.bullets]).filter(Boolean);
  const experienceSignals = extractCatalogRequirements(jobDescription, experienceCorpus, experienceCatalog, "experience");
  const structure = getStructureScore(data);

  const components: AtsReport["components"] = {
    skills: {
      score: calculateCoverage(skills),
      weight: ATS_SCORING_WEIGHTS.skills,
      explanation: skills.length ? `${skills.filter((item) => item.matched).length} of ${skills.length} detected role skills have explicit resume evidence.` : "No catalogued role skills were detected; this component is omitted from the normalized score.",
    },
    qualifications: {
      score: calculateCoverage(qualifications),
      weight: ATS_SCORING_WEIGHTS.qualifications,
      explanation: qualifications.length ? `${qualifications.filter((item) => item.matched).length} of ${qualifications.length} detectable qualifications have explicit resume evidence.` : "No supported qualification pattern was detected; this component is omitted from the normalized score.",
    },
    experienceSignals: {
      score: calculateCoverage(experienceSignals),
      weight: ATS_SCORING_WEIGHTS.experienceSignals,
      explanation: experienceSignals.length ? `${experienceSignals.filter((item) => item.matched).length} of ${experienceSignals.length} experience signals have explicit evidence.` : "No catalogued experience signals were detected; this component is omitted from the normalized score.",
    },
    documentStructure: {
      score: structure.score,
      weight: ATS_SCORING_WEIGHTS.documentStructure,
      explanation: `${structure.risks.length} detectable structure or parsing concern${structure.risks.length === 1 ? "" : "s"} found. This checks provided fields only; it cannot inspect employer systems.`,
    },
  };

  const requirements = [...skills, ...qualifications, ...experienceSignals];
  const missingTerms = requirements.filter((item) => !item.matched);
  const recommendations = [
    ...missingTerms.filter((item) => item.priority === "required").map((item) => ({ priority: 1, title: `Review ${item.label}`, detail: `The job description marks this as required, but explicit supporting evidence was not found in the resume.` })),
    ...structure.risks.map((risk) => ({ priority: risk.severity === "high" ? 1 : risk.severity === "medium" ? 2 : 3, title: risk.message, detail: risk.recommendation })),
    ...missingTerms.filter((item) => item.priority !== "required").map((item) => ({ priority: 4, title: `Check ${item.label}`, detail: `If this reflects your actual background, add clear evidence. Otherwise, leave it out.` })),
  ].sort((left, right) => left.priority - right.priority).slice(0, 8);

  return {
    version: 1,
    overallScore: weightedScore(components),
    components,
    matchedTerms: requirements.filter((item) => item.matched),
    missingTerms,
    risks: structure.risks,
    recommendations,
    disclaimer: "This deterministic compatibility estimate is based on visible text and structured fields. It is not an employer ATS result, an interview prediction, or a hiring decision.",
  };
}