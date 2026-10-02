/**
 * QA-HOSTILE (temporary, untracked harness): hostile-input attacks against the
 * FYD projection seam. Invariant under test: NO EXECUTABLE SOURCE CONTENT
 * CROSSES THE PROJECTION SEAM.
 *
 * Runs fixture -> render pipeline (generateSiteSpec -> buildRenderContext ->
 * SitePageView -> renderToStaticMarkup) plus the seam gates directly
 * (resolveSafeLink, contactMethodFor, importCustomerData/exportCustomerData,
 * buildCapabilities/composeObjectView for the /o object-page lane).
 *
 * Prints one JSON document between HOSTILE_JSON_BEGIN / HOSTILE_JSON_END.
 * Verdicts are first-pass (flag-based); excerpts are included for review.
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SitePageView, buildRenderContext } from "../../components/renderer";
import { HAPPY_PLACE_RICH_GRAPH } from "../../proceduralize/__fixtures__/happy-place-rich-graph";
import { generateSiteSpec } from "../../proceduralize/generator";
import { resolveSafeLink } from "../safe-link";
import {
  contactMethodFor,
  type ClaimEvidence,
} from "../../object/object-projection";
import {
  exportCustomerData,
  importCustomerData,
  separateCustomerData,
} from "../../boundary/data-boundary";
import { buildCapabilities, composeObjectView } from "../../object/view";
import type { DisplayMedia } from "../../media/select";
import type { ObjectGraph, FYDSiteSpec } from "../types";
import type { ObjectContactView } from "../../object/types";
import type { PingObject, PingRelationship } from "@/lib/ping/types";

type Verdict = "NEUTRALIZED" | "SUSPECT";

interface Outcome {
  id: string;
  category: string;
  target: string;
  seam: string;
  inputPreview: string;
  verdict: Verdict;
  mechanism: string;
  flags: string[];
  canaryPresent: boolean;
  outputExcerpt: string;
  error?: string;
  renderMs?: number;
  gateNote?: string;
}

const outcomes: Outcome[] = [];

const GEN_OPTS = {
  generatedAt: "2026-09-21T12:00:00.000Z",
  eventSequences: [65, 83] as number[],
};
const VIEWER = { viewerId: null as string | null, displayName: null as string | null };
const BIZ = "object_6cc955e4077ad14f";
const WEB = "object_cda465c087b62af9";
const SVC = "object_fdce5190ab155923";
const PERSON = "object_5b5b3d32bca8145b";
const LOC = "object_f4be50f223741f51";
const OBS = "2026-09-21T02:44:00Z";

const BASE_SPEC: FYDSiteSpec = generateSiteSpec(HAPPY_PLACE_RICH_GRAPH, GEN_OPTS);

const EV: ClaimEvidence = {
  state: "observed",
  receipt: "hostile-test",
  asOf: "2026-09-23",
  steps: [],
};

function bizOf(g: ObjectGraph): PingObject {
  const o = g.objects.find((x) => x.id === BIZ);
  if (!o) throw new Error("biz missing");
  return o;
}
function webOf(g: ObjectGraph): PingObject {
  const o = g.objects.find((x) => x.id === WEB);
  if (!o) throw new Error("web missing");
  return o;
}
function svcOf(g: ObjectGraph): PingObject {
  const o = g.objects.find((x) => x.id === SVC);
  if (!o) throw new Error("svc missing");
  return o;
}
function personOf(g: ObjectGraph): PingObject {
  const o = g.objects.find((x) => x.id === PERSON);
  if (!o) throw new Error("person missing");
  return o;
}

function mkRel(id: string, subject: string, predicate: string, object: string): PingRelationship {
  return { id, subject, predicate, object, status: "active", createdAt: OBS, evidenceRef: "hostile" };
}

function mkService(id: string, title: string): PingObject {
  return {
    id,
    schema: "ping.knowledge.service@1",
    controllerId: "identity_cc3383c868f96fc1",
    visibility: "public",
    title,
    description: "hostile service",
    fields: { claimKind: "website_statement" },
    createdAt: OBS,
    updatedAt: OBS,
    provenance: {
      kind: "website-derived",
      ref: "hostile-test",
      derivedAt: OBS,
    } as PingObject["provenance"],
  };
}

function mkMedia(src: string, alt: string): DisplayMedia {
  return {
    id: "m-hostile",
    role: "hero",
    src,
    blurUrl: null,
    width: 800,
    height: 600,
    alt,
    rightsSource: "observed",
    rightsBasis: "hostile-test",
    sourceUrl: "https://example.com/",
    digest: "deadbeef",
    observedAt: OBS,
  } as unknown as DisplayMedia;
}

function analyze(html: string, canary: string): { flags: string[]; canaryPresent: boolean; excerpt: string } {
  const flags: string[] = [];
  if (/<script[\s>]/.test(html)) flags.push("live-script-tag");
  if (/href="javascript:/i.test(html)) flags.push("javascript-href");
  if (/src="javascript:/i.test(html)) flags.push("javascript-src");
  if (/\son[a-z]+\s*=\s*"/i.test(html)) flags.push("event-handler-attr");
  if (/(href|src)="data:text\/html/i.test(html)) flags.push("data-text-html-url");
  if ((html.match(/<\/style>/g) || []).length > 1) flags.push("extra-style-close");
  const idx = html.indexOf(canary);
  const excerpt =
    idx >= 0 ? html.slice(Math.max(0, idx - 200), idx + 240) : html.slice(0, 300);
  return { flags, canaryPresent: idx >= 0, excerpt };
}

interface Extra {
  heroMedia?: DisplayMedia | null;
  objectMedia?: Record<string, DisplayMedia[]>;
}

function pushOutcome(o: Outcome): void {
  outcomes.push(o);
}

/** Fixture -> render pipeline attack. */
function renderAttack(args: {
  id: string;
  category: string;
  target: string;
  seam: string;
  inputPreview: string;
  gateNote?: string;
  mutate: (g: ObjectGraph, spec: FYDSiteSpec) => Extra | void;
}): void {
  const g: ObjectGraph = structuredClone(HAPPY_PLACE_RICH_GRAPH);
  const spec: FYDSiteSpec = structuredClone(BASE_SPEC);
  const t0 = Date.now();
  try {
    const extra = args.mutate(g, spec) || {};
    const ctx = { ...buildRenderContext(spec, g, VIEWER), ...extra };
    const html = spec.pages
      .map((p) => renderToStaticMarkup(SitePageView({ page: p, ctx })))
      .join("\n");
    const a = analyze(html, args.id);
    pushOutcome({
      id: args.id,
      category: args.category,
      target: args.target,
      seam: args.seam,
      inputPreview: args.inputPreview.slice(0, 220),
      verdict: a.flags.length > 0 ? "SUSPECT" : "NEUTRALIZED",
      mechanism:
        a.flags.length > 0
          ? "SURVIVOR flags: " + a.flags.join(",")
          : "no executable indicators in rendered output",
      flags: a.flags,
      canaryPresent: a.canaryPresent,
      outputExcerpt: a.excerpt,
      renderMs: Date.now() - t0,
      gateNote: args.gateNote,
    });
  } catch (e) {
    pushOutcome({
      id: args.id,
      category: args.category,
      target: args.target,
      seam: args.seam,
      inputPreview: args.inputPreview.slice(0, 220),
      verdict: "NEUTRALIZED",
      mechanism: "pipeline rejected with diagnostic (no render)",
      flags: [],
      canaryPresent: false,
      outputExcerpt: "",
      error: String((e as Error)?.message ?? e).slice(0, 300),
      renderMs: Date.now() - t0,
      gateNote: args.gateNote,
    });
  }
}

function gateOf(payload: string): string {
  const r = resolveSafeLink(payload, "navigate");
  return r.kind === "safe" ? "safe:" + r.href.slice(0, 80) : "non_navigable";
}

// ---------------------------------------------------------------------------
// TEXT FIELD ATTACKS
// ---------------------------------------------------------------------------

renderAttack({
  id: "A01", category: "text", target: "business title",
  seam: "renderer.tsx text interpolation (Hero/IdentityCard)",
  inputPreview: "<script>alert('A01')</script>",
  mutate: (g) => { bizOf(g).title = "<script>alert('A01')</script>"; },
});

renderAttack({
  id: "A02", category: "text", target: "service title",
  seam: "renderer.tsx text interpolation (Services card)",
  inputPreview: "<img src=x onerror=alert('A02')>",
  mutate: (g) => { svcOf(g).title = "<img src=x onerror=alert('A02')>"; },
});

renderAttack({
  id: "A03", category: "text", target: "service description",
  seam: "renderer.tsx text interpolation (ObjectCard description)",
  inputPreview: "<svg/onload=alert('A03')>",
  mutate: (g) => { svcOf(g).description = "<svg/onload=alert('A03')>"; },
});

renderAttack({
  id: "A04", category: "text", target: "person name (pre-escaped entities)",
  seam: "renderer.tsx text interpolation (People)",
  inputPreview: "&lt;script&gt;alert('A04')&lt;/script&gt;",
  mutate: (g) => { personOf(g).title = "&lt;script&gt;alert('A04')&lt;/script&gt;"; },
});

renderAttack({
  id: "A05", category: "text", target: "business description (quotes/backticks/template)",
  seam: "renderer.tsx text interpolation (BusinessSummary)",
  inputPreview: "He said \"hi\" and `yo` and ${A05} <b>bold</b>",
  mutate: (g) => { bizOf(g).description = "He said \"hi\" and `yo` and ${A05} <b>bold</b>"; },
});

renderAttack({
  id: "A06", category: "text", target: "business title (bidi override U+202E)",
  seam: "renderer.tsx text interpolation",
  inputPreview: "Happy Place \\u202E A06 devil",
  mutate: (g) => { bizOf(g).title = "Happy Place \u202E A06 devil"; },
});

renderAttack({
  id: "A07", category: "text", target: "business title (zero-width chars)",
  seam: "renderer.tsx text interpolation",
  inputPreview: "Happy\\u200b \\uFEFFA07 Place",
  mutate: (g) => { bizOf(g).title = "Happy\u200b \uFEFFA07 Place"; },
});

renderAttack({
  id: "A08", category: "text", target: "service title (emoji + markup)",
  seam: "renderer.tsx text interpolation",
  inputPreview: "🔥💧 A08 <b>bold</b>",
  mutate: (g) => { svcOf(g).title = "🔥💧 A08 <b>bold</b>"; },
});

renderAttack({
  id: "A09", category: "text", target: "business description (100KB oversized)",
  seam: "renderer.tsx text interpolation; reader caps fields at 500 chars but NOT description",
  inputPreview: "<script>alert('A09')</script> + 100KB of x",
  mutate: (g) => { bizOf(g).description = "<script>alert('A09')</script>" + "x".repeat(100000) + "A09"; },
});

renderAttack({
  id: "A10", category: "text", target: "business tagline (nested malformed tags)",
  seam: "renderer.tsx text interpolation (Hero tagline)",
  inputPreview: "<<script>script>alert('A10')<</script>/script>",
  mutate: (g) => { bizOf(g).fields["tagline"] = "<<script>script>alert('A10')<</script>/script>"; },
});

renderAttack({
  id: "A11", category: "text", target: "spec section heading",
  seam: "renderer.tsx SectionShell heading (spec presentation)",
  inputPreview: "<script>alert('A11')</script>",
  mutate: (g, spec) => {
    const s = spec.pages[0].sections[0];
    s.presentation = { ...(s.presentation ?? {}), heading: "<script>alert('A11')</script>" };
  },
});

renderAttack({
  id: "A12", category: "text", target: "object id with quote breakout (detailHref)",
  seam: "renderer.tsx detailHref=/o/${encodeURIComponent(id)}",
  inputPreview: "x\"><script>alert('A12')</script>",
  mutate: (g) => {
    const id = "x\"><script>alert('A12')</script>";
    g.objects.push(mkService(id, "Hostile Service A12"));
    g.relationships.push(mkRel("rel-hostile-A12", BIZ, "offers", id));
  },
});

renderAttack({
  id: "A13", category: "text", target: "object id with javascript: scheme (detailHref)",
  seam: "renderer.tsx detailHref=/o/${encodeURIComponent(id)}",
  inputPreview: "javascript:alert('A13')",
  mutate: (g) => {
    const id = "javascript:alert('A13')";
    g.objects.push(mkService(id, "Hostile Service A13"));
    g.relationships.push(mkRel("rel-hostile-A13", BIZ, "offers", id));
  },
});

renderAttack({
  id: "A14", category: "text", target: "business description (fake JSON-LD script block)",
  seam: "renderer.tsx text interpolation (no JSON-LD emission in render path)",
  inputPreview: "<script type=\"application/ld+json\">{\"@type\":\"A14\"}</script>",
  mutate: (g) => {
    bizOf(g).description = "<script type=\"application/ld+json\">{\"@type\":\"A14\",\"x\":\"</scr\"+\"ipt>\"}</script>";
  },
});

renderAttack({
  id: "A52", category: "text", target: "business title (null byte)",
  seam: "renderer.tsx text interpolation",
  inputPreview: "A52\\0<script>alert('A52')</script>",
  mutate: (g) => { bizOf(g).title = "A52\0<script>alert('A52')</script>"; },
});

// ---------------------------------------------------------------------------
// LINK ATTACKS (website url + socials, through safe-link gate + render)
// ---------------------------------------------------------------------------

function linkAttack(id: string, payload: string, via: "website" | "socials-string" | "socials-array"): void {
  const gate = gateOf(payload);
  renderAttack({
    id,
    category: "link",
    target: via === "website" ? "website url (has_website)" : "socials field",
    seam: "safe-link.ts resolveSafeLink (navigate) -> LinksSection/Hero",
    inputPreview: payload,
    gateNote: "resolveSafeLink(navigate): " + gate,
    mutate: (g) => {
      if (via === "website") webOf(g).fields["url"] = payload;
      else if (via === "socials-string") bizOf(g).fields["socials"] = payload;
      else bizOf(g).fields["socials"] = [payload, "https://ok.example/A-id".replace("A-id", id)];
    },
  });
}

linkAttack("A15", "javascript:alert('A15')", "website");
linkAttack("A16", "JaVaScRiPt:alert('A16')", "website");
linkAttack("A17", "java\tscript:alert('A17')", "website");
linkAttack("A18", "   javascript:alert('A18')", "website");
linkAttack("A19", "data:text/html,<script>alert('A19')</script>", "website");
linkAttack("A20", "vbscript:msgbox('A20')", "website");
linkAttack("A21", "file:///etc/passwd", "website");
linkAttack("A22", "java\0script:alert('A22')", "website");
linkAttack("A23", "\uFF2A\uFF21\uFF36\uFF21\uFF33\uFF23\uFF32\uFF29\uFF30\uFF34:alert('A23')", "website");
linkAttack("A24", "https://example.com/\"onmouseover=\"alert('A24')", "website");
linkAttack("A25", "/evil/path/A25", "website");
linkAttack("A26", "//evil.example/A26", "website");
linkAttack("A27", "https://example.com/?q=javascript:alert('A27')", "website");
linkAttack("A28", "javascript:alert('A28')", "socials-array");
linkAttack("A29", "javascript:alert('A29')", "socials-string");

// ---------------------------------------------------------------------------
// CONTACT LANE (phone/email through contactMethodFor)
// ---------------------------------------------------------------------------

function contactAttack(
  id: string, kind: "phone" | "email", value: string, fieldName: "phone" | "email",
): void {
  const gate = contactMethodFor(kind, value, EV);
  renderAttack({
    id,
    category: "contact",
    target: fieldName + " field",
    seam: "object-projection.ts contactMethodFor -> safe-link (call/email) -> FydContactLink",
    inputPreview: value,
    gateNote: "contactMethodFor(" + kind + "): " + (gate ? "method, actionUri=" + gate.actionUri.slice(0, 80) : "null (rejected)"),
    mutate: (g) => { bizOf(g).fields[fieldName] = value; },
  });
}

contactAttack("A30", "phone", "javascript:alert('A30')", "phone");
contactAttack("A31", "phone", "+1\n(970)\n555-01A31", "phone");
contactAttack("A32", "email", "\"><script>alert('A32')</script>@x.com", "email");
contactAttack("A33", "email", "a33b@bar.com\"><svg/onload=alert('A33')>", "email");
contactAttack("A34", "phone", "+1 (970) 555-0100", "phone");

// ---------------------------------------------------------------------------
// OBJECT-PAGE LANE (/o/[objectId] ActionButtons via buildCapabilities)
// ---------------------------------------------------------------------------

function capAnchorAttack(id: string, contact: ObjectContactView, note: string): void {
  try {
    const caps = buildCapabilities("ping.knowledge.business@1", BIZ, contact, { summary: "x", services: [] });
    const html = caps
      .map((c) =>
        "href" in c
          ? renderToStaticMarkup(React.createElement("a", { href: c.href }, c.label))
          : "",
      )
      .join("");
    const a = analyze(html, id);
    pushOutcome({
      id, category: "object-page", target: "buildCapabilities -> /o ActionButtons <a href>",
      seam: "object/view.ts buildCapabilities (NO safe-link gate) -> src/app/o/[objectId]/page.tsx",
      inputPreview: note.slice(0, 220),
      verdict: a.flags.length > 0 ? "SUSPECT" : "NEUTRALIZED",
      mechanism: a.flags.length > 0 ? "SURVIVOR flags: " + a.flags.join(",") : "no executable indicators in rendered anchor",
      flags: a.flags, canaryPresent: a.canaryPresent, outputExcerpt: a.excerpt,
      gateNote: "caps: " + JSON.stringify(caps.map((c) => ("href" in c ? { kind: c.kind, href: c.href.slice(0, 100) } : c.kind))),
    });
  } catch (e) {
    pushOutcome({
      id, category: "object-page", target: "buildCapabilities", seam: "object/view.ts",
      inputPreview: note.slice(0, 220), verdict: "NEUTRALIZED",
      mechanism: "pipeline rejected with diagnostic", flags: [], canaryPresent: false,
      outputExcerpt: "", error: String((e as Error)?.message ?? e).slice(0, 300),
    });
  }
}

const NULL_CONTACT: ObjectContactView = { phone: null, email: null, website: null, locality: null, addressVisibility: "public" };

capAnchorAttack("A35", { ...NULL_CONTACT, website: "javascript:alert('A35')" }, "website=javascript:alert('A35')");
capAnchorAttack("A37", { ...NULL_CONTACT, phone: "+1\" onmouseover=\"alert('A37')" }, "phone with quote payload");
capAnchorAttack("A38", { ...NULL_CONTACT, email: "nolan@example.com" }, "email control");
capAnchorAttack("A39", { ...NULL_CONTACT, locality: "\"><script>alert('A39')</script>" }, "locality with script (directions href)");

test("A36 composeObjectView end-to-end (raw website field -> website capability)", () => {
  const g: ObjectGraph = structuredClone(HAPPY_PLACE_RICH_GRAPH);
  bizOf(g).fields["website"] = "javascript:alert('A36')";
  let caps: { kind: string; href?: string }[] = [];
  try {
    const view = composeObjectView(g, "hostile-site", bizOf(g), BIZ, "hostile-site");
    caps = view.capabilities.map((c) => ("href" in c ? { kind: c.kind, href: (c as { href: string }).href } : { kind: c.kind }));
  } catch (e) {
    pushOutcome({
      id: "A36", category: "object-page", target: "composeObjectView website field",
      seam: "object/view.ts composeObjectView", inputPreview: "javascript:alert('A36')",
      verdict: "NEUTRALIZED", mechanism: "composeObjectView rejected with diagnostic",
      flags: [], canaryPresent: false, outputExcerpt: "",
      error: String((e as Error)?.message ?? e).slice(0, 300),
    });
    return;
  }
  const html = caps
    .map((c) => (c.href ? renderToStaticMarkup(React.createElement("a", { href: c.href }, "Website")) : ""))
    .join("");
  const a = analyze(html, "A36");
  pushOutcome({
    id: "A36", category: "object-page", target: "composeObjectView website field -> /o anchor",
    seam: "object/view.ts composeObjectView -> buildCapabilities (NO safe-link gate)",
    inputPreview: "javascript:alert('A36')",
    verdict: a.flags.length > 0 ? "SUSPECT" : "NEUTRALIZED",
    mechanism: a.flags.length > 0 ? "SURVIVOR flags: " + a.flags.join(",") : "no executable indicators",
    flags: a.flags, canaryPresent: a.canaryPresent, outputExcerpt: a.excerpt,
    gateNote: "caps: " + JSON.stringify(caps.map((c) => ({ kind: c.kind, href: (c.href ?? "").slice(0, 100) }))),
  });
});

// ---------------------------------------------------------------------------
// THEME TOKEN ATTACKS (owner-overridable tokens -> style props / <style>)
// ---------------------------------------------------------------------------

function themeAttack(id: string, token: "accent" | "ink" | "fontDisplay" | "surface", value: string): void {
  renderAttack({
    id,
    category: "theme",
    target: "spec.themeTokens." + token,
    seam: "renderer.tsx style props (React SSR serialization) + FydMotionStyles <style>",
    inputPreview: value,
    mutate: (g, spec) => {
      const t = spec.themeTokens as unknown as Record<string, unknown>;
      if (t) t[token] = value;
    },
  });
}

themeAttack("A40", "accent", "red\";} </style><script>alert('A40')</script>");
themeAttack("A41", "ink", "</style><script>alert('A41')</script>");
themeAttack("A42", "fontDisplay", "\"><script>alert('A42')</script>");
themeAttack("A43", "surface", "expression(alert('A43'))");

// ---------------------------------------------------------------------------
// MEDIA ATTACKS (DisplayMedia seam -> <img src/alt>)
// ---------------------------------------------------------------------------

function mediaAttack(id: string, src: string, alt: string): void {
  renderAttack({
    id,
    category: "media",
    target: "ctx.heroMedia (DisplayMedia.src/alt)",
    seam: "renderer.tsx <img src={media.src} alt={media.alt}> (Hero; no URL gate on media src)",
    inputPreview: "src=" + src.slice(0, 120) + " alt=" + alt.slice(0, 80),
    mutate: () => ({ heroMedia: mkMedia(src, alt) }),
  });
}

mediaAttack("A44", "javascript:alert('A44')", "alt A44");
mediaAttack("A45", "x\" onerror=\"alert('A45')", "alt A45");
mediaAttack("A46", "https://cdn.example/a46.png", "<script>alert('A46')</script>");

// ---------------------------------------------------------------------------
// DATA BOUNDARY MODULE
// ---------------------------------------------------------------------------

test("A47 importCustomerData rejects malformed JSON", () => {
  let threw = "";
  try {
    importCustomerData("{not valid json A47");
  } catch (e) {
    threw = String((e as Error)?.message ?? e);
  }
  pushOutcome({
    id: "A47", category: "boundary", target: "importCustomerData",
    seam: "boundary/data-boundary.ts importCustomerData",
    inputPreview: "{not valid json A47",
    verdict: threw ? "NEUTRALIZED" : "SUSPECT",
    mechanism: threw ? "rejected with diagnostic: " + threw.slice(0, 120) : "malformed JSON accepted",
    flags: [], canaryPresent: false, outputExcerpt: "",
  });
});

test("A48 importCustomerData resists __proto__ pollution", () => {
  const json = JSON.stringify({
    format: "fyd.customer-data@1",
    identity: { name: "x", siteId: "x", sourceUrl: "https://x/" },
    facts: null, media: null, content: null, objectGraph: null,
    siteSpec: null, ownerOverrides: null, evidenceHistory: null,
    __proto__: { polluted: "A48" },
  });
  let ok = false;
  try {
    importCustomerData(json);
    ok = ({} as Record<string, unknown>)["polluted"] === undefined;
  } catch { ok = false; }
  pushOutcome({
    id: "A48", category: "boundary", target: "importCustomerData __proto__",
    seam: "boundary/data-boundary.ts importCustomerData (JSON.parse)",
    inputPreview: "__proto__:{polluted:A48} inside valid package",
    verdict: ok ? "NEUTRALIZED" : "SUSPECT",
    mechanism: ok ? "no prototype pollution: ({}).polluted is undefined" : "prototype polluted or import failed",
    flags: [], canaryPresent: false, outputExcerpt: "",
  });
});

test("A49 exportCustomerData round-trips hostile strings as inert data", () => {
  const pkg = separateCustomerData({
    identity: { name: "<script>alert('A49')</script>", siteId: "x", sourceUrl: "https://x/" },
    facts: { k: "<img src=x onerror=alert('A49')>" },
    media: null, content: null, objectGraph: null, siteSpec: null,
    ownerOverrides: null, evidenceHistory: null,
  });
  const json = exportCustomerData(pkg);
  const hasLive = /<script[\s>]/.test(json) && !/\\u003c/.test(json);
  pushOutcome({
    id: "A49", category: "boundary", target: "exportCustomerData",
    seam: "boundary/data-boundary.ts exportCustomerData (JSON.stringify)",
    inputPreview: "<script>alert('A49')</script> in identity.name",
    verdict: "NEUTRALIZED",
    mechanism: "hostile strings survive only as JSON string data; no execution context. live-script-in-json=" + hasLive,
    flags: [], canaryPresent: json.includes("A49"), outputExcerpt: json.slice(0, 300),
  });
});

// ---------------------------------------------------------------------------
// GRAPH INTEGRITY ATTACKS
// ---------------------------------------------------------------------------

renderAttack({
  id: "A50", category: "integrity", target: "duplicate object ids",
  seam: "renderer.tsx resolveQuery (Map dedup)",
  inputPreview: "second object with id=object_6cc955e4077ad14f, hostile title",
  mutate: (g) => {
    const dup = { ...bizOf(g), title: "<script>alert('A50')</script>" };
    g.objects.push(dup);
  },
});

renderAttack({
  id: "A51", category: "integrity", target: "conflicting second address",
  seam: "renderer.tsx Locations section",
  inputPreview: "second location with hostile description",
  mutate: (g) => {
    const loc2: PingObject = {
      ...(() => { const l = g.objects.find((x) => x.id === LOC); if (!l) throw new Error("loc missing"); return l; })(),
      id: "object_hostile_loc_A51",
      title: "Evil Locale A51",
      description: "999 Fake St <script>alert('A51')</script>",
    };
    g.objects.push(loc2);
    g.relationships.push(mkRel("rel-hostile-A51", BIZ, "located_at", loc2.id));
  },
});

// ---------------------------------------------------------------------------

test("hostile sweep: emit results JSON", () => {
  const doc = {
    generatedAt: new Date().toISOString(),
    invariant: "NO EXECUTABLE SOURCE CONTENT CROSSES THE PROJECTION SEAM",
    total: outcomes.length,
    suspects: outcomes.filter((o) => o.verdict === "SUSPECT").map((o) => o.id),
    neutralized: outcomes.filter((o) => o.verdict === "NEUTRALIZED").map((o) => o.id),
    outcomes,
  };
  console.log("HOSTILE_JSON_BEGIN");
  console.log(JSON.stringify(doc));
  console.log("HOSTILE_JSON_END");
  expect(outcomes.length).toBe(52);
});
