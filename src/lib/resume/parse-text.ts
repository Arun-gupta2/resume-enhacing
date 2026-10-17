import { createBlankResumeData, type ResumeData } from "@/lib/resume/schema";

const headings: { key: string; pattern: RegExp }[] = [
  { key: "summary", pattern: /^(professional\s+)?(summary|profile|objective|about\s+me)$/i },
  { key: "experience", pattern: /^(work\s+)?(experience|employment|work\s+history|professional\s+history)$/i },
  { key: "education", pattern: /^(education|academic\s+background)$/i },
  { key: "skills", pattern: /^(technical\s+)?(skills|core\s+competencies|technologies|tools)$/i },
  { key: "projects", pattern: /^(selected\s+)?(projects|selected\s+work|portfolio)$/i },
  { key: "certifications", pattern: /^(certifications|licenses|credentials)$/i },
];

const bulletPrefix = /^(?:[-*•▪◦‣]|\d+[.)])\s*/u;
const dateRangePattern = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)?\s*\d{4}\s*(?:-|–|to|—)\s*(?:present|current|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)?\s*\d{4})\b/i;

function toMonth(value: string): string {
  const match = value.trim().match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)?\s*(\d{4})/i);
  if (!match) return "";
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const month = match[1] ? months.findIndex((name) => match[1]!.toLowerCase().startsWith(name)) + 1 : 0;
  return month ? `${match[2]}-${String(month).padStart(2, "0")}` : "";
}

function splitExperienceSection(lines: string[], warnings: string[]): {
  experience: ResumeData["experience"];
  preserved: string[];
} {
  const blocks = lines.join("\n").split(/\n\s*\n+/).map((block) => block.trim()).filter(Boolean);
  const experience: ResumeData["experience"] = [];
  const preserved: string[] = [];

  for (const block of blocks) {
    const blockLines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const header = blockLines.find((line) => !bulletPrefix.test(line) && !dateRangePattern.test(line));
    const splitHeader = header?.match(/^(.{2,100}?)\s+(?:at|@|\|)\s+(.{2,120})$/i);
    if (!header || !splitHeader) {
      preserved.push(block);
      continue;
    }

    const datesLine = blockLines.find((line) => dateRangePattern.test(line));
    const dateMatch = datesLine?.match(dateRangePattern)?.[0] ?? "";
    const dateParts = dateMatch.split(/\s*(?:-|–|to|—)\s*/i);
    const current = /present|current/i.test(dateParts[1] ?? "");
    const bullets = blockLines
      .filter((line) => bulletPrefix.test(line))
      .map((line) => line.replace(bulletPrefix, "").trim())
      .filter(Boolean)
      .slice(0, 16);

    experience.push({
      id: `import-experience-${experience.length + 1}`,
      role: splitHeader[1].trim(),
      company: splitHeader[2].trim(),
      location: "",
      startDate: dateParts[0] ? toMonth(dateParts[0]) : "",
      endDate: dateParts[1] && !current ? toMonth(dateParts[1]) : "",
      current,
      bullets,
    });
  }

  if (preserved.length) warnings.push("Some experience entries did not have a clear ‘Role at Company’ heading and were kept in Additional sections for review.");
  return { experience, preserved };
}

export function parseResumeText(input: string): { data: ResumeData; warnings: string[] } {
  const text = input
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\u00a0]+/g, " ")
    .replace(/[ ]+\n/g, "\n")
    .trim();
  const lines = text.split("\n");
  const sectionContent = new Map<string, string[]>();
  let currentSection = "contact";
  sectionContent.set(currentSection, []);

  for (const line of lines) {
    const cleaned = line.trim();
    const heading = headings.find(({ pattern }) => pattern.test(cleaned.replace(/[:：]$/, "").trim()));
    if (heading) {
      currentSection = heading.key;
      if (!sectionContent.has(currentSection)) sectionContent.set(currentSection, []);
      continue;
    }
    sectionContent.get(currentSection)?.push(line);
  }

  const warnings: string[] = [];
  const data = createBlankResumeData();
  const contactLines = (sectionContent.get("contact") ?? []).map((line) => line.trim()).filter(Boolean);
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phoneMatch = text.match(/(?:\+?\d[\d ().-]{7,}\d)/)?.[0]?.trim() ?? "";
  const linkMatches = text.match(/https?:\/\/[^\s<>()]+/gi) ?? [];
  const linkedIn = linkMatches.find((link) => /linkedin\.com\//i.test(link)) ?? "";
  const website = linkMatches.find((link) => link !== linkedIn) ?? "";
  const nameCandidate = contactLines.find((line) => line !== emailMatch && !linkMatches.some((link) => line.includes(link)) && !/\d{3,}/.test(line) && line.length <= 120);
  const locationCandidate = contactLines.find((line) => /,\s*[A-Z]{2}(?:\s|$)/.test(line) && line.length <= 120);

  if (nameCandidate) data.contact.fullName = nameCandidate;
  if (emailMatch) data.contact.email = emailMatch;
  if (phoneMatch) data.contact.phone = phoneMatch;
  if (locationCandidate) data.contact.location = locationCandidate;
  data.contact.linkedIn = linkedIn;
  data.contact.website = website;

  data.summary = (sectionContent.get("summary") ?? []).join("\n").trim().slice(0, 3000);
  data.skills = [...new Set((sectionContent.get("skills") ?? [])
    .join(",")
    .split(/[,;|\n]+/)
    .map((skill) => skill.replace(bulletPrefix, "").trim())
    .filter((skill) => skill.length > 0 && skill.length <= 80))].slice(0, 50);

  const experience = splitExperienceSection(sectionContent.get("experience") ?? [], warnings);
  data.experience = experience.experience;

  const preservedSections: { title: string; items: string[] }[] = [];
  if (experience.preserved.length) preservedSections.push({ title: "Experience - review and organize", items: experience.preserved });
  for (const key of ["education", "projects", "certifications"] as const) {
    const items = (sectionContent.get(key) ?? []).join("\n").trim();
    if (items) preservedSections.push({ title: key[0]!.toUpperCase() + key.slice(1) + " - review and organize", items: [items] });
  }

  if (preservedSections.length > 10) {
    const remainder = preservedSections.splice(9);
    preservedSections.push({ title: "Other imported sections", items: remainder.flatMap((section) => [`${section.title}\n${section.items.join("\n")}`]) });
  }
  data.additionalSections = preservedSections.map((section, index) => ({
    id: `import-additional-${index + 1}`,
    title: section.title.slice(0, 80),
    items: section.items.map((item) => item.slice(0, 18_000)).slice(0, 30),
  }));

  if (!sectionContent.has("experience") && !sectionContent.has("education") && !sectionContent.has("skills")) {
    warnings.push("No familiar section headings were found. Extracted text has been kept for review rather than assigned to uncertain fields.");
    if (contactLines.length > 1) {
      data.additionalSections = [{ id: "import-unclassified", title: "Imported text - review and organize", items: contactLines.slice(1, 31).map((line) => line.slice(0, 18_000)) }];
    }
  }
  if (!data.contact.fullName) warnings.push("A name could not be identified confidently; review the contact section.");

  return { data, warnings: warnings.slice(0, 8) };
}