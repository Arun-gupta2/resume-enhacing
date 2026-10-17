"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Proofline home">
          <span className="brand-mark" aria-hidden="true">
            p
          </span>
          <span>proofline</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/#product">Product</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
        </nav>
        <div className="header-actions">
          <Link className="login-link" href="/login">
            Log in
          </Link>
          <Link className="button button-dark" href="/sign-up">
            Get started <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <details className="mobile-menu">
          <summary aria-label="Open navigation menu">
            <span className="menu-glyph" aria-hidden="true" />
          </summary>
          <nav className="mobile-menu-panel" aria-label="Mobile navigation">
            <Link href="/#product">Product</Link>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/login">Log in</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-main">
          <div className="footer-brand">
            <Link className="brand" href="/" aria-label="Proofline home">
              <span className="brand-mark" aria-hidden="true">
                p
              </span>
              <span>proofline</span>
            </Link>
            <p>A more thoughtful way to tell the story of your work.</p>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <Link href="/#product">Product</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/login">Log in</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>Proofline · Resume clarity for work ahead</span>
          <span>Product preview. Accounts and checkout are not connected.</span>
        </div>
      </div>
    </footer>
  );
}