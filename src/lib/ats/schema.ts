import { z } from "zod";

export const atsRequirementSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(160),
  category: z.enum(["skill", "qualification", "experience"]),
  priority: z.enum(["required", "preferred", "unspecified"]),
  matched: z.boolean(),
  jobEvidence: z.string().max(280),
  resumeEvidence: z.array(z.string().max(240)).max(2),
  explanation: z.string().max(500),
});

const componentSchema = z.object({
  score: z.number().int().min(0).max(100).nullable(),
  weight: z.number().int().min(0).max(100),
  explanation: z.string().max(500),
});

export const atsReportSchema = z.object({
  version: z.literal(1),
  overallScore: z.number().int().min(0).max(100),
  components: z.object({
    skills: componentSchema,
    qualifications: componentSchema,
    experienceSignals: componentSchema,
    documentStructure: componentSchema,
  }),
  matchedTerms: z.array(atsRequirementSchema).max(120),
  missingTerms: z.array(atsRequirementSchema).max(120),
  risks: z.array(z.object({
    id: z.string().min(1).max(80),
    severity: z.enum(["low", "medium", "high"]),
    message: z.string().max(300),
    recommendation: z.string().max(300),
  })).max(40),
  recommendations: z.array(z.object({
    priority: z.number().int().min(1).max(10),
    title: z.string().max(200),
    detail: z.string().max(500),
  })).max(20),
  disclaimer: z.string().max(500),
});

export type PersistedAtsReport = z.infer<typeof atsReportSchema>;