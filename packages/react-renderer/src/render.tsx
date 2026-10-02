/**
 * React presentation adapter: SemanticRenderModel -> static HTML.
 *
 * HARVEST BANNER (piging2)
 * SOURCE: /home/nolan/projects/ping-fyd-converged @ 32f83474888fab87bd57a610cfba1d4f28b0c4fb
 *         src/fyd/components/renderer.tsx
 * SOURCE_SHA: sha256:ff75053458497c59d62e3501a39a4d83fe6601d0f3d330ed6b7c2b6765d20a3e
 * TARGET OWNER: packages/react-renderer (piging2 presentation adapter)
 * DEPENDENCIES: react, react-dom (exact pins from the FYD lockfile),
 *               ./facts, ../../sitespec/src/render-model (types only)
 * PROOFS: [5]
 * MODE: ADAPT.
 *
 * Harvested (the mapping machinery):
 * - The section -> component dispatch contract: component name -> section
 *   function, with unknown components falling back to GenericObjectCard
 *   (mirrors the source's `default:` branch: unknown schemas render
 *   through the fallback, never fail).
 * - The SectionShell shape: section identity hook (data-render-section),
 *   optional heading, optional copy, children.
 * - The requiresData rule: a component bound to no objects renders
 *   nothing. Missing data means the section does not exist.
 * - Each component's factual field selection (which public fields it
 *   reads: title/description for cards, phone/email/website for contact,
 *   locality for locations, review fields for social proof).
 * - The generic default headings ("Services", "Products", "Contact",
 *   "More"): zero customer-specific copy.
 *
 * Rejected for this slice (recorded boundary, not silent drift):
 * - FYDThemeTokens, compose-motion, view transitions, stagger: styling and
 *   motion belong to the app shell (the Next.js runtime). This adapter
 *   emits semantic HTML + data hooks only; no CSS, no customer branches.
 * - RenderContext (graph/spec/viewer/owner): the adapter never sees the
 *   graph. The render model already resolved every query; the adapter
 *   renders only the sections and object ids the model names.
 * - binding-verifier contact projections, the safe-link gate, owner
 *   corrections: contact links are rendered only from strict-shape public
 *   values (see safeWebsiteUrl/safeTel/safeMailto). The adapter trusts the
 *   caller to pass already-safe public facts (README: input contract).
 * - object-rail/object-circle, why-this, ask-fyd-widget, media gallery:
 *   product features for later proofs. Gallery renders nothing in this
 *   slice: no media store exists here (mirrors the source's eligibility
 *   gate: the section renders only when media exists).
 *
 * No-invented-claims rule, enforced structurally: every rendered string
 * comes from the model (section id, component, heading, copy) or from the
 * facts entry of an object id the model binds. A fact renders only when
 * its value is a non-empty string. Missing data renders nothing.
 */

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  SemanticPageModel,
  SemanticRenderModel,
  SemanticSectionModel,
} from "../../sitespec/src/render-model";
import type { FactsById, PublicObjectFacts } from "./facts";
import { BusinessLogoMark, BusinessLogoOverlay, LOGO_OVERLAY_CSS, type LogoMarkId } from "./marks";

/**
 * Adapter version, stamped for traceability. Bump when the render
 * semantics below change (what a component reads or when it renders).
 */
export const REACT_RENDERER_VERSION = "piging2-react-renderer@1";

/**
 * Renderer options: presentation config owned by the adapter's caller.
 * logoMarks overrides the default business -> mark mapping (see marks.tsx);
 * the semantic model never names a mark.
 */
export interface RenderOptions {
  logoMarks?: Record<string, LogoMarkId>;
}

/** Non-empty trimmed text, or null. Missing data renders nothing. */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t === "" ? null : t;
}

/** One public scalar field as display text, or null when absent/empty. */
function field(o: PublicObjectFacts, name: string): string | null {
  const v = o.fields[name];
  if (typeof v === "string") return text(v);
  if (Array.isArray(v)) {
    const joined = v
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter((x) => x !== "")
      .join(", ");
    return joined === "" ? null : joined;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Contact affordances. The source gates these through the safe-link gate
// and binding-verified contact projections; neither is harvested in this
// slice. The adapter renders a link ONLY from a strict-shape public value
// and trusts the caller to pass already-safe public facts (see README).
// An unverifiable or unsafe value is not a link: no output.
// ---------------------------------------------------------------------------

function safeWebsiteUrl(o: PublicObjectFacts): string | null {
  const raw = field(o, "website") ?? field(o, "url");
  if (!raw) return null;
  const t = raw.trim();
  return /^https?:\/\/[^/\s]+\.[^/\s]+/i.test(t) ? t : null;
}

function safeTel(o: PublicObjectFacts): { href: string; label: string } | null {
  const label = field(o, "phone");
  if (!label) return null;
  const digits = label.replace(/[^\d+]/g, "");
  if (digits.replace(/\+/g, "").length < 7) return null;
  return { href: `tel:${digits}`, label };
}

function safeMailto(o: PublicObjectFacts): { href: string; label: string } | null {
  const label = field(o, "email");
  if (!label) return null;
  const t = label.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
  return { href: `mailto:${t}`, label: t };
}

// ---------------------------------------------------------------------------
// Section shell: identity hook + heading/copy + children. No theme, no
// motion: styling is the app shell's job.
// ---------------------------------------------------------------------------

function SectionShell({
  id,
  component,
  heading,
  copy,
  children,
}: {
  id: string;
  component: string;
  heading?: string;
  copy?: string;
  children: ReactNode;
}) {
  const h = text(heading);
  const c = text(copy);
  return (
    <section data-render-section={id} data-component={component}>
      {h ? <h2>{h}</h2> : null}
      {c ? <p data-section-copy>{c}</p> : null}
      <div>{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Generic object card: title + description + claim-kind label. The claim
// kind names the provenance of the words (e.g. "website_statement"),
// mirroring the source's ClaimBadge ("labeled as published claims").
// ---------------------------------------------------------------------------

function ObjectCard({ o }: { o: PublicObjectFacts }) {
  return (
    <article data-object={o.id} data-schema={o.schema}>
      <h3>{o.title}</h3>
      {text(o.description) ? <p>{o.description}</p> : null}
      {text(o.claimKind) && o.claimKind !== "unknown" ? (
        <p data-claim-kind={o.claimKind}>Claimed by the source ({o.claimKind})</p>
      ) : null}
    </article>
  );
}

function CardList({ objects }: { objects: PublicObjectFacts[] }) {
  return (
    <div data-card-list>
      {objects.map((o) => (
        <ObjectCard key={o.id} o={o} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section components. Each takes the model section (identity, component,
// heading, copy) and the bound objects (facts for the ids the model
// names, in model order). requiresData semantics: bound to nothing ->
// renders nothing (except the capability sections AskFYD/CTA, which the
// source registry marks requiresData: false).
// ---------------------------------------------------------------------------

interface SectionProps {
  section: SemanticSectionModel;
  objects: PublicObjectFacts[];
  logoMarks?: Record<string, LogoMarkId>;
}

function HeroSection({ section, objects, logoMarks }: SectionProps) {
  const o = objects[0];
  if (!o) return null;
  const website = safeWebsiteUrl(o);
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading}
      copy={section.copy}
    >
      <div data-hero>
        <BusinessLogoOverlay
          objectId={o.id}
          title={o.title}
          overrides={logoMarks}
        />
        <h1>{o.title}</h1>
        {text(o.description) ? <p>{o.description}</p> : null}
        {website ? (
          <a href={website} data-action="website">
            Visit website
          </a>
        ) : null}
      </div>
    </SectionShell>
  );
}

function BusinessSummarySection({ section, objects }: SectionProps) {
  const o = objects[0];
  if (!o || !text(o.description)) return null;
  // Harvested from the source: with no spec heading, the section heads
  // itself "About {title}" (the title is a bound fact, never invented).
  const heading = section.heading ?? "About " + o.title;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={heading}
      copy={section.copy}
    >
      <p>{o.description}</p>
    </SectionShell>
  );
}

function ServicesSection({ section, objects }: SectionProps) {
  if (objects.length === 0) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading ?? "Services"}
      copy={section.copy}
    >
      <CardList objects={objects} />
    </SectionShell>
  );
}

function ProductsSection({ section, objects }: SectionProps) {
  if (objects.length === 0) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading ?? "Products"}
      copy={section.copy}
    >
      <CardList objects={objects} />
    </SectionShell>
  );
}

function LocationsSection({ section, objects }: SectionProps) {
  if (objects.length === 0) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading ?? "Locations"}
      copy={section.copy}
    >
      <div data-card-list>
        {objects.map((o) => {
          const locality =
            field(o, "locality") ??
            field(o, "address_locality") ??
            field(o, "area_served");
          return (
            <article key={o.id} data-object={o.id} data-schema={o.schema}>
              <h3>{o.title}</h3>
              {locality ? <p>{locality}</p> : null}
              {text(o.description) ? <p>{o.description}</p> : null}
            </article>
          );
        })}
      </div>
    </SectionShell>
  );
}

function PeopleSection({ section, objects }: SectionProps) {
  if (objects.length === 0) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading ?? "People"}
      copy={section.copy}
    >
      <CardList objects={objects} />
    </SectionShell>
  );
}

function PostsSection({ section, objects }: SectionProps) {
  if (objects.length === 0) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading ?? "Posts"}
      copy={section.copy}
    >
      <CardList objects={objects} />
    </SectionShell>
  );
}

function ObjectGridSection({ section, objects }: SectionProps) {
  if (objects.length === 0) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading}
      copy={section.copy}
    >
      <CardList objects={objects} />
    </SectionShell>
  );
}

function ObjectFeedSection({ section, objects }: SectionProps) {
  if (objects.length === 0) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading}
      copy={section.copy}
    >
      <CardList objects={objects} />
    </SectionShell>
  );
}

function RecentObjectsSection({ section, objects }: SectionProps) {
  if (objects.length === 0) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading ?? "Recent"}
      copy={section.copy}
    >
      <CardList objects={objects} />
    </SectionShell>
  );
}

function ContactSection({ section, objects }: SectionProps) {
  const o = objects[0];
  if (!o) return null;
  const tel = safeTel(o);
  const mailto = safeMailto(o);
  const website = safeWebsiteUrl(o);
  if (!tel && !mailto && !website) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading ?? "Contact"}
      copy={section.copy}
    >
      <ul>
        {tel ? (
          <li>
            <a href={tel.href}>{tel.label}</a>
          </li>
        ) : null}
        {mailto ? (
          <li>
            <a href={mailto.href}>{mailto.label}</a>
          </li>
        ) : null}
        {website ? (
          <li>
            <a href={website}>{website}</a>
          </li>
        ) : null}
      </ul>
    </SectionShell>
  );
}

function LinksSection({ section, objects }: SectionProps) {
  const o = objects[0];
  if (!o) return null;
  const website = safeWebsiteUrl(o);
  const socials = field(o, "socials");
  if (!website && !socials) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading ?? "Links"}
      copy={section.copy}
    >
      <ul>
        {website ? (
          <li>
            <a href={website}>{website}</a>
          </li>
        ) : null}
        {socials ? <li>{socials}</li> : null}
      </ul>
    </SectionShell>
  );
}

function SocialProofSection({ section, objects }: SectionProps) {
  const o = objects[0];
  if (!o) return null;
  // Reviews and testimonials, only when the facts carry them explicitly.
  // No review fields and no description means no section: missing data
  // renders nothing, never an invented endorsement.
  const reviews = field(o, "reviews") ?? field(o, "testimonials");
  if (!reviews && !text(o.description)) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading ?? "Reviews"}
      copy={section.copy}
    >
      {reviews ? <p>{reviews}</p> : null}
      {!reviews && text(o.description) ? <p>{o.description}</p> : null}
    </SectionShell>
  );
}

function CTASection({ section, objects }: SectionProps) {
  const o = objects[0];
  const website = o ? safeWebsiteUrl(o) : null;
  if (!website) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading}
      copy={section.copy}
    >
      <a href={website} data-action="cta-website">
        Visit website
      </a>
    </SectionShell>
  );
}

function IdentityCardSection({ section, objects }: SectionProps) {
  const o = objects[0];
  if (!o) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading}
      copy={section.copy}
    >
      <div data-identity-card>
        <p>
          <strong>{o.title}</strong>
        </p>
        {text(o.description) ? <p>{o.description}</p> : null}
      </div>
    </SectionShell>
  );
}

function AskFYDSection({ section }: SectionProps) {
  // A site capability, not a factual claim: the placeholder names no
  // facts. The real Ask FYD (proof 6) replaces this box; the adapter
  // never invents answers.
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading}
      copy={section.copy}
    >
      <div data-ask-fyd>
        <p>Ask about this business</p>
      </div>
    </SectionShell>
  );
}

function ObjectRailSection({ section, objects }: SectionProps) {
  const o = objects[0];
  if (!o) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading}
      copy={section.copy}
    >
      <div data-object-rail>
        <ObjectCard o={o} />
      </div>
    </SectionShell>
  );
}

function GenericObjectCardSection({ section, objects }: SectionProps) {
  if (objects.length === 0) return null;
  return (
    <SectionShell
      id={section.id}
      component={section.component}
      heading={section.heading ?? "More"}
      copy={section.copy}
    >
      <CardList objects={objects} />
    </SectionShell>
  );
}

function GallerySection() {
  // No media store exists in this slice, so no gallery media can exist:
  // the section never renders. This mirrors the source's eligibility
  // gate (the section renders if and only if the render context carries
  // gallery media). Media is a later proof's boundary.
  return null;
}

// ---------------------------------------------------------------------------
// Dispatch: the section -> component switch. The model names the
// component; unknown names fall back to GenericObjectCard, never fail.
// ---------------------------------------------------------------------------

/**
 * Render one model section. The model is the sole authority on what
 * renders: only object ids the model binds are looked up in the facts
 * map, in model order. Facts for ids the model does not name are never
 * rendered, even when present in the map.
 */
export function renderSectionModel(
  section: SemanticSectionModel,
  facts: FactsById,
  options?: RenderOptions,
): ReactNode {
  const objects = section.objectIds
    .map((id) => facts[id])
    .filter((o): o is PublicObjectFacts => !!o);
  const props: SectionProps = { section, objects, logoMarks: options?.logoMarks };
  switch (section.component) {
    case "Hero":
      return <HeroSection key={section.id} {...props} />;
    case "BusinessSummary":
      return <BusinessSummarySection key={section.id} {...props} />;
    case "Services":
      return <ServicesSection key={section.id} {...props} />;
    case "Products":
      return <ProductsSection key={section.id} {...props} />;
    case "Locations":
      return <LocationsSection key={section.id} {...props} />;
    case "People":
      return <PeopleSection key={section.id} {...props} />;
    case "Posts":
      return <PostsSection key={section.id} {...props} />;
    case "ObjectGrid":
      return <ObjectGridSection key={section.id} {...props} />;
    case "ObjectFeed":
      return <ObjectFeedSection key={section.id} {...props} />;
    case "RecentObjects":
      return <RecentObjectsSection key={section.id} {...props} />;
    case "Contact":
      return <ContactSection key={section.id} {...props} />;
    case "Links":
      return <LinksSection key={section.id} {...props} />;
    case "SocialProof":
      return <SocialProofSection key={section.id} {...props} />;
    case "CTA":
      return <CTASection key={section.id} {...props} />;
    case "IdentityCard":
      return <IdentityCardSection key={section.id} {...props} />;
    case "AskFYD":
      return <AskFYDSection key={section.id} {...props} />;
    case "ObjectRail":
      return <ObjectRailSection key={section.id} {...props} />;
    case "Gallery":
      return <GallerySection key={section.id} />;
    case "GenericObjectCard":
    default:
      return <GenericObjectCardSection key={section.id} {...props} />;
  }
}

/** Render one model page: sections in model order. */
export function renderPageModel(
  page: SemanticPageModel,
  facts: FactsById,
  options?: RenderOptions,
): ReactNode {
  return <>{page.sections.map((s) => renderSectionModel(s, facts, options))}</>;
}

/**
 * Render a page of the semantic render model to static HTML.
 *
 * Pure and deterministic: the same model + facts always yields
 * byte-identical HTML. No wall-clock reads, no randomness, no
 * request-order-dependent ids. React escapes every interpolated string,
 * so facts can never break out of the markup.
 *
 * @param model the semantic render model (the sole authority on what renders)
 * @param facts public facts keyed by object id (derived from the verified
 *   public projection by the caller)
 * @param pageSlug which page to render; defaults to the first page.
 *   Unknown slugs throw: failing closed beats rendering the wrong page.
 * @param options presentation config (logo mark overrides). The semantic
 *   model never names a mark; the adapter resolves it.
 */
export function renderModelToStaticHtml(
  model: SemanticRenderModel,
  facts: FactsById,
  pageSlug?: string,
  options?: RenderOptions,
): string {
  const page = pageSlug
    ? model.pages.find((p) => p.slug === pageSlug)
    : model.pages[0];
  if (!page) {
    throw new Error(
      `react-renderer: unknown page ${JSON.stringify(pageSlug ?? "(default)")}`,
    );
  }
  return (
    `<style>${LOGO_OVERLAY_CSS}</style>` +
    renderToStaticMarkup(
      <main data-render-checkpoint={model.checkpoint} data-page={page.slug}>
        {renderPageModel(page, facts, options)}
      </main>,
    )
  );
}
