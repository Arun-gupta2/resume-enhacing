import assert from "node:assert/strict";
import test from "node:test";
import { createBlankResumeData } from "../src/lib/resume/schema.ts";
import { rateResume } from "../src/lib/resume/rating.ts";
import { generateLocalOptimizationProposals } from "../src/lib/ai/local-optimizer.ts";
import { scoreResumeAgainstJob } from "../src/lib/ats/scoring.ts";

test("rateResume returns high score for complete structured resume", () => {
  const resume = {
    ...createBlankResumeData(),
    contact: {
      fullName: "Alex Mercer",
      email: "alex@example.com",
      phone: "+1 555-123-4567",
      location: "San Francisco, CA",
      website: "https://alex.dev",
      linkedIn: "https://linkedin.com/in/alex",
      portfolio: "",
    },
    summary:
      "Senior Full Stack Engineer with 6+ years of experience architecting high-scale distributed applications using React, TypeScript, and Node.js. Proven track record of improving system throughput and mentoring engineering teams.",
    experience: [
      {
        id: "exp-1",
        role: "Senior Software Engineer",
        company: "Apex Technologies",
        location: "San Francisco, CA",
        startDate: "2021-01",
        endDate: "",
        current: true,
        bullets: [
          "Architected high-throughput data processing microservices handling 2M+ daily requests with 99.99% uptime.",
          "Spearheaded portal redesign with Next.js, driving a 35% reduction in page load latency.",
        ],
      },
      {
        id: "exp-2",
        role: "Software Engineer",
        company: "Beta Systems",
        location: "Austin, TX",
        startDate: "2018-06",
        endDate: "2020-12",
        current: false,
        bullets: [
          "Engineered RESTful APIs with Node.js and PostgreSQL for 50k+ active users.",
        ],
      },
    ],
    skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Next.js", "AWS", "Docker", "GraphQL"],
    education: [
      {
        id: "edu-1",
        school: "University of Texas",
        degree: "Bachelor of Science",
        field: "Computer Science",
        location: "Austin, TX",
        startDate: "2014-08",
        endDate: "2018-05",
        details: "Graduated with Honors",
      },
    ],
  };

  const rating = rateResume(resume);

  assert.ok(rating.overallScore >= 80, `Expected score >= 80, got ${rating.overallScore}`);
  assert.ok(rating.grade === "Exceptional" || rating.grade === "Strong");
  assert.ok(rating.categories.contact.score >= 80);
  assert.ok(rating.categories.experience.score >= 70);
  assert.ok(rating.categories.skills.score >= 80);
});

test("rateResume returns low score and specific tips for blank resume", () => {
  const blank = createBlankResumeData();
  const rating = rateResume(blank);

  assert.ok(rating.overallScore <= 35, `Expected score <= 35, got ${rating.overallScore}`);
  assert.equal(rating.grade, "Early Draft");
  assert.ok(rating.topRecommendations.length > 0);
});

test("localOptimizer generates evidence-supported proposals based on job description", () => {
  const resume = {
    ...createBlankResumeData(),
    summary: "Software engineer focused on web delivery.",
    experience: [
      {
        id: "exp-1",
        role: "Software Engineer",
        company: "Cloud Corp",
        location: "",
        startDate: "2022-01",
        endDate: "",
        current: true,
        bullets: ["Worked on payment processing and customer dashboard."],
      },
    ],
    skills: ["React", "JavaScript"],
  };

  const job = {
    title: "Senior Full Stack Engineer",
    company: "Stripe",
    description: "Required: TypeScript, React, System Design, and 5+ years building distributed applications.",
  };

  const report = scoreResumeAgainstJob(resume, job.description);
  const optimization = generateLocalOptimizationProposals({ resume, job, report });

  assert.ok(optimization.proposals.length > 0);
  assert.ok(optimization.caveats.length > 0);
  // Check that summary proposal targets summary
  const summaryProp = optimization.proposals.find((p) => p.target.section === "summary");
  if (summaryProp) {
    assert.ok(summaryProp.revised.includes("Senior Full Stack Engineer"));
  }
  // Check that weak verb was replaced
  const bulletProp = optimization.proposals.find((p) => p.target.section === "experienceBullet");
  if (bulletProp) {
    assert.ok(!bulletProp.revised.startsWith("Worked on"));
  }
});
