import { z } from "zod";

export const resumeTemplateSchema = z.enum(["editorial", "modern", "compact"]);
export type ResumeTemplate = z.infer<typeof resumeTemplateSchema>;

const idSchema = z.string().min(1).max(64);
const optionalUrlSchema = z.union([z.literal(""), z.string().url().max(2048)]);
const optionalMonthSchema = z.union([z.literal(""), z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)]);

export const resumeDataSchema = z.object({
  contact: z.object({
    fullName: z.string().max(120),
    email: z.union([z.literal(""), z.string().email().max(254)]),
    phone: z.string().max(50),
    location: z.string().max(120),
    website: optionalUrlSchema,
    linkedIn: optionalUrlSchema,
    portfolio: optionalUrlSchema,
  }),
  summary: z.string().max(3000),
  experience: z.array(z.object({
    id: idSchema,
    role: z.string().max(120),
    company: z.string().max(120),
    location: z.string().max(120),
    startDate: optionalMonthSchema,
    endDate: optionalMonthSchema,
    current: z.boolean(),
    bullets: z.array(z.string().max(700)).max(16),
  })).max(25),
  education: z.array(z.object({
    id: idSchema,
    school: z.string().max(160),
    degree: z.string().max(120),
    field: z.string().max(120),
    location: z.string().max(120),
    startDate: optionalMonthSchema,
    endDate: optionalMonthSchema,
    details: z.string().max(1200),
  })).max(20),
  skills: z.array(z.string().trim().min(1).max(80)).max(50),
  projects: z.array(z.object({
    id: idSchema,
    name: z.string().max(120),
    role: z.string().max(120),
    url: optionalUrlSchema,
    description: z.string().max(1600),
  })).max(25),
  certifications: z.array(z.object({
    id: idSchema,
    name: z.string().max(160),
    issuer: z.string().max(160),
    date: optionalMonthSchema,
    url: optionalUrlSchema,
  })).max(30),
  additionalSections: z.array(z.object({
    id: idSchema,
    title: z.string().max(80),
    items: z.array(z.string().max(18000)).max(30),
  })).max(10),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;

export type ResumeParserResult = {
  data: ResumeData;
  warnings: string[];
};

export type ResumeParser = (file: {
  name: string;
  mediaType: string;
  bytes: Uint8Array;
}) => Promise<ResumeParserResult>;

export function createBlankResumeData(): ResumeData {
  return {
    contact: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      linkedIn: "",
      portfolio: "",
    },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    additionalSections: [],
  };
}

export function normalizeResumeData(value: unknown): ResumeData {
  const parsed = resumeDataSchema.safeParse(value);
  if (parsed.success) return parsed.data;

  if (value && typeof value === "object" && "text" in value && typeof value.text === "string") {
    const text = value.text;
    const items = text.match(/[\s\S]{1,18000}/g) ?? [];
    return {
      ...createBlankResumeData(),
      additionalSections: items.length
        ? [{ id: "legacy-draft", title: "Previous draft text", items }]
        : [],
    };
  }

  return createBlankResumeData();
}

export function validateResumeField(path: string, value: string): string | undefined {
  if (!value.trim()) return undefined;

  if (path === "contact.email" && !z.string().email().safeParse(value).success) {
    return "Enter a valid email address.";
  }
  if (["contact.website", "contact.linkedIn", "contact.portfolio", "project.url", "certification.url"].includes(path) && !z.string().url().safeParse(value).success) {
    return "Enter a complete URL, including https://.";
  }

  const limit = path === "summary" ? 3000 : path === "contact.phone" ? 50 : undefined;
  if (limit !== undefined && value.length > limit) return `Use ${limit} characters or fewer.`;
  return undefined;
}