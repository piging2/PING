/**
 * ProjectGallery (family registry #6). Job: PROVE.
 *
 * Variants: masonry (craft texture), editorial (stories, not inventory),
 * carousel (swipe-first, touch-native).
 *
 * One inspect affordance for the cluster. No object pills, no counts.
 * Every rendered image carries acquired-media alt text (V1 minimum).
 */

import type { PingObject } from "@/lib/ping/types";
import { SectionShell, cx, type FamilySectionProps } from "../shared";
import { mediaForAsset, mediaBindingsFor, objectsForRole } from "../types";

function galleryItems(
  section: FamilySectionProps["section"],
  ctx: FamilySectionProps["ctx"],
): Array<{ project: PingObject; url: string; alt: string }> {
  const projects = objectsForRole(ctx, section, "project");
  const items: Array<{ project: PingObject; url: string; alt: string }> = [];
  for (const p of projects) {
    const binding = mediaBindingsFor(section).find((b) => b.objectId === p.id);
    if (!binding) continue;
    const media = mediaForAsset(ctx, binding.assetId);
    if (!media) continue;
    items.push({ project: p, url: media.url, alt: media.alt });
  }
  return items;
}

function Caption({ project }: { project: PingObject }): JSX.Element | null {
  const location =
    typeof project.fields["location"] === "string" ? project.fields["location"].trim() : "";
  const desc =
    typeof project.description === "string" ? project.description.replace(/\s+/g, " ").trim() : "";
  if (project.title.trim() === "" && location === "" && desc === "") return null;
  return (
    <figcaption className="mt-3">
      {project.title.trim() !== "" && (
        <p className="font-body text-body font-semibold text-text-heading">{project.title}</p>
      )}
      {location !== "" && (
        <p className="font-body text-small text-text-muted">{location}</p>
      )}
      {desc !== "" && (
        <p className="mt-1 line-clamp-2 font-body text-small text-text-muted">{desc}</p>
      )}
    </figcaption>
  );
}

function Masonry({ items }: { items: ReturnType<typeof galleryItems> }): JSX.Element {
  return (
    <div className="columns-2 gap-4 md:columns-3 md:gap-6">
      {items.map((it, i) => (
        <figure key={it.project.id} className="mb-4 break-inside-avoid md:mb-6">
          <img
            src={it.url}
            alt={it.alt}
            className="w-full rounded-md object-cover shadow-md"
            loading={i < 2 ? "eager" : "lazy"}
          />
          <Caption project={it.project} />
        </figure>
      ))}
    </div>
  );
}

function Editorial({ items }: { items: ReturnType<typeof galleryItems> }): JSX.Element {
  return (
    <div className="flex flex-col gap-10 md:gap-16">
      {items.slice(0, 6).map((it, i) => (
        <figure
          key={it.project.id}
          className={cx(
            "grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-10",
            i % 2 === 1 && "md:[&>*:first-child]:order-2",
          )}
        >
          <img
            src={it.url}
            alt={it.alt}
            className="aspect-landscape w-full rounded-lg object-cover shadow-lg"
            loading={i < 2 ? "eager" : "lazy"}
          />
          <div>
            <Caption project={it.project} />
          </div>
        </figure>
      ))}
    </div>
  );
}

function Carousel({ items }: { items: ReturnType<typeof galleryItems> }): JSX.Element {
  const groupId = "gallery-carousel";
  return (
    <div
      role="region"
      aria-label="Project photos"
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 motion-safe:scroll-smooth"
    >
      {items.map((it, i) => (
        <figure
          key={it.project.id}
          aria-roledescription="slide"
          aria-label={"Project " + (i + 1) + " of " + items.length}
          className="w-[85%] shrink-0 snap-start sm:w-[60%] md:w-[45%]"
          id={groupId + "-" + i}
        >
          <img
            src={it.url}
            alt={it.alt}
            className="aspect-landscape w-full rounded-md object-cover shadow-md"
            loading={i < 2 ? "eager" : "lazy"}
          />
          <Caption project={it.project} />
        </figure>
      ))}
    </div>
  );
}

export function ProjectGallery({ section, ctx }: FamilySectionProps): JSX.Element {
  const items = galleryItems(section, ctx);
  return (
    <SectionShell
      id="projects"
      component="ProjectGallery"
      variant={section.variant}
      title="Recent work"
      kicker="Portfolio"
    >
      {section.variant === "editorial" ? (
        <Editorial items={items} />
      ) : section.variant === "carousel" ? (
        <Carousel items={items} />
      ) : (
        <Masonry items={items} />
      )}
    </SectionShell>
  );
}
