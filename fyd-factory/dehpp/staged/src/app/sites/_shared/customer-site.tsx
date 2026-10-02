/**
 * CustomerSite: the business surface. No demo chrome, no operator tooling,
 * no FYD Social branding. Tabs navigate within the site, the page renders
 * from the declarative spec, and the footer carries the deployment
 * provenance sentence (P12). Rendered in both chrome modes; DemoChrome
 * wraps it with the operator surface when the deployment asks for demo.
 */

"use client";

import { useState } from "react";
import { SitePageView, buildRenderContext } from "@/fyd/components/renderer";
import type {
  FYDSiteSpec,
  ObjectGraph,
  ViewerContext,
} from "@/fyd/sitespec/types";
// Type-only: serialized DisplayMedia resolved on the server; the client
// never touches the media store.
import type { DisplayMedia } from "@/fyd/media/select";

const VIEWER: ViewerContext = { viewerId: null, displayName: null };

export interface CustomerSiteProps {
  spec: FYDSiteSpec;
  graph: ObjectGraph;
  renderable: boolean;
  siteId?: string;
  heroMedia?: DisplayMedia | null;
  galleryMedia?: DisplayMedia[] | null;
  objectMedia?: Record<string, DisplayMedia[]>;
  /** Deployment provenance sentence (P12). Null renders no sentence. */
  provenanceSentence?: string | null;
  /** Controlled tab state (used by DemoChrome); uncontrolled otherwise. */
  activeSlug?: string;
  onActiveSlugChange?: (slug: string) => void;
}

export function CustomerSite({
  spec,
  graph,
  renderable,
  siteId,
  heroMedia = null,
  galleryMedia = null,
  objectMedia,
  provenanceSentence = null,
  activeSlug: controlledSlug,
  onActiveSlugChange,
}: CustomerSiteProps) {
  const [internalSlug, setInternalSlug] = useState(
    spec.navigation[0]?.pageSlug ?? "home",
  );
  const activeSlug = controlledSlug ?? internalSlug;
  const setActiveSlug = onActiveSlugChange ?? setInternalSlug;
  const page = spec.pages.find((p) => p.slug === activeSlug) ?? spec.pages[0];

  // The render context is always built via buildRenderContext, never by
  // hand. Media arrives serialized from the server seam (B4); the renderer
  // never selects media itself.
  const ctx = buildRenderContext(spec, graph, VIEWER, [], {
    siteId,
    heroMedia,
    galleryMedia,
    objectMedia,
  });

  return (
    <div>
      {/* Customer page tabs: from spec.navigation, never hardcoded. */}
      <nav
        className="border-b border-border-soft bg-background"
        aria-label="Site pages"
      >
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {spec.navigation.map((n) => (
            <button
              key={n.pageSlug}
              onClick={() => setActiveSlug(n.pageSlug)}
              className={
                "rounded px-4 py-2 text-sm font-medium " +
                (n.pageSlug === activeSlug
                  ? "bg-primary text-primary-foreground"
                  : "text-accent hover:bg-surface")
              }
            >
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      {/* An invalid spec never renders. */}
      {renderable && page ? (
        <SitePageView
          key={page.slug + JSON.stringify(spec.themeTokens)}
          page={page}
          ctx={ctx}
        />
      ) : null}

      {/* Provenance footer: the deployment sentence only. Validator notes
          are operator tooling and live in DemoChrome. */}
      <footer className="border-t border-border-soft bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-accent sm:px-6">
          {provenanceSentence ? <p>{provenanceSentence}</p> : null}
        </div>
      </footer>
    </div>
  );
}
