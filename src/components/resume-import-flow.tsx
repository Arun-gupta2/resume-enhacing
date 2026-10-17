"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ResumePreview } from "@/components/resume-preview";
import { resumeDataSchema, type ResumeData } from "@/lib/resume/schema";
import styles from "./resume-import-flow.module.css";

type ParsedImport = {
  fileName: string;
  mediaType: string;
  data: ResumeData;
  warnings: string[];
  pageCount: number | null;
};

type ImportResponse = { error?: string; data?: ParsedImport; resumeId?: string };

export function ResumeImportFlow() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [data, setData] = useState<ResumeData | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<"parse" | "save" | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const dirtyRef = useRef(false);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  function updateData(next: ResumeData) {
    dirtyRef.current = true;
    setData(next);
    setError("");
    setStatus("Reviewing extracted information");
  }

  async function parseFile() {
    if (!file) {
      setError("Choose a PDF or DOCX file first.");
      return;
    }
    setBusy("parse");
    setError("");
    setStatus("");
    const form = new FormData();
    form.set("file", file);

    try {
      const response = await fetch("/api/resume-import/parse", { method: "POST", body: form });
      const result = await response.json() as ImportResponse & Partial<ParsedImport>;
      const parsedData: ParsedImport | undefined = result.data?.fileName ? result.data : (result.fileName ? (result as unknown as ParsedImport) : undefined);
      if (!response.ok || !parsedData) {
        setError(result.error ?? "This document could not be read.");
        return;
      }
      setParsed(parsedData);
      setData(parsedData.data);
      setTitle((parsedData.fileName || "Imported Resume").replace(/\.(pdf|docx)$/i, "").slice(0, 120));
      dirtyRef.current = true;
      setStatus("Review the extracted details before saving.");
    } catch {
      setError("The import service could not be reached. Your file remains selected; try again.");
    } finally {
      setBusy(null);
    }
  }

  async function saveResume() {
    if (!file || !parsed || !data) return;
    const validation = resumeDataSchema.safeParse(data);
    if (!validation.success) {
      setError(`Review ${validation.error.issues[0]?.path.join(".") || "the resume fields"}: ${validation.error.issues[0]?.message ?? "Invalid data."}`);
      return;
    }
    if (!title.trim() || title.trim().length > 120) {
      setError("Resume title must be from 1 to 120 characters.");
      return;
    }

    setBusy("save");
    setError("");
    const form = new FormData();
    form.set("file", file);
    form.set("title", title.trim());
    form.set("content", JSON.stringify(validation.data));

    try {
      const response = await fetch("/api/resume-import/save", { method: "POST", body: form });
      const result = await response.json() as ImportResponse;
      if (!response.ok || !result.resumeId) {
        setError(result.error ?? "The resume could not be saved. Your reviewed content is still here.");
        return;
      }
      dirtyRef.current = false;
      router.push(`/dashboard/resumes/${result.resumeId}`);
    } catch {
      setError("The save service could not be reached. Your reviewed content is still here; retry when connected.");
    } finally {
      setBusy(null);
    }
  }

  function updateExperience(index: number, patch: Partial<ResumeData["experience"][number]>) {
    if (!data) return;
    updateData({ ...data, experience: data.experience.map((entry, current) => current === index ? { ...entry, ...patch } : entry) });
  }

  return (
    <div className={styles.importFlow}>
      <section className={styles.importForm}>
        {!parsed ? (
          <>
            <h2>Choose a resume file</h2>
            <p>PDF and DOCX, up to 10 MB. Scanned PDFs need OCR before their text can be imported.</p>
            <label className={styles.fileLabel} htmlFor="resume-import-file">Resume file</label>
            <input id="resume-import-file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); }} type="file" />
            {file && <p className={styles.fileMeta}>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button className="button button-dark" disabled={!file || busy !== null} onClick={parseFile} type="button">{busy === "parse" ? "Reading file…" : "Extract text for review"}</button>
          </>
        ) : data ? (
          <>
            <div className={styles.reviewHeading}>
              <div><span className="eyebrow">Review before saving</span><h2>Check what was read.</h2><p>{parsed.fileName}{parsed.pageCount ? ` · ${parsed.pageCount} pages` : ""}</p></div>
              <button className="button button-outline" disabled={busy !== null} onClick={() => { setParsed(null); setData(null); setFile(null); dirtyRef.current = false; }} type="button">Choose another file</button>
            </div>
            {parsed.warnings.map((warning) => <p className={styles.warning} key={warning} role="status">{warning}</p>)}
            <label className={styles.field} htmlFor="import-resume-title"><span>Resume title</span><input id="import-resume-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label>
            <h3>Contact information</h3>
            <div className={styles.fieldGrid}>
              <label className={styles.field} htmlFor="import-name"><span>Name</span><input id="import-name" maxLength={120} value={data.contact.fullName} onChange={(event) => updateData({ ...data, contact: { ...data.contact, fullName: event.target.value } })} /></label>
              <label className={styles.field} htmlFor="import-email"><span>Email</span><input id="import-email" type="email" maxLength={254} value={data.contact.email} onChange={(event) => updateData({ ...data, contact: { ...data.contact, email: event.target.value } })} /></label>
              <label className={styles.field} htmlFor="import-phone"><span>Phone</span><input id="import-phone" type="tel" maxLength={50} value={data.contact.phone} onChange={(event) => updateData({ ...data, contact: { ...data.contact, phone: event.target.value } })} /></label>
              <label className={styles.field} htmlFor="import-location"><span>Location</span><input id="import-location" maxLength={120} value={data.contact.location} onChange={(event) => updateData({ ...data, contact: { ...data.contact, location: event.target.value } })} /></label>
            </div>
            <label className={styles.field} htmlFor="import-summary"><span>Professional summary</span><textarea id="import-summary" rows={5} maxLength={3000} value={data.summary} onChange={(event) => updateData({ ...data, summary: event.target.value })} /></label>
            <h3>Experience</h3>
            {data.experience.length ? data.experience.map((entry, index) => <fieldset className={styles.reviewEntry} key={entry.id}><legend>Position {index + 1}</legend><div className={styles.fieldGrid}><label className={styles.field} htmlFor={`import-role-${entry.id}`}><span>Role</span><input id={`import-role-${entry.id}`} maxLength={120} value={entry.role} onChange={(event) => updateExperience(index, { role: event.target.value })} /></label><label className={styles.field} htmlFor={`import-company-${entry.id}`}><span>Organization</span><input id={`import-company-${entry.id}`} maxLength={120} value={entry.company} onChange={(event) => updateExperience(index, { company: event.target.value })} /></label></div><label className={styles.field} htmlFor={`import-bullets-${entry.id}`}><span>Highlights, one per line</span><textarea id={`import-bullets-${entry.id}`} rows={4} maxLength={12000} value={entry.bullets.join("\n")} onChange={(event) => updateExperience(index, { bullets: event.target.value.split("\n").slice(0, 16) })} /></label></fieldset>) : <p className={styles.muted}>No position headings could be confidently identified. Unclassified text is preserved below.</p>}
            <label className={styles.field} htmlFor="import-skills"><span>Skills, separated by commas</span><textarea id="import-skills" rows={3} maxLength={5000} value={data.skills.join(", ")} onChange={(event) => updateData({ ...data, skills: [...new Set(event.target.value.split(/[,;\n]+/).map((skill) => skill.trim()).filter(Boolean))].slice(0, 50) })} /></label>
            {data.education.length > 0 && <p className={styles.muted}>Education has been mapped into structured fields and will be editable in the studio after saving.</p>}
            {data.additionalSections.length > 0 && <><h3>Other extracted sections</h3>{data.additionalSections.map((section, index) => <fieldset className={styles.reviewEntry} key={section.id}><legend>{section.title || `Section ${index + 1}`}</legend><label className={styles.field} htmlFor={`import-additional-${section.id}`}><span>Review this text</span><textarea id={`import-additional-${section.id}`} rows={4} maxLength={54000} value={section.items.join("\n\n")} onChange={(event) => updateData({ ...data, additionalSections: data.additionalSections.map((item, current) => current === index ? { ...item, items: event.target.value.split(/\n\s*\n/).slice(0, 30) } : item) })} /></label></fieldset>)}</>}
            {error && <p className={styles.error} role="alert">{error}</p>}
            {status && <p className={styles.muted} role="status">{status}</p>}
            <button className="button button-dark" disabled={busy !== null} onClick={saveResume} type="button">{busy === "save" ? "Saving privately…" : "Save reviewed resume"}</button>
            <p className={styles.privacyNote}>The original file is stored in your private workspace. It is not given a public URL.</p>
          </>
        ) : null}
      </section>
      {data && <aside className={styles.preview}><div className={styles.previewTitle}>Resume preview</div><ResumePreview data={data} template="editorial" /></aside>}
    </div>
  );
}