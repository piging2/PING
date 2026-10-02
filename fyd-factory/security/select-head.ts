/**
 * FYD media display selection (server-only: node:fs).
 *
 * The ONE selector every surface uses to resolve "which media does this
 * object show": Page, Circle, ObjectView, and later feed/social/agent
 * context. Selection is SEMANTIC: the manifest store is attached to the
 * object graph (attach.ts: Business represented_by Media, Service
 * illustrated_by Media, Project has_media Media) and the selector walks
 * those relationships from the object. Media follows its object; it is
 * never assigned to a page slot.
 *
 * The manifest is read from disk on every call (freshness outranks the
 * memo: a re-ingest is visible immediately, no restart). Deterministic:
 * no network, no mutation.
 */

import type { ObjectGraph } from "../sitespec/types";
import { attachMediaToGraph, mediaForObject } from "./attach";
import { getPipelineManifest } from "./bundle-media";
import {
  isAcquirable,
  type FydMediaObject,
  type MediaManifest,
  type MediaVariant,
  type RightsSource,
} from "./types";

export interface DisplayMedia {
  id: string;
  /** First role: logo | hero | gallery | ... */
  role: string;
  /** Display derivative URL (FYD-served, same origin, never a hotlink). */
  src: string;
  /** Tiny blur placeholder URL, or null. */
  blurUrl: string | null;
  width: number;
  height: number;
  alt: string;
  rightsSource: RightsSource;
  rightsBasis: string;
  sourceUrl: string;
  digest: string;
  observedAt: string;
}

/**
 * Read the pipeline manifest for a site from the read-model-adjacent
 * store. Null when the site has no manifest (never throws: missing data
 * is not a failure of the selector). Fresh on every call: a re-ingest is
 * visible immediately, no restart.
 */
export function readPipelineManifest(siteId: string): MediaManifest | null {
  return getPipelineManifest(siteId);
}

/** Widest non-blur variant: the honest "best" rendition for display. */
function pickWidest(variants: MediaVariant[]): MediaVariant | null {
  const real = variants.filter((v) => !v.name.startsWith("blur"));
  if (real.length === 0) return null;
  return real.reduce((a, b) => (b.width > a.width ? b : a));
}

/** Named-variant preference for hero surfaces (largest sensible first). */
const HERO_PREFERENCE = ["hero", "card", "w768", "thumbnail", "w480"];

function pickHeroVariant(variants: MediaVariant[]): MediaVariant | null {
  for (const name of HERO_PREFERENCE) {
    const v = variants.find((v) => v.name === name);
    if (v) return v;
  }
  return pickWidest(variants);
}

function toDisplayMedia(m: FydMediaObject, heroBias: boolean): DisplayMedia | null {
  const v = heroBias ? pickHeroVariant(m.variants ?? []) : pickWidest(m.variants ?? []);
  if (!v) return null;
  const blur = m.variants.find((v) => v.name.startsWith("blur")) ?? null;
  return {
    id: m.id,
    role: m.roles?.[0] ?? "gallery",
    src: v.url,
    blurUrl: blur ? blur.url : null,
    width: v.width,
    height: v.height,
    alt: (m.altText ?? "").trim() || m.title || "Business photo",
    rightsSource: m.rightsSource,
    rightsBasis: m.rightsBasis ?? "",
    sourceUrl: m.provenance?.sourceUrl ?? "",
    digest: m.digest ?? "",
    observedAt: m.provenance?.observedAt ?? "",
  };
}

function select(
  siteId: string,
  graph: ObjectGraph,
  objectId: string,
  heroBias: boolean,
): DisplayMedia[] {
  const manifest = readPipelineManifest(siteId);
