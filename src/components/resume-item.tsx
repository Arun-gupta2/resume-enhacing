"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ResumeSummary } from "@/lib/data/dashboard";
import {
  deleteResumeAction,
  duplicateResumeAction,
  renameResumeAction,
  updateResumeStatusAction,
  type DashboardActionState,
} from "@/app/dashboard/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

const emptyState: DashboardActionState = {};

function ActionFeedback({ state }: { state: DashboardActionState }) {
  if (state.error) return <p className="action-feedback error" role="alert">{state.error}</p>;
  if (state.success) return <p className="action-feedback success" role="status">{state.success}</p>;
  return null;
}

export function ResumeItem({ resume }: { resume: ResumeSummary }) {
  const [renameState, renameAction] = useActionState(renameResumeAction, emptyState);
  const [statusState, statusAction] = useActionState(updateResumeStatusAction, emptyState);
  const [duplicateState, duplicateAction] = useActionState(duplicateResumeAction, emptyState);
  const [deleteState, deleteAction] = useActionState(deleteResumeAction, emptyState);

  return (
    <article className="resume-row">
      <div className="resume-row-main">
        <div>
          <h2><Link href={`/dashboard/resumes/${resume.id}`}>{resume.title}</Link></h2>
          <p>Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(resume.updatedAt))}</p>
        </div>
        <span className={`status-badge status-${resume.status}`}>{resume.status}</span>
        <Link className="button button-outline resume-edit-link" href={`/dashboard/resumes/${resume.id}`}>Edit</Link>
      </div>
      <details className="resume-manage">
        <summary>Manage resume</summary>
        <div className="resume-manage-grid">
          <form action={renameAction}>
            <input name="resumeId" type="hidden" value={resume.id} />
            <label>Rename
              <span className="inline-input-row">
                <input aria-label={`New title for ${resume.title}`} maxLength={120} name="title" required defaultValue={resume.title} />
                <FormSubmitButton className="button button-outline" pendingLabel="Saving…">Save name</FormSubmitButton>
              </span>
            </label>
            <ActionFeedback state={renameState} />
          </form>
          <form action={statusAction}>
            <input name="resumeId" type="hidden" value={resume.id} />
            <label>Status
              <span className="inline-input-row">
                <select aria-label={`Status for ${resume.title}`} name="status" defaultValue={resume.status}>
                  <option value="draft">Draft</option>
                  <option value="ready">Ready</option>
                  <option value="archived">Archived</option>
                </select>
                <FormSubmitButton className="button button-outline" pendingLabel="Saving…">Update</FormSubmitButton>
              </span>
            </label>
            <ActionFeedback state={statusState} />
          </form>
          <form action={duplicateAction}>
            <input name="resumeId" type="hidden" value={resume.id} />
            <label>Duplicate as
              <span className="inline-input-row">
                <input aria-label={`Copy title for ${resume.title}`} maxLength={120} name="title" required defaultValue={`Copy of ${resume.title}`} />
                <FormSubmitButton className="button button-outline" pendingLabel="Copying…">Duplicate</FormSubmitButton>
              </span>
            </label>
            <ActionFeedback state={duplicateState} />
          </form>
          <details className="delete-confirm">
            <summary>Delete resume</summary>
            <form action={deleteAction}>
              <input name="resumeId" type="hidden" value={resume.id} />
              <p>This permanently deletes “{resume.title}” and its saved versions and analyses.</p>
              <FormSubmitButton className="button button-danger" pendingLabel="Deleting…">Yes, delete this resume</FormSubmitButton>
              <ActionFeedback state={deleteState} />
            </form>
          </details>
        </div>
      </details>
    </article>
  );
}