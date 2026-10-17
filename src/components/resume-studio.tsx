"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { saveStructuredResumeAction } from "@/app/dashboard/actions";
import { ResumePreview } from "@/components/resume-preview";
import { ResumeVariantForm } from "@/components/resume-variant-form";
import { GuardedLink, useUnsavedChanges } from "@/components/unsaved-changes";
import {
  normalizeResumeData,
  resumeTemplateSchema,
  validateResumeField,
  type ResumeData,
  type ResumeTemplate,
} from "@/lib/resume/schema";
import { rateResume } from "@/lib/resume/rating";
import styles from "./resume-studio.module.css";

type Experience = ResumeData["experience"][number];
type Education = ResumeData["education"][number];
type Project = ResumeData["projects"][number];
type Certification = ResumeData["certifications"][number];
type AdditionalSection = ResumeData["additionalSections"][number];
type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

const sectionLinks = [
  ["contact", "Contact"],
  ["summary", "Summary"],
  ["experience", "Experience"],
  ["education", "Education"],
  ["skills", "Skills"],
  ["projects", "Projects"],
  ["certifications", "Certifications"],
  ["additional", "Additional"],
] as const;

const templates: { id: ResumeTemplate; name: string; detail: string }[] = [
  { id: "editorial", name: "Editorial", detail: "Measured, classic" },
  { id: "modern", name: "Modern", detail: "Split rail" },
  { id: "compact", name: "Compact", detail: "Dense, direct" },
];

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function moveEntry<T>(items: T[], index: number, offset: number): T[] {
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  type = "text",
  maxLength,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <span className={styles.fieldError} id={`${id}-error`}>{error}</span>}
    </label>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  maxLength,
  rows = 4,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <span className={styles.fieldError} id={`${id}-error`}>{error}</span>}
    </label>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div className={styles.sectionTitle}><h2>{title}</h2><p>{description}</p></div>;
}

function EntryTools({
  label,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={styles.entryTools}>
      <button aria-label={`Move ${label} up`} disabled={!canMoveUp} onClick={onMoveUp} type="button">↑</button>
      <button aria-label={`Move ${label} down`} disabled={!canMoveDown} onClick={onMoveDown} type="button">↓</button>
      <button className={styles.removeButton} onClick={onRemove} type="button">Remove</button>
    </div>
  );
}

function AddButton({ children, onClick, disabled = false }: { children: string; onClick: () => void; disabled?: boolean }) {
  return <button className={styles.addButton} disabled={disabled} onClick={onClick} type="button"><span aria-hidden="true">+</span> {children}</button>;
}

export function ResumeStudio({
  resumeId,
  variantId,
  variantName,
  initialContent,
  initialTemplate,
  initialRevision,
  variants,
  jobDescriptions,
}: {
  resumeId: string;
  variantId: string | null;
  variantName: string | null;
  initialContent: unknown;
  initialTemplate: ResumeTemplate;
  initialRevision: number;
  variants: { id: string; name: string; jobDescriptionId: string | null }[];
  jobDescriptions: { id: string; title: string; company: string | null }[];
}) {
  const normalizedTemplate = resumeTemplateSchema.parse(initialTemplate);
  const [data, setData] = useState<ResumeData>(() => normalizeResumeData(initialContent));
  const [template, setTemplate] = useState<ResumeTemplate>(normalizedTemplate);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveMessage, setSaveMessage] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const [skillInput, setSkillInput] = useState("");
  const [showRatingTips, setShowRatingTips] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const rating = rateResume(data);
  const dataRef = useRef(data);
  const templateRef = useRef(template);
  const revisionRef = useRef(initialRevision);
  const dirtyRef = useRef(false);
  const { setHasUnsavedChanges } = useUnsavedChanges();

  function setDirty(value: boolean) {
    dirtyRef.current = value;
    setHasUnsavedChanges(value);
  }

  function updateData(next: ResumeData) {
    dataRef.current = next;
    revisionRef.current += 1;
    setData(next);
    setSaveMessage("");
    setSaveState("dirty");
    setDirty(true);
  }

  function updateTemplate(next: ResumeTemplate) {
    if (next === templateRef.current) return;
    templateRef.current = next;
    setTemplate(next);
    revisionRef.current += 1;
    setSaveMessage("");
    setSaveState("dirty");
    setDirty(true);
  }

  function fieldError(path: string, value: string, touchKey = path) {
    if (!touched[touchKey]) return undefined;
    if (path.endsWith(".role") && !value.trim()) return "Add a role title.";
    if (path.endsWith(".company") && !value.trim()) return "Add an organization.";
    return validateResumeField(path, value);
  }

  function markTouched(path: string) {
    setTouched((current) => ({ ...current, [path]: true }));
  }

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (saveState !== "dirty") return;
    const snapshot = data;
    const revision = revisionRef.current;
    const selectedTemplate = template;
    const timeout = window.setTimeout(() => {
      setSaveState("saving");
      startTransition(async () => {
        try {
          const result = await saveStructuredResumeAction({
            resumeId,
            variantId,
            clientRevision: revision,
            template: selectedTemplate,
            content: snapshot,
          });

          if (revision !== revisionRef.current) return;
          if (!result.ok) {
            setSaveMessage(result.message);
            setSaveState(result.code === "conflict" ? "conflict" : "error");
            return;
          }

          setSaveMessage("");
          setSaveState("saved");
          dirtyRef.current = false;
          setHasUnsavedChanges(false);
        } catch {
          if (revision !== revisionRef.current) return;
          setSaveMessage("Autosave failed. Your changes are still here; retry when you are back online.");
          setSaveState("error");
        }
      });
    }, 750);

    return () => window.clearTimeout(timeout);
  }, [data, resumeId, retryToken, saveState, setHasUnsavedChanges, template, variantId]);

  function retrySave() {
    setSaveMessage("");
    setSaveState("dirty");
    setRetryToken((current) => current + 1);
  }

  function reloadLatest() {
    if (!window.confirm("Reload the latest saved version? Unsaved changes in this tab will be discarded.")) return;
    dirtyRef.current = false;
    setHasUnsavedChanges(false);
    window.location.reload();
  }

  function addExperience() {
    if (dataRef.current.experience.length >= 25) return;
    const entry: Experience = { id: newId(), role: "", company: "", location: "", startDate: "", endDate: "", current: false, bullets: [] };
    updateData({ ...dataRef.current, experience: [...dataRef.current.experience, entry] });
  }

  function updateExperience(id: string, patch: Partial<Experience>) {
    updateData({ ...dataRef.current, experience: dataRef.current.experience.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) });
  }

  function addEducation() {
    if (dataRef.current.education.length >= 20) return;
    const entry: Education = { id: newId(), school: "", degree: "", field: "", location: "", startDate: "", endDate: "", details: "" };
    updateData({ ...dataRef.current, education: [...dataRef.current.education, entry] });
  }

  function updateEducation(id: string, patch: Partial<Education>) {
    updateData({ ...dataRef.current, education: dataRef.current.education.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) });
  }

  function addProject() {
    if (dataRef.current.projects.length >= 25) return;
    const entry: Project = { id: newId(), name: "", role: "", url: "", description: "" };
    updateData({ ...dataRef.current, projects: [...dataRef.current.projects, entry] });
  }

  function updateProject(id: string, patch: Partial<Project>) {
    updateData({ ...dataRef.current, projects: dataRef.current.projects.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) });
  }

  function addCertification() {
    if (dataRef.current.certifications.length >= 30) return;
    const entry: Certification = { id: newId(), name: "", issuer: "", date: "", url: "" };
    updateData({ ...dataRef.current, certifications: [...dataRef.current.certifications, entry] });
  }

  function updateCertification(id: string, patch: Partial<Certification>) {
    updateData({ ...dataRef.current, certifications: dataRef.current.certifications.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) });
  }

  function addAdditionalSection() {
    if (dataRef.current.additionalSections.length >= 10) return;
    const entry: AdditionalSection = { id: newId(), title: "", items: [] };
    updateData({ ...dataRef.current, additionalSections: [...dataRef.current.additionalSections, entry] });
  }

  function updateAdditionalSection(id: string, patch: Partial<AdditionalSection>) {
    updateData({ ...dataRef.current, additionalSections: dataRef.current.additionalSections.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) });
  }

  function addSkill() {
    const skill = skillInput.trim();
    if (dataRef.current.skills.length >= 50) return;
    if (!skill || dataRef.current.skills.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
    updateData({ ...dataRef.current, skills: [...dataRef.current.skills, skill] });
    setSkillInput("");
  }

  const currentStatus = {
    saved: "All changes saved",
    dirty: "Unsaved changes",
    saving: "Saving changes…",
    error: "Could not save",
    conflict: "Newer version found",
  }[saveState];

  return (
    <div className={styles.studio}>
      <aside className={styles.studioRail}>
        <div className={styles.studioRailInner}>
          <div className={styles.saveStatus} aria-live="polite">
            <span className={`${styles.saveDot} ${styles[`save-${saveState}`]}`} aria-hidden="true" />
            <span>{currentStatus}</span>
          </div>
          {saveMessage && <p className={styles.saveMessage} role={saveState === "error" || saveState === "conflict" ? "alert" : "status"}>{saveMessage}</p>}
          {saveState === "error" && <button className={styles.retryButton} onClick={retrySave} type="button">Retry save</button>}
          {saveState === "conflict" && <button className={styles.retryButton} onClick={reloadLatest} type="button">Reload latest version</button>}

          <div className={styles.ratingBox}>
            <div className={styles.ratingHeader}>
              <div>
                <span style={{ fontSize: "10px", color: "#617166", fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em" }}>Resume Rating</span>
                <div className={styles.ratingScore}>
                  <span className={styles.ratingNumber} style={{ color: rating.gradeColor }}>{rating.overallScore}</span>
                  <span className={styles.ratingMax}>/ 100</span>
                </div>
              </div>
              <span className={styles.ratingBadge} style={{ background: `${rating.gradeColor}18`, color: rating.gradeColor }}>
                {rating.grade}
              </span>
            </div>

            <div className={styles.ratingBars}>
              {Object.entries(rating.categories).map(([key, cat]) => (
                <div key={key}>
                  <div className={styles.ratingBarRow}>
                    <span>{cat.name}</span>
                    <span>{cat.score}%</span>
                  </div>
                  <div className={styles.ratingTrack}>
                    <div className={styles.ratingFill} style={{ width: `${cat.score}%`, background: rating.gradeColor }} />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={styles.ratingDetailsToggle}
              onClick={() => setShowRatingTips(!showRatingTips)}
            >
              {showRatingTips ? "Hide rating tips ▲" : "View rating tips ▼"}
            </button>

            {showRatingTips && (
              <ul className={styles.ratingTipsList}>
                {rating.topRecommendations.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            )}

            <GuardedLink className={styles.optimizeJump} href="/dashboard/optimize">
              <span>🎯</span> Optimize for Job →
            </GuardedLink>
          </div>

          <nav className={styles.sectionNav} aria-label="Resume sections">
            {sectionLinks.map(([id, label]) => <a href={`#section-${id}`} key={id}>{label}</a>)}
          </nav>
          <div className={styles.templatePicker}>
            <h2>Resume style</h2>
            <div role="group" aria-label="Resume template">
              {templates.map((item) => <button aria-pressed={template === item.id} className={template === item.id ? styles.templateSelected : ""} key={item.id} onClick={() => updateTemplate(item.id)} type="button"><strong>{item.name}</strong><span>{item.detail}</span></button>)}
            </div>
          </div>
          <a className={styles.previewJump} href="#resume-preview">Jump to live preview <span aria-hidden="true">↓</span></a>
          <button className={styles.printButton} onClick={() => window.print()} type="button">Print / save as PDF</button>
        </div>
      </aside>

      <div className={styles.editorColumn}>
        {variantId && <div className={styles.variantNotice}>Editing <strong>{variantName}</strong>. Your original resume stays unchanged. <GuardedLink href={`/dashboard/resumes/${resumeId}`}>Return to original</GuardedLink></div>}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f5f8f4", border: "1px solid #dce4d9", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
          <div>
            <span style={{ fontSize: "11px", color: "#546658", fontWeight: 600 }}>Active Style: <strong>{templates.find((t) => t.id === template)?.name}</strong></span>
            <span style={{ margin: "0 8px", color: "#b4c0b4" }}>·</span>
            <span style={{ fontSize: "11px", color: rating.gradeColor, fontWeight: 700 }}>ATS Rating: {rating.overallScore}/100 ({rating.grade})</span>
          </div>
          <GuardedLink className="button-text" style={{ fontSize: "11px" }} href="/dashboard/optimize">
            Match against a Job Description →
          </GuardedLink>
        </div>
        <section className={styles.editorSection} id="section-contact">
          <SectionTitle title="Contact information" description="The details a hiring team needs to reach you." />
          <div className={styles.fieldGrid}>
            <Field id="contact-name" label="Full name" value={data.contact.fullName} maxLength={120} onChange={(fullName) => updateData({ ...dataRef.current, contact: { ...dataRef.current.contact, fullName } })} />
            <Field id="contact-email" label="Email" type="email" value={data.contact.email} maxLength={254} onChange={(email) => updateData({ ...dataRef.current, contact: { ...dataRef.current.contact, email } })} onBlur={() => markTouched("contact.email")} error={fieldError("contact.email", data.contact.email)} />
            <Field id="contact-phone" label="Phone" type="tel" value={data.contact.phone} maxLength={50} onChange={(phone) => updateData({ ...dataRef.current, contact: { ...dataRef.current.contact, phone } })} />
            <Field id="contact-location" label="Location" value={data.contact.location} maxLength={120} placeholder="City, region" onChange={(location) => updateData({ ...dataRef.current, contact: { ...dataRef.current.contact, location } })} />
            <Field id="contact-linkedin" label="LinkedIn" type="url" value={data.contact.linkedIn} maxLength={2048} placeholder="https://…" onChange={(linkedIn) => updateData({ ...dataRef.current, contact: { ...dataRef.current.contact, linkedIn } })} onBlur={() => markTouched("contact.linkedIn")} error={fieldError("contact.linkedIn", data.contact.linkedIn)} />
            <Field id="contact-website" label="Website or portfolio" type="url" value={data.contact.website} maxLength={2048} placeholder="https://…" onChange={(website) => updateData({ ...dataRef.current, contact: { ...dataRef.current.contact, website } })} onBlur={() => markTouched("contact.website")} error={fieldError("contact.website", data.contact.website)} />
            <Field id="contact-portfolio" label="Additional professional link" type="url" value={data.contact.portfolio} maxLength={2048} placeholder="https://…" onChange={(portfolio) => updateData({ ...dataRef.current, contact: { ...dataRef.current.contact, portfolio } })} onBlur={() => markTouched("contact.portfolio")} error={fieldError("contact.portfolio", data.contact.portfolio)} />
          </div>
        </section>

        <section className={styles.editorSection} id="section-summary">
          <SectionTitle title="Professional summary" description="A concise introduction. Keep it in your own words." />
          <TextAreaField id="resume-summary" label="Summary" value={data.summary} maxLength={3000} rows={5} placeholder="What kind of work do you do, and what strengths do you bring?" onChange={(summary) => updateData({ ...dataRef.current, summary })} />
          <span className={styles.characterCount}>{data.summary.length} / 3,000</span>
        </section>

        <section className={styles.editorSection} id="section-experience">
          <SectionTitle title="Work experience" description="Add positions in reverse chronological order. Use bullets for specific contributions." />
          {data.experience.map((entry, index) => (
            <article className={styles.repeatEntry} key={entry.id}>
              <div className={styles.repeatHeader}><span>Position {index + 1}</span><EntryTools label={`position ${index + 1}`} canMoveUp={index > 0} canMoveDown={index < data.experience.length - 1} onMoveUp={() => updateData({ ...dataRef.current, experience: moveEntry(dataRef.current.experience, index, -1) })} onMoveDown={() => updateData({ ...dataRef.current, experience: moveEntry(dataRef.current.experience, index, 1) })} onRemove={() => updateData({ ...dataRef.current, experience: dataRef.current.experience.filter((item) => item.id !== entry.id) })} /></div>
              <div className={styles.fieldGrid}>
                <Field id={`experience-role-${entry.id}`} label="Role title" value={entry.role} maxLength={120} onChange={(role) => updateExperience(entry.id, { role })} onBlur={() => markTouched(`experience.${entry.id}.role`)} error={fieldError("experience.role", entry.role, `experience.${entry.id}.role`)} />
                <Field id={`experience-company-${entry.id}`} label="Organization" value={entry.company} maxLength={120} onChange={(company) => updateExperience(entry.id, { company })} onBlur={() => markTouched(`experience.${entry.id}.company`)} error={fieldError("experience.company", entry.company, `experience.${entry.id}.company`)} />
                <Field id={`experience-location-${entry.id}`} label="Location" value={entry.location} maxLength={120} onChange={(location) => updateExperience(entry.id, { location })} />
                <div className={styles.datePair}><Field id={`experience-start-${entry.id}`} label="Start" type="month" value={entry.startDate} onChange={(startDate) => updateExperience(entry.id, { startDate })} /><Field id={`experience-end-${entry.id}`} label="End" type="month" value={entry.endDate} disabled={entry.current} onChange={(endDate) => updateExperience(entry.id, { endDate })} /></div>
              </div>
              <label className={styles.checkField}><input checked={entry.current} onChange={(event) => updateExperience(entry.id, { current: event.target.checked, endDate: event.target.checked ? "" : entry.endDate })} type="checkbox" /> I currently work here</label>
              <div className={styles.bulletEditor}><h3>Highlights</h3>{entry.bullets.map((bullet, bulletIndex) => <div className={styles.bulletRow} key={`${entry.id}-bullet-${bulletIndex}`}><TextAreaField id={`experience-bullet-${entry.id}-${bulletIndex}`} label={`Highlight ${bulletIndex + 1}`} value={bullet} maxLength={700} rows={2} placeholder="Describe a contribution or outcome; leave blank until you have details." onChange={(value) => updateExperience(entry.id, { bullets: entry.bullets.map((item, currentIndex) => currentIndex === bulletIndex ? value : item) })} /><button aria-label={`Remove highlight ${bulletIndex + 1}`} onClick={() => updateExperience(entry.id, { bullets: entry.bullets.filter((_, currentIndex) => currentIndex !== bulletIndex) })} type="button">Remove</button></div>)}<AddButton disabled={entry.bullets.length >= 16} onClick={() => updateExperience(entry.id, { bullets: [...entry.bullets, ""] })}>Add highlight</AddButton></div>
            </article>
          ))}
          <AddButton disabled={data.experience.length >= 25} onClick={addExperience}>Add position</AddButton>
        </section>

        <section className={styles.editorSection} id="section-education">
          <SectionTitle title="Education" description="Include a degree, program, or other relevant study." />
          {data.education.map((entry, index) => <article className={styles.repeatEntry} key={entry.id}><div className={styles.repeatHeader}><span>Education {index + 1}</span><EntryTools label={`education ${index + 1}`} canMoveUp={index > 0} canMoveDown={index < data.education.length - 1} onMoveUp={() => updateData({ ...dataRef.current, education: moveEntry(dataRef.current.education, index, -1) })} onMoveDown={() => updateData({ ...dataRef.current, education: moveEntry(dataRef.current.education, index, 1) })} onRemove={() => updateData({ ...dataRef.current, education: dataRef.current.education.filter((item) => item.id !== entry.id) })} /></div><div className={styles.fieldGrid}><Field id={`education-school-${entry.id}`} label="School or institution" value={entry.school} maxLength={160} onChange={(school) => updateEducation(entry.id, { school })} /><Field id={`education-degree-${entry.id}`} label="Degree or program" value={entry.degree} maxLength={120} onChange={(degree) => updateEducation(entry.id, { degree })} /><Field id={`education-field-${entry.id}`} label="Field of study" value={entry.field} maxLength={120} onChange={(field) => updateEducation(entry.id, { field })} /><Field id={`education-location-${entry.id}`} label="Location" value={entry.location} maxLength={120} onChange={(location) => updateEducation(entry.id, { location })} /><Field id={`education-start-${entry.id}`} label="Start" type="month" value={entry.startDate} onChange={(startDate) => updateEducation(entry.id, { startDate })} /><Field id={`education-end-${entry.id}`} label="End" type="month" value={entry.endDate} onChange={(endDate) => updateEducation(entry.id, { endDate })} /></div><TextAreaField id={`education-details-${entry.id}`} label="Details" value={entry.details} maxLength={1200} rows={2} onChange={(details) => updateEducation(entry.id, { details })} /></article>)}
          <AddButton disabled={data.education.length >= 20} onClick={addEducation}>Add education</AddButton>
        </section>

        <section className={styles.editorSection} id="section-skills">
          <SectionTitle title="Skills" description="Add skills that are relevant to the roles you are pursuing." />
          <div className={styles.skillInput}><label className={styles.field} htmlFor="new-skill"><span>Add a skill</span><input id="new-skill" value={skillInput} maxLength={80} onChange={(event) => setSkillInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSkill(); } }} placeholder="Type a skill and press Enter" /></label><button className={styles.addButton} disabled={data.skills.length >= 50} onClick={addSkill} type="button">Add</button></div>
          {data.skills.length > 0 && <ul className={styles.skillChips}>{data.skills.map((skill, index) => <li key={`${skill}-${index}`}><span>{skill}</span><EntryTools label={`skill ${skill}`} canMoveUp={index > 0} canMoveDown={index < data.skills.length - 1} onMoveUp={() => updateData({ ...dataRef.current, skills: moveEntry(dataRef.current.skills, index, -1) })} onMoveDown={() => updateData({ ...dataRef.current, skills: moveEntry(dataRef.current.skills, index, 1) })} onRemove={() => updateData({ ...dataRef.current, skills: dataRef.current.skills.filter((_, itemIndex) => itemIndex !== index) })} /></li>)}</ul>}
        </section>

        <section className={styles.editorSection} id="section-projects">
          <SectionTitle title="Projects" description="Add selected work, personal projects, or other relevant examples." />
          {data.projects.map((entry, index) => <article className={styles.repeatEntry} key={entry.id}><div className={styles.repeatHeader}><span>Project {index + 1}</span><EntryTools label={`project ${index + 1}`} canMoveUp={index > 0} canMoveDown={index < data.projects.length - 1} onMoveUp={() => updateData({ ...dataRef.current, projects: moveEntry(dataRef.current.projects, index, -1) })} onMoveDown={() => updateData({ ...dataRef.current, projects: moveEntry(dataRef.current.projects, index, 1) })} onRemove={() => updateData({ ...dataRef.current, projects: dataRef.current.projects.filter((item) => item.id !== entry.id) })} /></div><div className={styles.fieldGrid}><Field id={`project-name-${entry.id}`} label="Project name" value={entry.name} maxLength={120} onChange={(name) => updateProject(entry.id, { name })} /><Field id={`project-role-${entry.id}`} label="Your role" value={entry.role} maxLength={120} onChange={(role) => updateProject(entry.id, { role })} /><Field id={`project-url-${entry.id}`} label="Project link" type="url" value={entry.url} maxLength={2048} onChange={(url) => updateProject(entry.id, { url })} onBlur={() => markTouched(`project.${entry.id}.url`)} error={fieldError("project.url", entry.url)} /></div><TextAreaField id={`project-description-${entry.id}`} label="What did you do?" value={entry.description} maxLength={1600} rows={3} onChange={(description) => updateProject(entry.id, { description })} /></article>)}
          <AddButton disabled={data.projects.length >= 25} onClick={addProject}>Add project</AddButton>
        </section>

        <section className={styles.editorSection} id="section-certifications">
          <SectionTitle title="Certifications" description="Optional credentials relevant to your work." />
          {data.certifications.map((entry, index) => <article className={styles.repeatEntry} key={entry.id}><div className={styles.repeatHeader}><span>Certification {index + 1}</span><EntryTools label={`certification ${index + 1}`} canMoveUp={index > 0} canMoveDown={index < data.certifications.length - 1} onMoveUp={() => updateData({ ...dataRef.current, certifications: moveEntry(dataRef.current.certifications, index, -1) })} onMoveDown={() => updateData({ ...dataRef.current, certifications: moveEntry(dataRef.current.certifications, index, 1) })} onRemove={() => updateData({ ...dataRef.current, certifications: dataRef.current.certifications.filter((item) => item.id !== entry.id) })} /></div><div className={styles.fieldGrid}><Field id={`certification-name-${entry.id}`} label="Credential" value={entry.name} maxLength={160} onChange={(name) => updateCertification(entry.id, { name })} /><Field id={`certification-issuer-${entry.id}`} label="Issuing organization" value={entry.issuer} maxLength={160} onChange={(issuer) => updateCertification(entry.id, { issuer })} /><Field id={`certification-date-${entry.id}`} label="Date" type="month" value={entry.date} onChange={(date) => updateCertification(entry.id, { date })} /><Field id={`certification-url-${entry.id}`} label="Credential link" type="url" value={entry.url} maxLength={2048} onChange={(url) => updateCertification(entry.id, { url })} onBlur={() => markTouched(`certification.${entry.id}.url`)} error={fieldError("certification.url", entry.url)} /></div></article>)}
          <AddButton disabled={data.certifications.length >= 30} onClick={addCertification}>Add certification</AddButton>
        </section>

        <section className={styles.editorSection} id="section-additional">
          <SectionTitle title="Additional sections" description="Optional sections for information that does not fit elsewhere." />
          {data.additionalSections.map((section, index) => <article className={styles.repeatEntry} key={section.id}><div className={styles.repeatHeader}><span>Additional section {index + 1}</span><EntryTools label={`additional section ${index + 1}`} canMoveUp={index > 0} canMoveDown={index < data.additionalSections.length - 1} onMoveUp={() => updateData({ ...dataRef.current, additionalSections: moveEntry(dataRef.current.additionalSections, index, -1) })} onMoveDown={() => updateData({ ...dataRef.current, additionalSections: moveEntry(dataRef.current.additionalSections, index, 1) })} onRemove={() => updateData({ ...dataRef.current, additionalSections: dataRef.current.additionalSections.filter((item) => item.id !== section.id) })} /></div><Field id={`additional-title-${section.id}`} label="Section title" value={section.title} maxLength={80} onChange={(title) => updateAdditionalSection(section.id, { title })} /><TextAreaField id={`additional-items-${section.id}`} label="Items" value={section.items.join("\n")} maxLength={30_000} rows={4} placeholder="One item per line" onChange={(value) => updateAdditionalSection(section.id, { items: value.split("\n").slice(0, 30) })} /></article>)}
          <AddButton disabled={data.additionalSections.length >= 10} onClick={addAdditionalSection}>Add section</AddButton>
        </section>

        <section className={styles.variantSection}>
          <h2>Job-specific versions</h2>
          <p>Start a tailored copy from the saved original. Changes stay in that version.</p>
          {variants.length > 0 && <ul className={styles.variantList}>{variants.map((variant) => <li key={variant.id}><GuardedLink href={`/dashboard/resumes/${resumeId}?variant=${variant.id}`}>{variant.name}</GuardedLink></li>)}</ul>}
          {!variantId && <details className={styles.variantCreate}>
            <summary>Create a tailored copy</summary>
            {saveState !== "saved" ? <p>Save the current edits before creating a new copy.</p> : jobDescriptions.length === 0 ? <p>Save a job description for this resume first in <GuardedLink href="/dashboard/optimize">Job descriptions</GuardedLink>.</p> : <ResumeVariantForm resumeId={resumeId} jobDescriptions={jobDescriptions} />}
          </details>}
        </section>
      </div>

      <aside className={styles.previewColumn} id="resume-preview">
        <div className={styles.previewHeading}><span>Live preview</span><span>{templates.find((item) => item.id === template)?.name}</span></div>
        <ResumePreview data={data} template={template} />
      </aside>
    </div>
  );
}