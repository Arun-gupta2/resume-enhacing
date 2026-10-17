"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { createResumeAction, type DashboardActionState } from "@/app/dashboard/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import type { ResumeTemplate } from "@/lib/resume/schema";
import styles from "./new-resume-type-picker.module.css";

const emptyState: DashboardActionState = {};

type ResumeArchetype = {
  id: ResumeTemplate;
  title: string;
  badge: string;
  desc: string;
  bestFor: string;
  defaultTitle: string;
};

const ARCHETYPES: ResumeArchetype[] = [
  {
    id: "modern",
    title: "Modern Technical",
    badge: "Highest ATS Match",
    desc: "Clean split-rail layout with prominent skills chips, modern sans-serif typography, and metrics-driven experience blocks.",
    bestFor: "Software Engineers, Product Managers, Data Scientists, Designers",
    defaultTitle: "Senior Software Engineer Resume",
  },
  {
    id: "editorial",
    title: "Executive & Classic",
    badge: "Leadership & Formal",
    desc: "Measured, classic serif typography with centered header, formal section dividers, and authoritative career trajectory storytelling.",
    bestFor: "Executives, Operations, Legal, Consulting, Finance, Healthcare",
    defaultTitle: "Director of Operations Resume",
  },
  {
    id: "compact",
    title: "Compact 1-Page",
    badge: "Zero White Space Waste",
    desc: "Dense single-column format engineered to fit comprehensive experience onto exactly one clean page without spilling over.",
    bestFor: "New Grads, Career Switchers, Dense 1-Page Requirements",
    defaultTitle: "Full Stack Developer (1-Page)",
  },
];

const POPULAR_TITLES = [
  "Senior Full Stack Engineer",
  "Product Designer",
  "DevOps & Cloud Engineer",
  "Product Manager",
  "Data Scientist",
  "Engineering Manager",
];

export function NewResumeTypePicker() {
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>("modern");
  const [title, setTitle] = useState("Senior Full Stack Engineer");
  const [state, action] = useActionState(createResumeAction, emptyState);

  const activeArchetype = ARCHETYPES.find((a) => a.id === selectedTemplate) || ARCHETYPES[0];

  function handleSelectTemplate(item: ResumeArchetype) {
    setSelectedTemplate(item.id);
    if (!title || ARCHETYPES.some((a) => a.defaultTitle === title)) {
      setTitle(item.defaultTitle);
    }
  }

  return (
    <div className={styles.pickerWrap}>
      <div className={styles.modeSwitch}>
        <button className={`${styles.modeButton} ${styles.modeButtonActive}`} type="button">
          <span aria-hidden="true">✍</span> Create from scratch
        </button>
        <Link className={styles.modeUploadLink} href="/dashboard/resumes/upload">
          <span aria-hidden="true">📄</span> Or upload existing resume (PDF/DOCX) →
        </Link>
      </div>

      <div className={styles.archetypeHeader}>
        <h2>Choose your resume style & archetype</h2>
        <p>Select the structure that best fits your target role. You can switch styles anytime in the editor.</p>
      </div>

      <div className={styles.cardGrid} role="radiogroup" aria-label="Resume style options">
        {ARCHETYPES.map((item) => {
          const isSelected = selectedTemplate === item.id;
          return (
            <article
              key={item.id}
              className={`${styles.typeCard} ${isSelected ? styles.typeCardSelected : ""}`}
              onClick={() => handleSelectTemplate(item)}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelectTemplate(item);
                }
              }}
            >
              <span className={styles.badge}>{item.badge}</span>
              <div className={styles.miniVisual} aria-hidden="true">
                <div className={styles.visualHeader} />
                <div className={styles.visualSub} />
                <div className={styles.visualLine} />
                <div className={`${styles.visualLine} ${styles.visualShort}`} />
              </div>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardDesc}>{item.desc}</p>
              <div className={styles.cardBestFor}>
                Best for: <span>{item.bestFor}</span>
              </div>
            </article>
          );
        })}
      </div>

      <form className={styles.formBox} action={action}>
        <input type="hidden" name="template" value={selectedTemplate} />

        <div className={styles.inputGroup}>
          <label htmlFor="resume-title">Resume title or target role</label>
          <input
            id="resume-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.titleInput}
            placeholder="e.g. Senior Software Engineer"
            maxLength={120}
            required
          />
          <div className={styles.suggestChips}>
            <span>Quick fill:</span>
            {POPULAR_TITLES.map((preset) => (
              <button
                key={preset}
                type="button"
                className={styles.chipBtn}
                onClick={() => setTitle(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <label className={styles.starterCheck}>
          <input type="checkbox" defaultChecked name="includeStarter" />
          <span>
            <strong>Pre-fill with professional starter content</strong> — Start with high-impact bullet points and structured sections you can immediately tailor.
          </span>
        </label>

        {state.error && <p className="action-feedback error" role="alert">{state.error}</p>}

        <div className={styles.submitBar}>
          <Link className="button-text" href="/dashboard/resumes">
            ← Cancel
          </Link>
          <FormSubmitButton>
            Create {activeArchetype.title} Resume & Open Studio →
          </FormSubmitButton>
        </div>
      </form>
    </div>
  );
}
