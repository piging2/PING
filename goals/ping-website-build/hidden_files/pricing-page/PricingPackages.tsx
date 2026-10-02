"use client";

import Link from "next/link";

/**
 * PricingPackages — PING Social concierge packages section.
 *
 * Drop-in for the PING website (repo: /home/nolan/projects/ping on the Pig).
 * Suggested placement: new section on the PING Social page, or its own
 * /pricing route rendering this component. Uses the site's existing theme
 * tokens (honey, text-on-dark). Copy is owner-facing: no internals, no
 * redundancy, technical detail lives elsewhere on the page.
 */

const packages = [
  {
    name: "Launch",
    price: "$500",
    per: "one-time + $300/mo",
    tagline: "Presence. Stop losing the jobs you already won.",
    features: [
      "A website that looks like your shop, not a template",
      "Your Google profile built and tuned so customers find you first",
      "Every missed call gets a text back in under a minute",
      "Review requests go out on their own after every job",
    ],
    featured: false,
  },
  {
    name: "Momentum",
    price: "$1,000",
    per: "one-time + $900/mo",
    tagline: "Operation. Your shop looks alive online without you touching it.",
    features: [
      "Everything in Launch",
      "An AI front desk that answers routine calls and books jobs after hours",
      "Facebook and Instagram posts written in your voice, on schedule",
      "Messages answered, comments handled, reviews responded to",
      "Your Google profile kept fresh with posts and photos",
    ],
    featured: true,
    note: "The package most serious shops choose.",
  },
  {
    name: "Concierge Partner",
    price: "$3,000",
    per: "per month",
    tagline: "Leverage. Me, every week, plus infrastructure that keeps improving your business.",
    features: [
      "Three hours with me every week: strategy, review, planning, training",
      "A workstation in your business becomes persistent marketing infrastructure",
      "Runs approved workflows, prepares content, researches opportunities, follows up on quotes",
      "Everything in Momentum, tuned weekly around what brings in jobs",
      "A direct line to me between sessions",
      "Hardware, if needed, quoted separately",
    ],
    featured: false,
  },
];

const comparisons = [
  ["Social media management alone", "$500–1,500/mo"],
  ["A decent website", "$1,500–7,000 one-time"],
  ["AI phone answering", "$150–800/mo"],
  ["Google profile management", "$125–400/mo"],
  ["Review software", "$75–400/mo"],
];

export function PricingPackages() {
  return (
    <section aria-label="Concierge packages" className="mx-auto max-w-6xl px-6 py-20">
      <p className="text-lg font-medium text-honey">PING Social · Founding Client Pricing</p>
      <h2 className="mt-4 text-4xl font-bold text-text-on-dark sm:text-5xl">
        Three ways to work with us.
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-text-on-dark/90">
        My goal is simple. Give you considerably more value than you spend.
      </p>
      <p className="mt-2 max-w-2xl text-text-on-dark/80">
        Launch sells presence. Momentum sells operation. Concierge sells leverage.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {packages.map((pkg) => (
          <article
            key={pkg.name}
            className={`flex flex-col rounded-2xl border p-8 ${
              pkg.featured
                ? "border-honey bg-honey/10"
                : "border-text-on-dark/20"
            }`}
          >
            <h3 className="text-xl font-bold text-text-on-dark">{pkg.name}</h3>
            <p className="mt-2 text-4xl font-bold text-text-on-dark">
              {pkg.price}
              <span className="ml-2 align-middle text-sm font-medium text-text-on-dark/60">
                {pkg.per}
              </span>
            </p>
            <p className="mt-3 font-medium text-honey">{pkg.tagline}</p>
            {"note" in pkg && (pkg as { note?: string }).note ? (
              <p className="mt-1 text-sm font-medium text-text-on-dark/70">
                {(pkg as { note?: string }).note}
              </p>
            ) : null}
            <ul className="mt-6 flex-1 space-y-3">
              {pkg.features.map((f) => (
                <li key={f} className="text-text-on-dark/90">
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="#start"
              className={`mt-8 inline-flex h-12 items-center justify-center rounded-full px-8 font-semibold transition-colors ${
                pkg.featured
                  ? "bg-honey text-honey-foreground hover:bg-honey-hover"
                  : "border border-text-on-dark/30 text-text-on-dark hover:bg-text-on-dark/10"
              }`}
            >
              Start with a conversation
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-text-on-dark/20 p-8">
        <h3 className="text-2xl font-bold text-text-on-dark">What businesses pay when they assemble this separately</h3>
        <p className="mt-2 text-text-on-dark/80">
          Honest context, because our prices should look believable, not suspicious.
          Nobody sells all of it as one thing with one price. We do.
        </p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {comparisons.map(([label, price]) => (
            <div key={label} className="flex items-baseline justify-between gap-4">
              <dt className="text-text-on-dark/80">{label}</dt>
              <dd className="font-semibold text-text-on-dark">{price}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div id="start" className="mt-16 max-w-2xl">
        <h3 className="text-2xl font-bold text-text-on-dark">How we start</h3>
        <p className="mt-4 text-lg text-text-on-dark/90">
          With a conversation, not a checkout.
        </p>
        <p className="mt-4 text-text-on-dark/90">
          Before I recommend anything, I want to understand your situation. How
          are you getting customers right now? What is working? What would you
          change? Tell me that and I will tell you exactly which package fits,
          or tell you honestly if none of them do.
        </p>
        <p className="mt-4 text-sm text-text-on-dark/60">
          Founding Client Pricing. The service is real. These rates reward the
          businesses willing to build with us early, and founding clients keep
          their favorable terms as published pricing rises.
        </p>
      </div>
    </section>
  );
}
