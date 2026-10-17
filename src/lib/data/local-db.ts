import fs from "node:fs";
import path from "node:path";
import { createBlankResumeData, normalizeResumeData, type ResumeData, type ResumeTemplate } from "@/lib/resume/schema";
import { scoreResumeAgainstJob, type AtsReport } from "@/lib/ats/scoring";
import type { OptimizationResponse } from "@/lib/ai/optimization-contract";

export type StoredResume = {
  id: string;
  user_id: string;
  title: string;
  status: "draft" | "ready" | "archived";
  template: ResumeTemplate;
  client_revision: number;
  current_version_id: string | null;
  original_file_path?: string | null;
  original_file_name?: string | null;
  original_media_type?: string | null;
  original_file_size?: number | null;
  created_at: string;
  updated_at: string;
};

export type StoredVersion = {
  id: string;
  resume_id: string;
  user_id: string;
  variant_id: string | null;
  version_number: number;
  client_revision: number;
  content: ResumeData;
  created_at: string;
};

export type StoredVariant = {
  id: string;
  resume_id: string;
  user_id: string;
  job_description_id: string | null;
  name: string;
  template: ResumeTemplate;
  client_revision: number;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type StoredJobDescription = {
  id: string;
  user_id: string;
  resume_id: string;
  title: string;
  company: string | null;
  description: string;
  created_at: string;
  updated_at: string;
};

export type StoredAnalysis = {
  id: string;
  user_id: string;
  resume_id: string;
  resume_version_id: string;
  resume_variant_id: string | null;
  job_description_id: string;
  score: number | null;
  matched_terms: unknown[];
  missing_terms: unknown[];
  explanation: Record<string, unknown>;
  ats_report: AtsReport;
  optimization_proposals: OptimizationResponse;
  created_at: string;
};

export type LocalDatabaseSchema = {
  users: Array<{ id: string; email: string; fullName: string }>;
  resumes: StoredResume[];
  versions: StoredVersion[];
  variants: StoredVariant[];
  jobDescriptions: StoredJobDescription[];
  analyses: StoredAnalysis[];
};

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";

function getSeedData(): LocalDatabaseSchema {
  const seedResumeId = "11111111-1111-1111-1111-111111111111";
  const seedVersionId = "22222222-2222-2222-2222-222222222222";
  const seedJobId = "33333333-3333-3333-3333-333333333333";
  const seedAnalysisId = "44444444-4444-4444-4444-444444444444";
  const now = new Date().toISOString();

  const sampleResumeData: ResumeData = {
    contact: {
      fullName: "Alex Mercer",
      email: "alex.mercer@example.com",
      phone: "+1 (555) 342-8901",
      location: "San Francisco, CA",
      website: "https://alexmercer.dev",
      linkedIn: "https://linkedin.com/in/alexmercer-demo",
      portfolio: "https://github.com/alexmercer-demo",
    },
    summary:
      "Full Stack Engineer with 6+ years of experience designing scalable web applications, distributed systems, and modern cloud architectures using React, Next.js, TypeScript, and Node.js. Track record of improving system latency by 35% and leading cross-functional engineering pods.",
    experience: [
      {
        id: "exp-1",
        role: "Senior Full Stack Engineer",
        company: "Apex Cloud Technologies",
        location: "San Francisco, CA",
        startDate: "2022-03",
        endDate: "",
        current: true,
        bullets: [
          "Architected high-throughput data processing services using TypeScript, Node.js, and PostgreSQL handling 2M+ daily requests.",
          "Spearheaded redesign of flagship customer portal with Next.js and React, driving a 28% increase in conversion and 400ms reduction in LCP.",
          "Integrated automated testing and CI/CD pipelines with GitHub Actions, reducing release cycle time by 45% across 5 teams.",
          "Mentored 6 junior and mid-level engineers through code reviews, architectural RFCs, and engineering brown bags.",
        ],
      },
      {
        id: "exp-2",
        role: "Software Engineer",
        company: "Beacon Data Systems",
        location: "Austin, TX",
        startDate: "2019-06",
        endDate: "2022-02",
        current: false,
        bullets: [
          "Developed resilient REST and GraphQL APIs using Node.js, Express, and Redis caching layer.",
          "Implemented real-time analytics dashboard with React, Tailwind, and WebSockets, cutting reporting delay from 10 minutes to under 2 seconds.",
          "Collaborated with product designers to standardize internal component library, improving feature velocity by 30%.",
        ],
      },
    ],
    education: [
      {
        id: "edu-1",
        school: "University of Texas at Austin",
        degree: "Bachelor of Science",
        field: "Computer Science",
        location: "Austin, TX",
        startDate: "2015-08",
        endDate: "2019-05",
        details: "Graduated with Honors. Coursework in Distributed Systems, Algorithms, and Cloud Infrastructure.",
      },
    ],
    skills: [
      "TypeScript",
      "JavaScript",
      "React",
      "Next.js",
      "Node.js",
      "Python",
      "PostgreSQL",
      "Redis",
      "Docker",
      "Kubernetes",
      "AWS",
      "GraphQL",
      "REST APIs",
      "Git",
      "CI/CD",
      "Microservices",
    ],
    projects: [
      {
        id: "proj-1",
        name: "Distributed Task Orchestrator",
        role: "Creator & Maintainer",
        url: "https://github.com/alexmercer-demo/task-orchestrator",
        description: "Open-source distributed background job processor built in TypeScript with Redis pub/sub and zero external dependencies.",
      },
    ],
    certifications: [
      {
        id: "cert-1",
        name: "AWS Certified Solutions Architect – Associate",
        issuer: "Amazon Web Services",
        date: "2023-04",
        url: "",
      },
    ],
    additionalSections: [],
  };

  return {
    users: [
      {
        id: DEFAULT_USER_ID,
        email: "alex.mercer@example.com",
        fullName: "Alex Mercer",
      },
    ],
    resumes: [
      {
        id: seedResumeId,
        user_id: DEFAULT_USER_ID,
        title: "Senior Full Stack Engineer (Core)",
        status: "ready",
        template: "modern",
        client_revision: 1,
        current_version_id: seedVersionId,
        created_at: now,
        updated_at: now,
      },
    ],
    versions: [
      {
        id: seedVersionId,
        resume_id: seedResumeId,
        user_id: DEFAULT_USER_ID,
        variant_id: null,
        version_number: 1,
        client_revision: 1,
        content: sampleResumeData,
        created_at: now,
      },
    ],
    variants: [],
    jobDescriptions: [
      {
        id: seedJobId,
        user_id: DEFAULT_USER_ID,
        resume_id: seedResumeId,
        title: "Lead Full Stack Engineer",
        company: "Stripe",
        description:
          "We are seeking an experienced Lead Full Stack Engineer to build world-class developer experiences. Required: 5+ years building distributed web applications with TypeScript, React, and Node.js. Experience with PostgreSQL, AWS, and modern CI/CD. Strong system design and leadership abilities.",
        created_at: now,
        updated_at: now,
      },
    ],
    analyses: (() => {
      const jdText = "We are seeking an experienced Lead Full Stack Engineer to build world-class developer experiences. Required: 5+ years building distributed web applications with TypeScript, React, and Node.js. Experience with PostgreSQL, AWS, and modern CI/CD. Strong system design and leadership abilities.";
      const seedReport = scoreResumeAgainstJob(sampleResumeData, jdText);
      return [
        {
          id: seedAnalysisId,
          user_id: DEFAULT_USER_ID,
          resume_id: seedResumeId,
          resume_version_id: seedVersionId,
          resume_variant_id: null,
          job_description_id: seedJobId,
          score: seedReport.overallScore,
          matched_terms: seedReport.matchedTerms,
          missing_terms: seedReport.missingTerms,
          explanation: {
            disclaimer: seedReport.disclaimer,
            components: seedReport.components,
            risks: seedReport.risks,
          },
          ats_report: seedReport,
          optimization_proposals: {
            proposals: [
              {
                id: "prop-1",
                target: { section: "summary" as const, experienceId: null, bulletIndex: null },
                original: sampleResumeData.summary,
                revised:
                  "Lead Full Stack Engineer with 6+ years of experience designing high-scale distributed systems, system architectures, and modern cloud platforms using React, Next.js, TypeScript, and Node.js. Track record of improving system latency by 35% and mentoring engineering pods.",
                rationale: "Aligns executive summary with target 'Lead Full Stack Engineer' title and highlights system design expertise.",
                supportingEvidence: ["Extracted from candidate background in distributed systems and pod leadership."],
                requiresUserConfirmation: true,
              },
              {
                id: "prop-2",
                target: { section: "experienceBullet" as const, experienceId: "exp-1", bulletIndex: 0 },
                original: sampleResumeData.experience[0].bullets[0],
                revised:
                  "Led system design and implementation of high-throughput data processing microservices using TypeScript, Node.js, and PostgreSQL, reliably handling 2M+ daily requests with 99.99% uptime.",
                rationale: "Explicitly introduces 'system design' keyword and highlights reliability outcomes.",
                supportingEvidence: ["Apex Cloud Technologies work experience."],
                requiresUserConfirmation: true,
              },
            ],
            caveats: [
              "Review each edit to ensure it accurately reflects your actual responsibilities.",
              "Changes will only be applied to a tailored copy, preserving your master resume.",
            ],
          },
          created_at: now,
        },
      ];
    })(),
  };
}

let memoryDb: LocalDatabaseSchema | null = null;
const dbFilePath = path.join(process.cwd(), "data", "local-store.json");

function getStorage(): LocalDatabaseSchema {
  if (memoryDb) return memoryDb;
  try {
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, "utf8");
      memoryDb = JSON.parse(raw) as LocalDatabaseSchema;
      return memoryDb;
    }
  } catch {
    // fallback to memory
  }
  memoryDb = getSeedData();
  persistStorage();
  return memoryDb;
}

function persistStorage(): void {
  if (!memoryDb) return;
  try {
    const dir = path.dirname(dbFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dbFilePath, JSON.stringify(memoryDb, null, 2), "utf8");
  } catch {
    // Keep in memory if filesystem writes fail
  }
}

export function generateUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const localDb = {
  getDefaultUserId(): string {
    return DEFAULT_USER_ID;
  },

  getUser(userId = DEFAULT_USER_ID) {
    const db = getStorage();
    return db.users.find((u) => u.id === userId) || db.users[0];
  },

  listResumes(userId = DEFAULT_USER_ID, query = ""): StoredResume[] {
    const db = getStorage();
    let resumes = db.resumes.filter((r) => r.user_id === userId);
    const q = query.trim().toLowerCase();
    if (q) {
      resumes = resumes.filter((r) => r.title.toLowerCase().includes(q));
    }
    return resumes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  getResume(userId: string, resumeId: string): StoredResume | null {
    const db = getStorage();
    return db.resumes.find((r) => r.id === resumeId && r.user_id === userId) ?? null;
  },

  createResume(userId: string, title: string, template: ResumeTemplate = "editorial", initialContent?: ResumeData): string {
    const db = getStorage();
    const resumeId = generateUuid();
    const versionId = generateUuid();
    const now = new Date().toISOString();
    const content = initialContent ? normalizeResumeData(initialContent) : createBlankResumeData();

    const version: StoredVersion = {
      id: versionId,
      resume_id: resumeId,
      user_id: userId,
      variant_id: null,
      version_number: 1,
      client_revision: 1,
      content,
      created_at: now,
    };

    const resume: StoredResume = {
      id: resumeId,
      user_id: userId,
      title: title.trim(),
      status: "draft",
      template,
      client_revision: 1,
      current_version_id: versionId,
      created_at: now,
      updated_at: now,
    };

    db.versions.push(version);
    db.resumes.unshift(resume);
    persistStorage();
    return resumeId;
  },

  renameResume(userId: string, resumeId: string, title: string): boolean {
    const db = getStorage();
    const resume = db.resumes.find((r) => r.id === resumeId && r.user_id === userId);
    if (!resume) return false;
    resume.title = title.trim();
    resume.updated_at = new Date().toISOString();
    persistStorage();
    return true;
  },

  updateResumeStatus(userId: string, resumeId: string, status: "draft" | "ready" | "archived"): boolean {
    const db = getStorage();
    const resume = db.resumes.find((r) => r.id === resumeId && r.user_id === userId);
    if (!resume) return false;
    resume.status = status;
    resume.updated_at = new Date().toISOString();
    persistStorage();
    return true;
  },

  duplicateResume(userId: string, resumeId: string, newTitle: string): string | null {
    const db = getStorage();
    const sourceResume = db.resumes.find((r) => r.id === resumeId && r.user_id === userId);
    if (!sourceResume) return null;

    const sourceVersion = sourceResume.current_version_id
      ? db.versions.find((v) => v.id === sourceResume.current_version_id)
      : null;

    const newResumeId = generateUuid();
    const newVersionId = generateUuid();
    const now = new Date().toISOString();

    const content = sourceVersion ? sourceVersion.content : createBlankResumeData();

    const newVersion: StoredVersion = {
      id: newVersionId,
      resume_id: newResumeId,
      user_id: userId,
      variant_id: null,
      version_number: 1,
      client_revision: 1,
      content,
      created_at: now,
    };

    const newResume: StoredResume = {
      id: newResumeId,
      user_id: userId,
      title: newTitle.trim(),
      status: "draft",
      template: sourceResume.template,
      client_revision: 1,
      current_version_id: newVersionId,
      created_at: now,
      updated_at: now,
    };

    db.versions.push(newVersion);
    db.resumes.unshift(newResume);
    persistStorage();
    return newResumeId;
  },

  deleteResume(userId: string, resumeId: string): boolean {
    const db = getStorage();
    const index = db.resumes.findIndex((r) => r.id === resumeId && r.user_id === userId);
    if (index === -1) return false;

    db.resumes.splice(index, 1);
    db.versions = db.versions.filter((v) => v.resume_id !== resumeId);
    db.variants = db.variants.filter((v) => v.resume_id !== resumeId);
    db.jobDescriptions = db.jobDescriptions.filter((j) => j.resume_id !== resumeId);
    db.analyses = db.analyses.filter((a) => a.resume_id !== resumeId);
    persistStorage();
    return true;
  },

  saveStructuredResumeVersion(params: {
    resumeId: string;
    variantId: string | null;
    clientRevision: number;
    content: ResumeData;
    template: ResumeTemplate;
    userId: string;
  }): { ok: boolean; savedVersionId?: string; code?: "conflict" | "save" } {
    const db = getStorage();
    const { resumeId, variantId, clientRevision, content, template, userId } = params;
    const now = new Date().toISOString();

    if (variantId) {
      const variant = db.variants.find((v) => v.id === variantId && v.resume_id === resumeId && v.user_id === userId);
      if (!variant) return { ok: false, code: "save" };

      if (clientRevision < variant.client_revision) {
        return { ok: false, code: "conflict" };
      }

      const newVersionId = generateUuid();
      const nextRevision = variant.client_revision + 1;

      const newVersion: StoredVersion = {
        id: newVersionId,
        resume_id: resumeId,
        user_id: userId,
        variant_id: variantId,
        version_number: nextRevision,
        client_revision: nextRevision,
        content: normalizeResumeData(content),
        created_at: now,
      };

      variant.template = template;
      variant.client_revision = nextRevision;
      variant.current_version_id = newVersionId;
      variant.updated_at = now;

      db.versions.push(newVersion);
      persistStorage();
      return { ok: true, savedVersionId: newVersionId };
    }

    const resume = db.resumes.find((r) => r.id === resumeId && r.user_id === userId);
    if (!resume) return { ok: false, code: "save" };

    if (clientRevision < resume.client_revision) {
      return { ok: false, code: "conflict" };
    }

    const newVersionId = generateUuid();
    const nextRevision = resume.client_revision + 1;

    const newVersion: StoredVersion = {
      id: newVersionId,
      resume_id: resumeId,
      user_id: userId,
      variant_id: null,
      version_number: nextRevision,
      client_revision: nextRevision,
      content: normalizeResumeData(content),
      created_at: now,
    };

    resume.template = template;
    resume.client_revision = nextRevision;
    resume.current_version_id = newVersionId;
    resume.updated_at = now;

    db.versions.push(newVersion);
    persistStorage();
    return { ok: true, savedVersionId: newVersionId };
  },

  getStudioData(userId: string, resumeId: string, variantId?: string) {
    const db = getStorage();
    const resume = db.resumes.find((r) => r.id === resumeId && (r.user_id === userId || r.user_id === DEFAULT_USER_ID));
    if (!resume) return null;

    const variants = db.variants
      .filter((v) => v.resume_id === resumeId && (v.user_id === userId || v.user_id === DEFAULT_USER_ID))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const jobDescriptions = db.jobDescriptions
      .filter((j) => j.resume_id === resumeId && (j.user_id === userId || j.user_id === DEFAULT_USER_ID))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const selectedVariant = variantId ? variants.find((v) => v.id === variantId) ?? null : null;
    if (variantId && !selectedVariant) return null;

    const versionId = selectedVariant ? selectedVariant.current_version_id : resume.current_version_id;
    let content: ResumeData = createBlankResumeData();

    if (versionId) {
      const version = db.versions.find((v) => v.id === versionId);
      if (version?.content) {
        content = normalizeResumeData(version.content);
      }
    }

    return {
      resume,
      content,
      template: selectedVariant?.template ?? resume.template,
      clientRevision: selectedVariant?.client_revision ?? resume.client_revision,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      variants: variants.map(({ id, name, job_description_id: jobDescriptionId }) => ({ id, name, jobDescriptionId })),
      jobDescriptions: jobDescriptions.map(({ id, title, company, created_at }) => ({ id, title, company, created_at })),
    };
  },

  createVariant(userId: string, resumeId: string, jobDescriptionId: string, name: string): string | null {
    const db = getStorage();
    const resume = db.resumes.find((r) => r.id === resumeId && r.user_id === userId);
    if (!resume) return null;

    const baseVersion = resume.current_version_id ? db.versions.find((v) => v.id === resume.current_version_id) : null;
    const content = baseVersion ? baseVersion.content : createBlankResumeData();

    const variantId = generateUuid();
    const versionId = generateUuid();
    const now = new Date().toISOString();

    const variantVersion: StoredVersion = {
      id: versionId,
      resume_id: resumeId,
      user_id: userId,
      variant_id: variantId,
      version_number: 1,
      client_revision: 1,
      content,
      created_at: now,
    };

    const variant: StoredVariant = {
      id: variantId,
      resume_id: resumeId,
      user_id: userId,
      job_description_id: jobDescriptionId,
      name: name.trim(),
      template: resume.template,
      client_revision: 1,
      current_version_id: versionId,
      created_at: now,
      updated_at: now,
    };

    db.versions.push(variantVersion);
    db.variants.push(variant);
    persistStorage();
    return variantId;
  },

  saveJobDescription(params: {
    userId: string;
    resumeId: string;
    title: string;
    company: string | null;
    description: string;
  }): StoredJobDescription {
    const db = getStorage();
    const id = generateUuid();
    const now = new Date().toISOString();

    const job: StoredJobDescription = {
      id,
      user_id: params.userId,
      resume_id: params.resumeId,
      title: params.title.trim(),
      company: params.company ? params.company.trim() : null,
      description: params.description.trim(),
      created_at: now,
      updated_at: now,
    };

    db.jobDescriptions.unshift(job);
    persistStorage();
    return job;
  },

  listJobDescriptions(userId: string): StoredJobDescription[] {
    const db = getStorage();
    return db.jobDescriptions
      .filter((j) => j.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  saveAnalysis(params: {
    userId: string;
    resumeId: string;
    resumeVersionId: string;
    resumeVariantId: string | null;
    jobDescriptionId: string;
    score: number;
    matchedTerms: unknown[];
    missingTerms: unknown[];
    explanation: Record<string, unknown>;
    atsReport: AtsReport;
    proposals?: OptimizationResponse;
  }): StoredAnalysis {
    const db = getStorage();
    const id = generateUuid();
    const now = new Date().toISOString();

    const analysis: StoredAnalysis = {
      id,
      user_id: params.userId,
      resume_id: params.resumeId,
      resume_version_id: params.resumeVersionId,
      resume_variant_id: params.resumeVariantId,
      job_description_id: params.jobDescriptionId,
      score: params.score,
      matched_terms: params.matchedTerms,
      missing_terms: params.missingTerms,
      explanation: params.explanation,
      ats_report: params.atsReport,
      optimization_proposals: params.proposals || { proposals: [], caveats: [] },
      created_at: now,
    };

    db.analyses.unshift(analysis);
    persistStorage();
    return analysis;
  },

  getAnalysis(userId: string, analysisId: string) {
    const db = getStorage();
    const analysis = db.analyses.find((a) => a.id === analysisId && a.user_id === userId);
    if (!analysis) return null;

    const resume = db.resumes.find((r) => r.id === analysis.resume_id && r.user_id === userId);
    const version = db.versions.find((v) => v.id === analysis.resume_version_id);
    const job = db.jobDescriptions.find((j) => j.id === analysis.job_description_id);
    const variant = analysis.resume_variant_id ? db.variants.find((v) => v.id === analysis.resume_variant_id) : null;

    if (!resume || !version || !job) return null;

    return {
      id: analysis.id,
      createdAt: analysis.created_at,
      score: analysis.score,
      resume: { id: resume.id, title: resume.title },
      versionNumber: version.version_number,
      resumeVariantId: analysis.resume_variant_id,
      variantName: variant?.name ?? null,
      resumeData: version.content,
      jobDescription: { id: job.id, title: job.title, company: job.company, description: job.description },
      report: analysis.ats_report,
      proposals: analysis.optimization_proposals,
    };
  },

  updateAnalysisProposals(userId: string, analysisId: string, proposals: OptimizationResponse): boolean {
    const db = getStorage();
    const analysis = db.analyses.find((a) => a.id === analysisId && a.user_id === userId);
    if (!analysis) return false;
    analysis.optimization_proposals = proposals;
    persistStorage();
    return true;
  },

  getOverview(userId: string) {
    const db = getStorage();
    const resumes = db.resumes
      .filter((r) => r.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        updatedAt: r.updated_at,
      }));

    const analyses = db.analyses
      .filter((a) => a.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((a) => {
        const resume = db.resumes.find((r) => r.id === a.resume_id);
        const job = db.jobDescriptions.find((j) => j.id === a.job_description_id);
        return {
          id: a.id,
          score: a.score,
          createdAt: a.created_at,
          resumeTitle: resume?.title ?? null,
          jobTitle: job?.title ?? null,
        };
      });

    return { resumes, analyses };
  },
};
