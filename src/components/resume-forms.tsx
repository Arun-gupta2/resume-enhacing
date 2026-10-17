"use client";

import { useActionState } from "react";
import { createResumeAction, type DashboardActionState } from "@/app/dashboard/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

const emptyState: DashboardActionState = {};

export function NewResumeForm() {
  const [state, action] = useActionState(createResumeAction, emptyState);
  return (
    <form className="workspace-form" action={action}>
      <label htmlFor="resume-title">Resume title</label>
      <input id="resume-title" autoFocus maxLength={120} name="title" placeholder="e.g. Product designer" required />
      {state.error && <p className="action-feedback error" role="alert">{state.error}</p>}
      <FormSubmitButton>Create resume</FormSubmitButton>
    </form>
  );
}
