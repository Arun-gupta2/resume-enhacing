"use client";

import { useActionState } from "react";
import {
  createResumeVariantAction,
  type DashboardActionState,
} from "@/app/dashboard/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

const initialState: DashboardActionState = {};

export function ResumeVariantForm({
  resumeId,
  jobDescriptions,
}: {
  resumeId: string;
  jobDescriptions: { id: string; title: string; company: string | null }[];
}) {
  const [state, action] = useActionState(createResumeVariantAction, initialState);

  return (
    <form action={action}>
      <input name="resumeId" type="hidden" value={resumeId} />
      <label className="variant-field" htmlFor="variant-name">
        <span>Copy name</span>
        <input id="variant-name" name="name" maxLength={120} required placeholder="e.g. Product design role" />
      </label>
      <label className="variant-field" htmlFor="variant-job-description">
        <span>Saved job description</span>
        <select id="variant-job-description" name="jobDescriptionId" defaultValue="" required>
          <option disabled value="">Choose a role</option>
          {jobDescriptions.map((job) => <option key={job.id} value={job.id}>{job.title}{job.company ? ` · ${job.company}` : ""}</option>)}
        </select>
      </label>
      {state.error && <p className="action-feedback error" role="alert">{state.error}</p>}
      <FormSubmitButton pendingLabel="Creating copy…">Create tailored copy</FormSubmitButton>
    </form>
  );
}