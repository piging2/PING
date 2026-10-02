/**
 * TrustBar (family registry #3). Job: REASSURE (metrics-strip) / PROVE (testimonial-cluster).
 *
 * metrics-strip: >=2 verifiable facts, evidence-backed or not rendered.
 * No invented counts. One inspect affordance for the cluster.
 * testimonial-cluster: named, specific reviews with quoted specificity.
 * Proof surface: no money CTAs here.
 */

import { InspectAffordance, SectionShell, type FamilySectionProps } from "../shared";
import { objectsForRole } from "../types";

const METRIC_LABELS: Record<string, string> = {
  license_number: "License",
  project_count: "Projects completed",
  years_in_business: "Years in business",
  service_areas: "Service areas",
  rating_summary: "Rating",
};

function metricValue(ctx: FamilySectionProps["ctx"], field: string): string | null {
  const owner = ctx.owner;
  if (!owner) return null;
  const v = owner.fields[field];
  if (Array.isArray(v)) {
    const items = v.filter((x) => typeof x === "string" && x.trim() !== "");
    return items.length > 0 ? String(items.length) : null;
  }
  const s = String(v ?? "").trim();
  return s !== "" ? s : null;
}

const METRIC_ORDER = [
  "license_number",
  "project_count",
  "years_in_business",
  "service_areas",
  "rating_summary",
];

function MetricsStrip({ section, ctx }: FamilySectionProps): JSX.Element {
  const owner = ctx.owner;
  const facts = METRIC_ORDER.map((f) => ({ field: f, value: metricValue(ctx, f) })).filter(
    (f) => f.value !== null,
  ) as Array<{ field: string; value: string }>;
  return (
    <section
      data-component="TrustBar"
      data-variant="metrics-strip"
      aria-label="Trust facts"
      className="bg-trust-bar-surface text-trust-bar-text"
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8">
        <dl className="flex snap-x snap-mandatory gap-8 overflow-x-auto md:grid md:grid-cols-5 md:overflow-visible">
          {facts.map((f) => (
            <div key={f.field} className="min-w-[140px] snap-start">
              <dt className="font-body text-caption uppercase tracking-[0.08em] text-text-inverse-muted">
                {METRIC_LABELS[f.field]}
              </dt>
              <dd className="mt-1 font-display text-h3 text-trust-bar-accent">{f.value}</dd>
            </div>
          ))}
        </dl>
        {owner && (
          <div className="mt-4">
            <InspectAffordance ctx={ctx} objectId={owner.id} inverse />
          </div>
        )}
      </div>
    </section>
  );
}

function reviewText(o: { description: string; fields: Record<string, string | string[]> }): string {
  const rt = o.fields["review_text"];
  const text = (typeof rt === "string" ? rt : "") + " " + (o.description ?? "");
  return text.replace(/\s+/g, " ").trim();
}

function TestimonialCluster({ section, ctx }: FamilySectionProps): JSX.Element {
  const reviews = objectsForRole(ctx, section, "review");
  const owner = ctx.owner;
  return (
    <SectionShell
      component="TrustBar"
      variant="testimonial-cluster"
      title="What customers say"
      kicker="Reviews"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {reviews.map((r) => {
          const reviewer = String(r.fields["reviewer_name"] ?? "").trim();
          const text = reviewText(r);
          return (
            <figure
              key={r.id}
              className="flex flex-col rounded-md border border-border-subtle bg-surface-raised p-6 shadow-md"
            >
              <blockquote className="flex-1 font-body text-body text-text-primary">
                {text}
              </blockquote>
              <figcaption className="mt-6">
                <p className="font-body text-body font-semibold text-text-heading">{reviewer}</p>
                {r.title.trim() !== "" && (
                  <p className="mt-1 font-body text-small text-text-muted">{r.title}</p>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
      {owner && (
        <div className="mt-8">
          <InspectAffordance ctx={ctx} objectId={owner.id} />
        </div>
      )}
    </SectionShell>
  );
}

export function TrustBar(props: FamilySectionProps): JSX.Element | null {
  // The honest empty state is status "proposed": never published without
  // owner approval. The public renderer omits it (see family-page.tsx).
  if (props.section.variant === "testimonial-cluster") {
    return <TestimonialCluster {...props} />;
  }
  if (props.section.variant === "metrics-strip") {
    return <MetricsStrip {...props} />;
  }
  return null;
}
