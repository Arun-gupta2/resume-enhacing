import Link from "next/link";
import styles from "./homepage.module.css";

const features = [
  [
    "01",
    "Choose Your Ideal Archetype",
    "Select from Modern Technical, Executive Editorial, or Compact 1-Page layouts. Formatted specifically to pass ATS scanners and impress hiring managers.",
  ],
  [
    "02",
    "Instant ATS & Quality Rating",
    "Get an objective 0–100 score analyzing action verb strength, quantified metrics, contact completeness, and keyword density before you apply.",
  ],
  [
    "03",
    "Job Description Matching & AI Optimization",
    "Paste any job description to discover missing qualifications, uncover keyword gaps, and generate tailored, outcome-driven bullet point enhancements.",
  ],
];

const steps = [
  [
    "01 / Choose Your Starting Path",
    "From Scratch or Upload",
    "Create a new structured resume using our guided archetype builder, or upload an existing PDF or DOCX file to extract and review your experience instantly.",
  ],
  [
    "02 / Target the Role",
    "Compare with the Job Description",
    "Paste the target role description to see an instant compatibility score, matched keywords, and unverified requirements across skills and experience.",
  ],
  [
    "03 / Tailor & Export",
    "Optimize with One Click",
    "Apply conservative, high-impact suggestions that weave job requirements into your actual experience, then export as a pixel-perfect ATS-friendly PDF.",
  ],
];

function ProductPreview() {
  return (
    <div className={styles.previewStage} aria-label="Interactive ATS Resume Optimizer Preview">
      <div className={styles.preview}>
        <div className={styles.previewTop}>
          <span>● &nbsp;Live Workspace · ATS Optimizer</span>
          <span style={{ color: "var(--green)", fontWeight: 700 }}>● Active System</span>
        </div>
        <div className={styles.previewBody}>
          <div className={styles.resumeSheet}>
            <h2>Alex Mercer</h2>
            <p>SENIOR FULL STACK ENGINEER · SAN FRANCISCO, CA</p>
            <hr />
            <b>CORE IMPACT SUMMARY</b>
            <span className={`${styles.line} ${styles.highlight}`} />
            <span className={`${styles.line} ${styles.short}`} />
            <h3>WORK EXPERIENCE</h3>
            <strong>
              Senior Full Stack Engineer <small>2022 — Present</small>
            </strong>
            <span className={`${styles.line} ${styles.highlight}`} />
            <span className={styles.line} />
            <span className={`${styles.line} ${styles.medium}`} />
            <span className={`${styles.line} ${styles.short}`} />
            <h3>SKILLS MATRIX</h3>
            <strong>TypeScript · React · Next.js · Node.js · AWS · PostgreSQL</strong>
            <span className={`${styles.line} ${styles.medium}`} />
          </div>
          <aside className={styles.matchPanel}>
            <b>Role Compatibility</b>
            <div className={styles.score}>
              <span>
                <strong>88</strong>
                <small>of 100</small>
              </span>
            </div>
            <p>
              <strong style={{ color: "var(--green)" }}>Strong ATS Match</strong>
            </p>
            <hr />
            <b>SIGNALS FOUND</b>
            <p>
              TypeScript & React <i>MATCHED</i>
            </p>
            <p>
              Distributed Systems <i>MATCHED</i>
            </p>
            <p>
              System Design <i>SUGGESTED EDIT</i>
            </p>
            <hr />
            <Link
              href="/dashboard/optimize"
              style={{
                display: "block",
                textAlign: "center",
                padding: "6px 8px",
                background: "var(--green)",
                color: "#fff",
                borderRadius: "4px",
                fontSize: "9px",
                fontWeight: 700,
              }}
            >
              Test Your Resume →
            </Link>
          </aside>
        </div>
        <div className={styles.previewFoot}>
          <span>Real-time ATS parsing · Evidence-based scoring</span>
          <span style={{ fontWeight: 600 }}>Zero keyword stuffing</span>
        </div>
      </div>
      <p className={styles.caption}>Deterministic keyword scoring & intelligent tailoring in your browser.</p>
    </div>
  );
}

function TemplateCard({
  name,
  style,
  label,
  bestFor,
}: {
  name: string;
  style: "editorial" | "modern" | "classic";
  label: string;
  bestFor: string;
}) {
  return (
    <article className={styles.templateCard}>
      <div className={`${styles.templatePaper} ${styles[style]}`} aria-hidden="true">
        <span className={styles.avatar}>A</span>
        <span className={styles.templateName} />
        <span className={styles.templateSub} />
        <hr />
        <span className={styles.line} />
        <span className={`${styles.line} ${styles.medium}`} />
        <span className={`${styles.line} ${styles.short}`} />
        <hr />
        <span className={styles.line} />
        <span className={`${styles.line} ${styles.medium}`} />
      </div>
      <div className={styles.templateMeta}>
        <div>
          <h3>{name}</h3>
          <p>{label}</p>
          <small style={{ display: "block", marginTop: "4px", color: "var(--green)" }}>{bestFor}</small>
        </div>
        <Link
          className="button button-outline"
          style={{ padding: "4px 8px", fontSize: "10px", alignSelf: "center" }}
          href="/dashboard/resumes/new"
        >
          Use Style →
        </Link>
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <main>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>Next-Gen Resume Studio & ATS Optimizer</span>
            <h1>
              Build with confidence. <em>Pass every ATS filter.</em>
            </h1>
            <p className={styles.lead}>
              Pick your ideal resume archetype, create from scratch or upload your document, and match in seconds against any job description with real-time scoring and intelligent optimization.
            </p>
            <div className={styles.actions}>
              <Link className="button button-dark" href="/dashboard/resumes/new">
                Create from Scratch <span aria-hidden="true">+</span>
              </Link>
              <Link className="button button-outline" href="/dashboard/resumes/upload">
                Upload & Rate Resume <span aria-hidden="true">📄</span>
              </Link>
              <Link className="button button-outline" href="/dashboard/optimize">
                Target a Job Description <span aria-hidden="true">🎯</span>
              </Link>
            </div>
            <p className={styles.note}>
              ✓ Live interactive studio &nbsp;·&nbsp; ✓ PDF & Word parsing &nbsp;·&nbsp; ✓ One-click AI optimization
            </p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className={styles.section} id="product">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeading}>
            <div>
              <span className="eyebrow">Engineered for Results</span>
              <h2>Measurable clarity. Proven ATS compatibility.</h2>
            </div>
            <p>Everything you need to turn raw experience into high-performing, targeted applications.</p>
          </div>
          <div className={styles.featureGrid}>
            {features.map(([index, title, description]) => (
              <article className={styles.feature} key={index}>
                <span>{index}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.process}`} id="how-it-works">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeading}>
            <div>
              <span className="eyebrow">The Complete Workflow</span>
              <h2>From blank canvas or existing draft to targeted offer.</h2>
            </div>
            <p>A transparent, evidence-led workflow that keeps you firmly in control of your story.</p>
          </div>
          <div className={styles.processGrid}>
            {steps.map(([number, title, description]) => (
              <article className={styles.processStep} key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.templateSection}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeading}>
            <div>
              <span className="eyebrow">Tailored Formats</span>
              <h2>Resume Archetypes designed for impact.</h2>
            </div>
            <p>Three distinct typographic styles built for clean parsing and instant readability.</p>
          </div>
          <div className={styles.templateGrid}>
            <TemplateCard
              name="Modern Technical"
              style="modern"
              label="Split-rail layout, prominent skills matrix"
              bestFor="Tech, Product, Engineering"
            />
            <TemplateCard
              name="Executive Editorial"
              style="editorial"
              label="Authoritative serif, chronological clarity"
              bestFor="Management, Finance, Legal"
            />
            <TemplateCard
              name="Compact Single-Page"
              style="classic"
              label="High-density ATS, zero wasted space"
              bestFor="Tight 1-Page, Early Career"
            />
          </div>
        </div>
      </section>

      <section className={styles.pricingBand}>
        <div className={`${styles.sectionInner} ${styles.bandInner}`}>
          <div>
            <span className="eyebrow">Ready to elevate your applications?</span>
            <h2>Experience the full resume studio now.</h2>
            <p>Build, import, rate, and optimize as many resumes and job descriptions as you need.</p>
          </div>
          <Link className="button button-dark" href="/dashboard">
            Launch Workspace <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeading}>
            <div>
              <span className="eyebrow">Common Questions</span>
              <h2>Everything you need to know.</h2>
            </div>
            <Link className="button-text" href="/faq">
              Visit the full FAQ <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className={styles.faqPreview}>
            <details>
              <summary>How does the ATS compatibility score work?</summary>
              <p>
                Our scoring engine extracts key requirements, qualifications, and core tools from the job description and performs deterministic semantic matching against your visible resume text. You receive an overall score (0–100) and actionable breakdown across skills, experience signals, and formatting.
              </p>
            </details>
            <details>
              <summary>Can I create a resume from scratch or upload my own?</summary>
              <p>
                Both! You can start from scratch with guided archetype templates, or upload an existing PDF or DOCX file. Our parser extracts your contact info, summary, experience, skills, and projects for review and editing in the live studio.
              </p>
            </details>
            <details>
              <summary>How does AI resume optimization work?</summary>
              <p>
                When you compare your resume to a job description, our optimization engine proposes targeted enhancements to your summary and bullet points. It integrates missing high-priority keywords and strong action verbs while preserving your authentic work history. You can review and approve each edit before saving.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={`${styles.sectionInner} ${styles.bandInner}`}>
          <div>
            <h2>Make your next application stand out.</h2>
            <p>Start with a clean archetype or import your resume in seconds.</p>
          </div>
          <Link className="button button-light" href="/dashboard/resumes/new">
            Get Started Free <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
