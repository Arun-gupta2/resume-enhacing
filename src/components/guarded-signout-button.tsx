"use client";

import { useUnsavedChanges } from "@/components/unsaved-changes";

export function GuardedSignOutButton() {
  const { hasUnsavedChanges } = useUnsavedChanges();

  return (
    <button
      className="dashboard-signout"
      onClick={(event) => {
        if (hasUnsavedChanges && !window.confirm("You have unsaved resume edits. Sign out and discard them?")) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      Sign out
    </button>
  );
}