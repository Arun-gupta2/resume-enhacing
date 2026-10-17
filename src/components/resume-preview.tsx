import type { ResumeData, ResumeTemplate } from "@/lib/resume/schema";
import styles from "./resume-preview.module.css";

function dateRange(start: string, end: string, current?: boolean) {
  const endLabel = current ? "Present" : end;
  return [start, endLabel].filter(Boolean).join(" – ");
}

function hasContact(data: ResumeData): boolean {
  return Boolean(
    data.contact.fullName ||
      data.contact.email ||
      data.contact.phone ||
      data.contact.location ||
      data.contact.linkedIn ||
      data.contact.website ||
      data.contact.portfolio,
  );
}

function ContactList({ data }: { data: ResumeData }) {
  const details = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
    data.contact.linkedIn,
    data.contact.website,
    data.contact.portfolio,
  ].filter(Boolean);

  if (!details.length) return null;
  return <ul className={styles.contactList}>{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>;
}

function SkillList({ data }: { data: ResumeData }) {
  if (!data.skills.length) return null;
  return <ul className={styles.skills}>{data.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul>;
}

function ResumeSections({ data }: { data: ResumeData }) {
  return (
    <>
      {data.summary && <section className={styles.resumeSection}><h2>Professional summary</h2><p className={styles.summary}>{data.summary}</p></section>}
      {data.experience.length > 0 && <section className={styles.resumeSection}><h2>Experience</h2>{data.experience.map((entry) => <article className={styles.entry} key={entry.id}><div className={styles.entryHeading}><div><h3>{entry.role || "Role title"}</h3><p>{[entry.company, entry.location].filter(Boolean).join(" · ")}</p></div><span>{dateRange(entry.startDate, entry.endDate, entry.current)}</span></div>{entry.bullets.filter(Boolean).length > 0 && <ul className={styles.bullets}>{entry.bullets.filter(Boolean).map((bullet, index) => <li key={`${entry.id}-${index}`}>{bullet}</li>)}</ul>}</article>)}</section>}
      {data.education.length > 0 && <section className={styles.resumeSection}><h2>Education</h2>{data.education.map((entry) => <article className={styles.entry} key={entry.id}><div className={styles.entryHeading}><div><h3>{[entry.degree, entry.field].filter(Boolean).join(" · ") || "Degree or program"}</h3><p>{[entry.school, entry.location].filter(Boolean).join(" · ")}</p></div><span>{dateRange(entry.startDate, entry.endDate)}</span></div>{entry.details && <p>{entry.details}</p>}</article>)}</section>}
      {data.projects.length > 0 && <section className={styles.resumeSection}><h2>Projects</h2>{data.projects.map((entry) => <article className={styles.entry} key={entry.id}><div className={styles.entryHeading}><div><h3>{entry.name || "Project name"}</h3><p>{entry.role}</p></div></div>{entry.description && <p>{entry.description}</p>}{entry.url && <p className={styles.projectUrl}>{entry.url}</p>}</article>)}</section>}
      {data.certifications.length > 0 && <section className={styles.resumeSection}><h2>Certifications</h2><ul className={styles.simpleList}>{data.certifications.map((entry) => <li key={entry.id}><strong>{entry.name}</strong>{entry.issuer && <span>{entry.issuer}</span>}{entry.date && <span>{entry.date}</span>}</li>)}</ul></section>}
      {data.additionalSections.map((section) => <section className={styles.resumeSection} key={section.id}><h2>{section.title || "Additional information"}</h2><ul className={styles.simpleList}>{section.items.filter(Boolean).map((item, index) => <li className={styles.additionalItem} key={`${section.id}-${index}`}>{item}</li>)}</ul></section>)}
    </>
  );
}

export function ResumePreview({ data, template }: { data: ResumeData; template: ResumeTemplate }) {
  const name = data.contact.fullName || "Your name";
  const hasResumeContent = hasContact(data) || Boolean(data.summary) || data.experience.length > 0 || data.education.length > 0 || data.skills.length > 0 || data.projects.length > 0 || data.certifications.length > 0 || data.additionalSections.length > 0;

  return (
    <article className={`${styles.resumePage} ${styles[template]}`} aria-label={`${template} resume preview`}>
      <header className={styles.resumeHeader}>
        <h1>{name}</h1>
        {data.experience.find((entry) => entry.role)?.role && <p>{data.experience.find((entry) => entry.role)?.role}</p>}
        <ContactList data={data} />
      </header>
      {!hasResumeContent ? <p className={styles.blankMessage}>Your resume preview will take shape as you add details.</p> : <><ResumeSections data={data} />{data.skills.length > 0 && <section className={styles.resumeSection}><h2>Skills</h2><SkillList data={data} /></section>}</>}
    </article>
  );
}