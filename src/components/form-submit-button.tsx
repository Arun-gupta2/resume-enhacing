"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function FormSubmitButton({
  children,
  pendingLabel = "Saving…",
  className = "button button-dark",
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} type="submit">{pending ? pendingLabel : children}</button>;
}