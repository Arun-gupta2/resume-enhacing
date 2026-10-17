import assert from "node:assert/strict";
import test from "node:test";
import { createBlankResumeData } from "../src/lib/resume/schema.ts";
import { ATS_SCORING_WEIGHTS, scoreResumeAgainstJob } from "../src/lib/ats/scoring.ts";

test("normalizes case and aliases and returns explicit evidence", () => {
  const resume = {
    ...createBlankResumeData(),
    contact: { ...createBlankResumeData().contact, fullName: "Casey Example", email: "casey@example.com" },
    summary: "Product engineer focused on JavaScript delivery.",
    skills: ["React"],
    experience: [{
      id: "role-1",
      role: "Product Engineer",
      company: "Example Co",
      location: "",
      startDate: "2022-01",
      endDate: "",
      current: true,
      bullets: ["Built React interfaces and improved release delivery."],
    }],
  };

  const report = scoreResumeAgainstJob(resume, "Required: React.js and JavaScript. Preferred: leadership experience.");

  assert.ok(report.overallScore < 100);
  assert.equal(report.matchedTerms.length, 2);
  assert.ok(report.missingTerms.some((term) => term.label === "Leadership"));
  assert.ok(report.matchedTerms.every((term) => term.resumeEvidence.length > 0));
  assert.equal(report.disclaimer.includes("not an employer ATS result"), true);
});

test("marks missing required qualifications without inventing candidate evidence", () => {
  const resume = createBlankResumeData();
  const report = scoreResumeAgainstJob(resume, "Required: Master's degree and 5+ years of experience with AWS.");

  assert.ok(report.missingTerms.some((term) => term.id === "skill:aws" && term.priority === "required"));
  assert.ok(report.missingTerms.some((term) => term.category === "qualification"));
  assert.ok(report.missingTerms.every((term) => term.resumeEvidence.length === 0));
  assert.ok(report.recommendations.length > 0);
});

test("deduplicates aliases and reports structure risks", () => {
  const resume = createBlankResumeData();
  const report = scoreResumeAgainstJob(resume, "Experience with PostgreSQL, Postgres, SQL, and SQL databases.");

  assert.equal(report.missingTerms.filter((term) => term.category === "skill").length, 2);
  assert.ok(report.risks.some((risk) => risk.id === "missing-experience"));
  assert.ok(report.components.documentStructure.score !== null);
});

test("renormalizes active scoring weights when a category is absent", () => {
  const resume = {
    ...createBlankResumeData(),
    contact: { ...createBlankResumeData().contact, fullName: "Avery" },
    skills: ["Python"],
  };
  const report = scoreResumeAgainstJob(resume, "Python preferred.");

  assert.equal(report.components.qualifications.score, null);
  assert.equal(report.components.experienceSignals.score, null);
  assert.equal(Object.values(ATS_SCORING_WEIGHTS).reduce((sum, weight) => sum + weight, 0), 100);
  assert.equal(report.components.skills.score, 100);
  assert.ok((report.components.documentStructure.score ?? 100) < 100);
});

test("does not use contact details as matching evidence", () => {
  const resume = {
    ...createBlankResumeData(),
    contact: { ...createBlankResumeData().contact, fullName: "Python Developer", email: "react@example.com" },
  };
  const report = scoreResumeAgainstJob(resume, "Python and React experience required.");

  assert.equal(report.matchedTerms.length, 0);
  assert.equal(report.missingTerms.length, 2);
});