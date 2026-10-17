import type { ResumeData } from "@/lib/resume/schema";

export type ResumeRatingCategory = {
  name: string;
  score: number; // 0-100
  weight: number;
  tips: string[];
};

export type ResumeRatingReport = {
  overallScore: number; // 0-100
  grade: "Exceptional" | "Strong" | "Good" | "Needs Improvement" | "Early Draft";
  gradeColor: string;
  categories: {
    contact: ResumeRatingCategory;
    summary: ResumeRatingCategory;
    experience: ResumeRatingCategory;
    skills: ResumeRatingCategory;
    education: ResumeRatingCategory;
  };
  keyStrengths: string[];
  topRecommendations: string[];
};

const ACTION_VERBS = [
  "architected", "engineered", "spearheaded", "developed", "led", "designed",
  "optimized", "accelerated", "pioneered", "orchestrated", "implemented",
  "automated", "streamlined", "built", "delivered", "scaled", "transformed",
  "reduced", "increased", "generated", "managed", "created", "launched",
];

const METRIC_PATTERN = /\b(?:\d+[%kKmMbB]?|\$\d+|\d+x|\b\d+\s+(?:users|customers|clients|requests|projects|teams|engineers|services|members))\b/i;

export function rateResume(data: ResumeData): ResumeRatingReport {
  // 1. Contact Score (15% weight)
  const contactTips: string[] = [];
  let contactPoints = 0;
  if (data.contact.fullName.trim().length > 2) contactPoints += 30;
  else contactTips.push("Add your full name.");

  if (data.contact.email.trim().length > 3) contactPoints += 25;
  else contactTips.push("Add a professional email address.");

  if (data.contact.phone.trim().length > 5) contactPoints += 15;
  else contactTips.push("Include a contact phone number.");

  if (data.contact.location.trim().length > 2) contactPoints += 15;
  else contactTips.push("Specify your city/state or remote availability.");

  if (data.contact.linkedIn || data.contact.website || data.contact.portfolio) contactPoints += 15;
  else contactTips.push("Link a LinkedIn profile, GitHub, or portfolio website.");

  const contactScore = Math.min(100, contactPoints);

  // 2. Summary Score (20% weight)
  const summaryTips: string[] = [];
  let summaryPoints = 0;
  const summaryLen = data.summary.trim().length;

  if (summaryLen >= 100 && summaryLen <= 600) {
    summaryPoints += 70;
  } else if (summaryLen > 600) {
    summaryPoints += 45;
    summaryTips.push("Summary is slightly verbose; aim for 2-4 punchy sentences.");
  } else if (summaryLen > 20) {
    summaryPoints += 40;
    summaryTips.push("Expand your summary to 2-3 sentences highlighting your domain focus.");
  } else {
    summaryTips.push("Add a professional summary outlining your primary expertise and value.");
  }

  const hasSummaryKeywords = ACTION_VERBS.some((verb) => data.summary.toLowerCase().includes(verb));
  if (hasSummaryKeywords) summaryPoints += 30;
  else if (summaryLen > 20) summaryTips.push("Include strong action verbs in your summary.");

  const summaryScore = Math.min(100, summaryPoints);

  // 3. Experience Score (35% weight)
  const expTips: string[] = [];
  let expPoints = 0;
  const positions = data.experience;

  if (positions.length >= 2) expPoints += 30;
  else if (positions.length === 1) expPoints += 20;
  else expTips.push("Add your work history with role titles and organizations.");

  let totalBullets = 0;
  let bulletsWithVerbs = 0;
  let bulletsWithMetrics = 0;

  positions.forEach((pos) => {
    pos.bullets.forEach((bullet) => {
      const b = bullet.trim();
      if (b.length > 10) {
        totalBullets++;
        const words = b.toLowerCase().split(/\s+/);
        if (ACTION_VERBS.some((verb) => words.slice(0, 3).includes(verb))) {
          bulletsWithVerbs++;
        }
        if (METRIC_PATTERN.test(b)) {
          bulletsWithMetrics++;
        }
      }
    });
  });

  if (totalBullets >= 4) expPoints += 25;
  else if (totalBullets >= 1) expPoints += 15;
  else expTips.push("Add 2-4 detailed accomplishment bullet points per position.");

  if (bulletsWithVerbs >= Math.max(1, Math.floor(totalBullets * 0.5))) expPoints += 25;
  else expTips.push("Start bullet points with strong action verbs (e.g. Engineered, Spearheaded, Optimized).");

  if (bulletsWithMetrics >= 1) expPoints += 20;
  else expTips.push("Include quantified metrics (percentages, numbers, dollars) to demonstrate measurable impact.");

  const experienceScore = Math.min(100, expPoints);

  // 4. Skills Score (15% weight)
  const skillTips: string[] = [];
  let skillPoints = 0;
  const skillCount = data.skills.length;

  if (skillCount >= 8) skillPoints += 100;
  else if (skillCount >= 4) {
    skillPoints += 65;
    skillTips.push("Add at least 8 relevant technical and domain skills to improve ATS keyword discovery.");
  } else if (skillCount > 0) {
    skillPoints += 35;
    skillTips.push("Expand your skills list with specific frameworks, tools, and methodologies.");
  } else {
    skillTips.push("Add technical and core skills relevant to your target positions.");
  }
  const skillsScore = Math.min(100, skillPoints);

  // 5. Education & Credentials (15% weight)
  const eduTips: string[] = [];
  let eduPoints = 0;
  if (data.education.length > 0) eduPoints += 60;
  else eduTips.push("Include your formal education or relevant coursework.");

  if (data.certifications.length > 0 || data.projects.length > 0) eduPoints += 40;
  else eduTips.push("Add certifications or showcase projects to strengthen credibility.");

  const educationScore = Math.min(100, eduPoints);

  // Calculate overall weighted score
  const overall = Math.round(
    contactScore * 0.15 +
    summaryScore * 0.20 +
    experienceScore * 0.35 +
    skillsScore * 0.15 +
    educationScore * 0.15
  );

  let grade: ResumeRatingReport["grade"] = "Early Draft";
  let gradeColor = "#718096";

  if (overall >= 90) {
    grade = "Exceptional";
    gradeColor = "#16a34a";
  } else if (overall >= 78) {
    grade = "Strong";
    gradeColor = "#2563eb";
  } else if (overall >= 65) {
    grade = "Good";
    gradeColor = "#0d9488";
  } else if (overall >= 45) {
    grade = "Needs Improvement";
    gradeColor = "#d97706";
  } else {
    grade = "Early Draft";
    gradeColor = "#dc2626";
  }

  const keyStrengths: string[] = [];
  if (contactScore >= 80) keyStrengths.push("Complete contact information and professional profiles.");
  if (summaryScore >= 80) keyStrengths.push("Focused professional summary with strong domain positioning.");
  if (bulletsWithMetrics > 0) keyStrengths.push(`Includes ${bulletsWithMetrics} quantified outcome${bulletsWithMetrics > 1 ? "s" : ""} in work history.`);
  if (skillsScore >= 80) keyStrengths.push(`Diverse skills matrix with ${skillCount} catalogued capabilities.`);

  const topRecommendations = [
    ...experienceScore < 75 ? expTips : [],
    ...skillsScore < 80 ? skillTips : [],
    ...summaryScore < 75 ? summaryTips : [],
    ...contactScore < 80 ? contactTips : [],
    ...eduTips,
  ].slice(0, 4);

  return {
    overallScore: Math.max(10, Math.min(100, overall)),
    grade,
    gradeColor,
    categories: {
      contact: { name: "Contact details", score: contactScore, weight: 15, tips: contactTips },
      summary: { name: "Professional summary", score: summaryScore, weight: 20, tips: summaryTips },
      experience: { name: "Work experience & impact", score: experienceScore, weight: 35, tips: expTips },
      skills: { name: "Skills & keywords", score: skillsScore, weight: 15, tips: skillTips },
      education: { name: "Education & credentials", score: educationScore, weight: 15, tips: eduTips },
    },
    keyStrengths: keyStrengths.length > 0 ? keyStrengths : ["Clean document structure."],
    topRecommendations: topRecommendations.length > 0 ? topRecommendations : ["Resume is well-rounded and ready for role-specific ATS tailoring."],
  };
}
