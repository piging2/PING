/**
 * BusinessStory (family registry #7). Job: PERSUADE.
 *
 * Variants: founder-led (trust the person, then the company) and
 * team-grid (depth over a single face).
 *
 * Founder-led: owner story + portrait + direct quote. NO stock-founder
 * imagery. Team-grid: 2-4 members, no headshot required, name + role +
 * short bio each. One inspect affordance for the cluster. The "Why this?"
 * text appears once, not on every face.
 */

import { SectionShell, cx, type FamilySectionProps } from "../shared";
import { mediaForAsset, mediaBindingsFor, objectsForRole } from "../types";

function FounderLed({ section, ctx }: FamilySectionProps): JSX.Element {
  const owner = ctx.owner;
  const person = objectsForRole(ctx, section, "person")[0] ?? null;
  const portraitBinding = mediaBindingsFor(section, "portrait")[0];
  const portrait = portraitBinding ? mediaForAsset(ctx, portraitBinding.assetId) : null;

  const name = person ? person.title : (owner ? ctx.legalName : "");
  const role = person ? String(person.fields["role"] ?? "").trim() : "";
  const quote = person ? String(person.fields["quote"] ?? "").trim() : "";
  const personStory =
    person && typeof person.description === "string"
      ? person.description.replace(/\s+/g, " ").trim()
      : "";
  const story =
    personStory !== ""
      ? personStory
      : owner && owner.description.trim() !== ""
        ? owner.description.replace(/\s+/g, " ").trim()
        : "";

  return (
    <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-12">
      <div className="md:sticky md:top-24">
        {portrait && (
          <img
            src={portrait.url}
            alt={portrait.alt}
            className="aspect-portrait w-full rounded-lg object-cover shadow-lg"
            loading="lazy"
          />
        )}
        <p className="mt-4 font-body text-h3 text-text-heading">{name}</p>
        {role !== "" && <p className="mt-1 font-body text-body text-text-muted">{role}</p>}
      </div>
      <div>
        {quote !== "" && (
          <blockquote className="font-display text-h2 text-text-heading">
            <span aria-hidden="true" className="text-accent-craft-text">
              {"\u201C"}
            </span>
            {quote}
            <span aria-hidden="true" className="text-accent-craft-text">
              {"\u201D"}
            </span>
          </blockquote>
        )}
        {story !== "" && (
          <p className="mt-6 max-w-[65ch] font-body text-body text-text-primary">{story}</p>
        )}
      </div>
    </div>
  );
}

function TeamGrid({ section, ctx }: FamilySectionProps): JSX.Element {
  const members = objectsForRole(ctx, section, "person").slice(0, 4);
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((m, i) => {
          const binding = mediaBindingsFor(section, "portrait").find((b) => b.objectId === m.id);
          const portrait = binding ? mediaForAsset(ctx, binding.assetId) : null;
          const role = String(m.fields["role"] ?? "").trim();
          const bio =
            typeof m.description === "string" ? m.description.replace(/\s+/g, " ").trim() : "";
          return (
            <article
              key={m.id}
              className="flex flex-col rounded-md border border-border-subtle bg-surface-raised p-6 shadow-md"
            >
              {portrait && (
                <img
                  src={portrait.url}
                  alt={portrait.alt}
                  className="mb-4 aspect-square w-full rounded-md object-cover"
                  loading={i < 2 ? "eager" : "lazy"}
                />
              )}
              <h3 className="font-body text-body font-semibold text-text-heading">{m.title}</h3>
              {role !== "" && (
                <p className="mt-1 font-body text-small text-accent-craft-text">{role}</p>
              )}
              {bio !== "" && (
                <p className="mt-3 line-clamp-3 font-body text-small text-text-muted">{bio}</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function BusinessStory({ section, ctx }: FamilySectionProps): JSX.Element {
  const dark = section.variant === "team-grid";
  return (
    <SectionShell
      component="BusinessStory"
      variant={section.variant}
      title="Meet the business"
      kicker="Our story"
      dark={dark}
    >
      {section.variant === "team-grid" ? (
        <TeamGrid section={section} ctx={ctx} />
      ) : (
        <FounderLed section={section} ctx={ctx} />
      )}
    </SectionShell>
  );
}
