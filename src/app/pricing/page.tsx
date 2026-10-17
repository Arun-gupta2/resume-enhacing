import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Pricing", description: "Preview Proofline plans and what is planned for launch." };

const plans = [
  { name: "Essential", description: "A considered start for your next application.", price: "$0", cadence: " / always", features: ["One resume workspace", "Core resume layouts", "Role-alignment overview", "Download-ready formatting"] },
  { name: "Studio", description: "More room to shape every application.", price: "$12", cadence: " / month", features: ["Multiple tailored resumes", "Detailed role comparisons", "Expanded template collection", "Version history and exports"] },
];

export default function PricingPage() {
  return (
    <main>
      <section className="inner-hero"><div className="page-wrap"><span className="eyebrow">Pricing preview</span><h1>Clear plans. No surprise fine print.</h1><p>A first look at how Proofline could be priced. These are launch concepts, not active subscriptions.</p></div></section>
      <section className="page-section"><div className="page-wrap">
        <div className="section-heading"><h2>Choose the room you need.</h2><p>Start with the essentials, then add space for more roles and versions when you need it.</p></div>
        <div className="pricing-grid" id="plans">{plans.map((plan) => <article className="price-plan" key={plan.name}><h2>{plan.name}</h2><p>{plan.description}</p><div className="price-value">{plan.price}<small>{plan.cadence}</small></div><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><Link className="button button-outline" href="/sign-up">Preview account access <span aria-hidden="true">↗</span></Link></article>)}</div>
        <p className="notice">Preview only: these prices and plan details are illustrative. Account creation, resume tools, and payment are not connected in this build.</p>
      </div></section>
    </main>
  );
}