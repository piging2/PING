"use client";

import Link from "next/link";

/**
 * DataPractices — transparent data collection section for the PING website.
 *
 * Drop-in for the PING website (repo: /home/nolan/projects/ping on the Pig).
 * Owner-facing language only: no internal architecture names. The full
 * principles live in ~/workspace/ping-social/data-ownership-principles-2026-09-25.md.
 */

const practices = [
  {
    title: "Your customers are yours.",
    body: "Names, phone numbers, addresses, and conversations stay in your business system. We don't sell your customer list, and we never pool identifiable customer records across businesses. What we learn across businesses is limited to identity-reduced patterns, like which response times book more jobs, that pass aggregation and provenance controls. You are not renting your customers from us.",
  },
  {
    title: "We learn from outcomes, not identities.",
    body: "PING gets smarter from what worked: how fast a lead got answered, whether it booked, what it was worth. It does not need to know who your customers are to learn that. Patterns, not people.",
  },
  {
    title: "When we touch customer info, it's bounded.",
    body: "If the job needs it, like texting a customer that a tech is running late, we use only what that task requires, only for as long as it needs it. When the purpose expires or you ask us to delete, we remove it or render it inaccessible in our systems. Audit records may remain, but they don't keep your customer content.",
  },
  {
    title: "Export or delete everything, anytime.",
    body: "Your customer list, your history, your whole account. Export it, delete it, cut off our access. If 'you own your customers' is going to mean anything, it has to actually work, not just sound good.",
  },
  {
    title: "We tell you what we collect and why.",
    body: "Every piece of data has a stated purpose: serving your customers, running your marketing, or improving the system. If it doesn't serve one of those, we don't take it.",
  },
];

export function DataPractices() {
  return (
    <section aria-label="How we handle your data" className="mx-auto max-w-6xl px-6 py-20">
      <p className="text-lg font-medium text-honey">Transparent data practices</p>
      <h2 className="mt-4 text-4xl font-bold text-text-on-dark sm:text-5xl">
        Your business stays your business.
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-text-on-dark/90">
        Most marketing depends on someone remembering to do it. Yours doesn't.
        And none of it requires handing us your customer list.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {practices.map((p) => (
          <article
            key={p.title}
            className="rounded-2xl border border-text-on-dark/20 p-8"
          >
            <h3 className="text-xl font-bold text-text-on-dark">{p.title}</h3>
            <p className="mt-3 text-text-on-dark/90">{p.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-12 max-w-2xl">
        <p className="text-text-on-dark/80">
          The short version: your business system holds your customer truth. PING
          is the intelligence and execution layer that makes those relationships
          more valuable. That's the deal, in writing, on this page.
        </p>
        <Link
          href="#start"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-honey px-8 font-semibold text-honey-foreground transition-colors hover:bg-honey-hover"
        >
          Start with a conversation
        </Link>
      </div>
    </section>
  );
}
