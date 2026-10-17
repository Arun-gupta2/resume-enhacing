import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Frequently asked questions", description: "Answers about the Proofline product preview and future plans." };

const questions = [
  ["What is Proofline?", "Proofline is a resume and job-description optimization product concept. The goal is to help people make their experience clearer and more relevant to the role they want, while keeping their own judgment and voice in the process."],
  ["Can I build or edit a resume in this preview?", "Not yet. The editor shown on the homepage is a static product concept. This build contains the marketing website only; resume editing, exports, and document storage are not connected."],
  ["What does the compatibility score represent?", "The score in the product illustration is an example, not a live analysis. A future score is intended to summarize how role language relates to evidence in a resume, with the reasons shown alongside it. It cannot predict an interview or hiring decision."],
  ["Does Proofline rewrite my resume automatically?", "No automatic rewrite is available in this preview. The product direction is to suggest places to add context and let you decide which changes accurately represent your work."],
  ["Are accounts, privacy controls, or payments available?", "No. Authentication, private storage, and checkout have not been connected. Do not submit personal information or upload a resume to this marketing preview."],
  ["What are the prices on the pricing page?", "They are illustrative launch concepts only. No subscription or payment can be started from this build."],
];

export default function FaqPage() {
  return (
    <main>
      <section className="inner-hero"><div className="page-wrap"><span className="eyebrow">The useful details</span><h1>Good questions deserve clear answers.</h1><p>Here is what this Proofline preview is, what it is not, and what the product is being shaped to do.</p></div></section>
      <section className="page-section"><div className="page-wrap"><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p className="faq-answer">{answer}</p></details>)}</div><p className="notice">This is a marketing-site preview. For the intended product flow, see the <Link href="/#product">product concept</Link>.</p></div></section>
    </main>
  );
}