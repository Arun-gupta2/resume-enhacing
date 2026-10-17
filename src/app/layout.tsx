import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Proofline | A better first draft for your next role",
    template: "%s | Proofline",
  },
  description: "Shape a clearer, more relevant resume for the work you want to do next.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}><SiteHeader /></Suspense>
        {children}
        <Suspense fallback={null}><SiteFooter /></Suspense>
      </body>
    </html>
  );
}
