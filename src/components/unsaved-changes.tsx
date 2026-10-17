"use client";

import Link, { type LinkProps } from "next/link";
import { createContext, useContext, useState, type AnchorHTMLAttributes, type ReactNode } from "react";

type UnsavedChangesContextValue = {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  return <UnsavedChangesContext value={{ hasUnsavedChanges, setHasUnsavedChanges }}>{children}</UnsavedChangesContext>;
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) throw new Error("useUnsavedChanges must be used within UnsavedChangesProvider");
  return context;
}

type GuardedLinkProps = LinkProps & AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode };

export function GuardedLink({ onClick, children, ...props }: GuardedLinkProps) {
  const { hasUnsavedChanges } = useUnsavedChanges();

  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !hasUnsavedChanges) return;
        if (!window.confirm("You have unsaved resume edits. Leave this page and discard them?")) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </Link>
  );
}