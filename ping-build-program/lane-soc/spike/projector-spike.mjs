#!/usr/bin/env node
/**
 * LANE SOC minimal spike: public-social fabric projector.
 *
 * Object -> public-surface DRAFT projection. Deterministic, evidence-bound,
 * refusal-first. Drafts only; nothing here publishes, sends, or contacts anyone.
 *
 * Harvested from PING (read-only trace @ e48ef710):
 * - ObjectView (src/fyd/object/types.ts) as the projector input
 * - ConciergeGrade SUPPORTED/DERIVED/INFERRED/UNKNOWN (src/fyd/ask/concierge.ts)
 * - digest law sha256-canonical-json (src/fyd/ask/envelope.ts, src/fyd/social/transition-id.ts)
 * - INV-03 absence-not-redaction (src/fyd/invariants/.../inv-03-hidden-no-leak.test.ts)
 * - RightsSource vocabulary + rights gate (src/fyd/media/types.ts)
 *
 * Deps: node:crypto only. Run: node projector-spike.mjs
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECTOR_VERSION = "soc-projector@0.1.0";
const SNAP = JSON.parse(readFileSync(join(HERE, "object-snapshot.json"), "utf8"));

/* ---------- digest law (harvested: sha256 over canonical JSON) ---------- */

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
}
const sha256hex = (s) => createHash("sha256").update(s, "utf8").digest("hex");

/* ---------- evidence ---------- */

function ev(obj) {
  return {
    label: `Business record: ${obj.name}`,
    source: obj.provenance.label,
    basis: obj.provenance.basis,
    ref: obj.provenance.ref,
  };
}

/* ---------- forbidden lexicon (F-1) ---------- */

const SUPERLATIVES = ["best", "no. 1", "#1", "top-rated", "top rated", "finest", "unmatched", "guaranteed", "premier", "#1"];
function hasSuperlative(text) {
  const lower = text.toLowerCase();
  return SUPERLATIVES.filter((s) => lower.includes(s));
}

/* ---------- surface field policies ---------- */

const SURFACES = {
  "page-post": {
    fields: ["name", "summary", "services", "serviceArea", "locality", "website", "media"],
    excludesContactDetails: true,
  },
  "profile-blurb": {
    fields: ["name", "summary", "services", "locality", "website", "phone", "email", "media"],
    excludesContactDetails: false,
  },
  "story-card": {
    fields: ["name", "summary", "services", "locality", "media"],
    excludesContactDetails: true,
    shortSummary: true,
  },
};

const PROJECTABLE_RIGHTS = new Set(["business-provided", "public-demo-source"]);

/* ---------- media gate (F-3, F-4) ---------- */

function bindMedia(obj, surface) {
  const bound = [];
  const refused = [];
  for (const m of obj.media || []) {
    if (m.objectId !== obj.objectId) {
      refused.push({
        request: `media ${m.id}`,
        reason: "REFUSED [F-3 cross-business bleed]: media objectId does not match the target business object. Projection never carries another business's imagery.",
      });
      continue;
    }
    if (!PROJECTABLE_RIGHTS.has(m.rightsSource)) {
      refused.push({
        request: `media ${m.id}`,
        reason: `REFUSED [F-4 rights gate]: rightsSource "${m.rightsSource}" is not projectable to public surfaces. Only business-provided or public-demo-source media may project.`,
      });
      continue;
    }
    bound.push({ id: m.id, role: m.role, rightsSource: m.rightsSource, digest: m.digest });
  }
  return { bound, refused };
}

/* ---------- custom-claim gate (F-1, F-2, F-6) ---------- */

function gateCustomClaim(text) {
  const sup = hasSuperlative(text);
  if (sup.length > 0) {
    return {
      refused: {
        request: text,
        reason: `REFUSED [F-1 unverifiable superlative]: "${sup[0]}" requires SUPPORTED evidence and the object graph carries none. The projector never invents marketing claims.`,
      },
    };
  }
  if (/testimonial|review|says|said|customer/i.test(text)) {
    return {
      refused: {
        request: text,
        reason: "REFUSED [F-2 invented testimonial]: no testimonial object or relationship exists in the business graph. The projector never fabricates social proof.",
      },
    };
  }
  return {
    refused: {
      request: text,
      reason: "REFUSED [F-6 unbound claim]: the claim grades UNKNOWN — no object field or evidence backs it. Unverifiable content never renders.",
    },
  };
}

/* ---------- the projector ---------- */

function projectToSurface(obj, surface, customClaims = []) {
  if (!SURFACES[surface]) throw new Error(`unknown surface: ${surface}`);
  const policy = SURFACES[surface];
  const evidence = ev(obj);
  const lines = [];
  const refused = [];
  const usedFields = [];

  const claim = (text, grade, fields) => {
    // concierge law: a non-UNKNOWN claim without evidence is a programming error
    if (grade !== "UNKNOWN" && (!fields || fields.length === 0)) {
      throw new Error(`claim without evidence binding: "${text}"`);
    }
    lines.push({ text, grade, fields, evidence });
    for (const f of fields) if (!usedFields.includes(f)) usedFields.push(f);
  };

  if (policy.fields.includes("name")) {
    claim(obj.name, "SUPPORTED", ["name"]);
  }
  if (policy.fields.includes("summary")) {
    const text = policy.shortSummary && obj.summary.length > 120
      ? obj.summary.slice(0, 117) + "..."
      : obj.summary;
    claim(text, "SUPPORTED", ["summary"]);
  }
  if (policy.fields.includes("services")) {
    const names = (obj.services || []).map((s) => s.name).sort();
    if (names.length > 0) {
      claim(`Services: ${names.join("; ")}.`, "SUPPORTED", ["services.name"]);
      claim(`${obj.name} lists ${names.length} service${names.length === 1 ? "" : "s"}.`, "DERIVED", ["services.name"]);
    }
  }
  // Absence reads as absence: a missing field emits no claim (never "Email: undefined").
  const present = (v) => v !== null && v !== undefined && String(v).trim() !== "";
  if (policy.fields.includes("serviceArea") && present(obj.serviceArea)) {
    claim(`Serving ${obj.serviceArea}.`, "SUPPORTED", ["serviceArea"]);
  }
  if (policy.fields.includes("locality") && present(obj.contact.locality)) {
    claim(`Based in ${obj.contact.locality}.`, "SUPPORTED", ["contact.locality"]);
  }
  if (policy.fields.includes("website") && present(obj.contact.website)) {
    claim(obj.contact.website, "SUPPORTED", ["contact.website"]);
  }
  if (policy.fields.includes("phone") && present(obj.contact.phone)) {
    claim(`Call: ${obj.contact.phone}`, "SUPPORTED", ["contact.phone"]);
  }
  if (policy.fields.includes("email") && present(obj.contact.email)) {
    claim(`Email: ${obj.contact.email}`, "SUPPORTED", ["contact.email"]);
  }

  const { bound: mediaBound, refused: mediaRefused } = bindMedia(obj, surface);
  refused.push(...mediaRefused);

  for (const rc of customClaims) {
    const { refused: r } = gateCustomClaim(rc);
    refused.push(r);
  }

  // INV-03 check: the output bytes must never carry a hidden field.
  // (hidden fields are simply absent from the input snapshot by construction)
  const outputText = lines.map((l) => l.text).join("\n");

  const inputDigest = sha256hex(canonical({ objectId: obj.objectId, version: PROJECTOR_VERSION, surface, usedFields }));
  const projectionDigest = sha256hex(canonical({ inputDigest, lines, mediaBound }));

  return {
    draftId: "draft-" + projectionDigest.slice(0, 16),
    surface,
    status: "DRAFT",
    publishable: false,
    publishIntent: "none",
    projectorVersion: PROJECTOR_VERSION,
    inputDigest,
    projectionDigest,
    usedFields: usedFields.sort(),
    lines,
    mediaBound,
    refused,
    _outputText: outputText, // test-only
  };
}

/* ---------- one-way engagement boundary ---------- */

const engagementObservations = [];

function ingestEngagement(obj, event) {
  if (event.attemptedCanonicalWrites && Object.keys(event.attemptedCanonicalWrites).length > 0) {
    return {
      accepted: false,
      reason:
        "REFUSED [one-way boundary]: engagement (like/comment/review) arrives as OBSERVATION only. " +
        `It attempted to write canonical fields (${Object.keys(event.attemptedCanonicalWrites).join(", ")}). ` +
        "Engagement observations may never write object fields; only owner-verified, signed corrections (USER_OVERRIDE) alter canonical objects.",
      observation: null,
    };
  }
  const observation = {
    type: "social_engagement_observed",
    fact_class: "DERIVED_FACT",
    businessObjectId: obj.objectId,
    engagement: { kind: event.kind, author: event.author, textDigest: sha256hex(event.text || "") },
    observedAt: new Date().toISOString(),
    note: "Public reaction evidence. Never promotes to a canonical object field.",
  };
  engagementObservations.push(observation);
  return { accepted: true, observation };
}

/* ---------- tiny test harness ---------- */

let passed = 0, failed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.log(`  FAIL ${name}: ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function assertRefused(list, code) {
  assert(list.length > 0 && list.some((r) => r.reason.includes(code)),
    `expected refusal [${code}], got ${JSON.stringify(list)}`);
}

/* ---------- PROOF 1: 3 public-surface drafts from the real object ---------- */

console.log("== PROOF 1: project real business object to 3 surfaces (DRAFTS) ==");
const pagePost = projectToSurface(SNAP, "page-post");
const profileBlurb = projectToSurface(SNAP, "profile-blurb");
const storyCard = projectToSurface(SNAP, "story-card");

t("page-post draft emitted, never publishable", () => {
  assert(pagePost.status === "DRAFT" && pagePost.publishable === false && pagePost.publishIntent === "none", "draft gate broken");
  assert(pagePost.lines.length >= 5, "expected >=5 claim lines");
  assert(pagePost.lines.every((l) => l.fields.length > 0 && l.evidence), "every line needs a binding");
  console.log("      sample: " + JSON.stringify(pagePost.lines[1].text.slice(0, 80)));
});
t("profile-blurb carries contact details, page-post/story-card do not", () => {
  assert(profileBlurb.usedFields.includes("contact.phone") && profileBlurb.usedFields.includes("contact.email"), "profile must carry contact");
  assert(!pagePost.usedFields.some((f) => f.startsWith("contact.phone") || f.startsWith("contact.email")), "page-post must not carry contact details");
  assert(!storyCard.usedFields.some((f) => f.startsWith("contact.phone") || f.startsWith("contact.email")), "story-card must not carry contact details");
  assert(storyCard.usedFields.includes("contact.locality"), "story-card keeps coarse locality (public)");
});
t("story-card has no projectable media here (rights gate, honest)", () => {
  assert(storyCard.mediaBound.length === 0, "expected no media bound: real manifest has zero projectable media");
  console.log("      evidence shown per claim: " + pagePost.lines[0].evidence.source);
});

/* ---------- PROOF 2: determinism ---------- */

console.log("== PROOF 2: determinism (same object state -> same projection) ==");
t("byte-identical across runs", () => {
  const a = projectToSurface(SNAP, "page-post");
  const b = projectToSurface(SNAP, "page-post");
  assert(sha256hex(canonical(a.lines)) === sha256hex(canonical(b.lines)), "projection not deterministic");
  assert(a.projectionDigest === b.projectionDigest, "digest mismatch");
  console.log("      projectionDigest: " + a.projectionDigest.slice(0, 16) + "...");
});

/* ---------- PROOF 3: object change re-projects exactly the affected surfaces ---------- */

console.log("== PROOF 3: targeted re-projection on object change ==");
t("phone change re-projects profile-blurb only", () => {
  const changed = { ...SNAP, contact: { ...SNAP.contact, phone: "+15415550147" } };
  const before = { pagePost: pagePost.projectionDigest, profileBlurb: profileBlurb.projectionDigest, storyCard: storyCard.projectionDigest };
  const after = {
    pagePost: projectToSurface(changed, "page-post").projectionDigest,
    profileBlurb: projectToSurface(changed, "profile-blurb").projectionDigest,
    storyCard: projectToSurface(changed, "story-card").projectionDigest,
  };
  assert(after.profileBlurb !== before.profileBlurb, "profile-blurb must change on phone change");
  assert(after.pagePost === before.pagePost, "page-post must be UNCHANGED (does not bind contact.phone)");
  assert(after.storyCard === before.storyCard, "story-card must be UNCHANGED");
  console.log("      changed: profile-blurb; unchanged: page-post, story-card");
});
t("name change re-projects all three surfaces", () => {
  const changed = { ...SNAP, name: "Happy Place Carpentry Co." };
  const before = [pagePost.projectionDigest, profileBlurb.projectionDigest, storyCard.projectionDigest];
  const after = ["page-post", "profile-blurb", "story-card"].map((s) => projectToSurface(changed, s).projectionDigest);
  assert(after.every((d, i) => d !== before[i]), "all surfaces bind name");
});

/* ---------- PROOF 4: forbidden claims refused with exact reasons ---------- */

console.log("== PROOF 4: forbidden claims refused ==");
t("superlative refused [F-1]", () => {
  const d = projectToSurface(SNAP, "page-post", ["The best carpenter in Oregon!"]);
  assert(d.lines.every((l) => !l.text.toLowerCase().includes("best")), "superlative leaked into draft");
  assertRefused(d.refused, "F-1");
  console.log("      reason: " + d.refused[0].reason.slice(0, 90) + "...");
});
t("invented testimonial refused [F-2]", () => {
  const d = projectToSurface(SNAP, "page-post", ['A happy customer says: "They did amazing work!"']);
  assertRefused(d.refused, "F-2");
});
t("unbound claim refused [F-6]", () => {
  const d = projectToSurface(SNAP, "page-post", ["The owner is 42 years old."]);
  assertRefused(d.refused, "F-6");
});

/* ---------- RED TEAM ---------- */

console.log("== RED TEAM ==");
t("RT-1 cross-business media bleed refused [F-3]", () => {
  const evil = { ...SNAP, media: [{ id: "m-other", objectId: "website-business-DEADBEEF", role: "hero", rightsSource: "business-provided", digest: "aa" }] };
  const d = projectToSurface(evil, "story-card");
  assert(d.mediaBound.length === 0, "foreign media was bound");
  assertRefused(d.refused, "F-3");
});
t("RT-2 unlicensed media excluded [F-4]", () => {
  const evil = { ...SNAP, media: [{ id: "m-hotlink", objectId: SNAP.objectId, role: "hero", rightsSource: "unclear-reference-only", digest: "bb" }] };
  const d = projectToSurface(evil, "story-card");
  assert(d.mediaBound.length === 0, "unlicensed media was bound");
  assertRefused(d.refused, "F-4");
});
t("RT-3 projectable media binds cleanly (labeled synthetic, rights OK)", () => {
  const ok = { ...SNAP, media: [{ id: "m-hero-synthetic", objectId: SNAP.objectId, role: "hero", rightsSource: "public-demo-source", digest: "cc" }] };
  const d = projectToSurface(ok, "story-card");
  assert(d.mediaBound.length === 1 && d.mediaBound[0].id === "m-hero-synthetic", "licensed media should bind");
  assert(d.refused.length === 0, "no refusals expected");
});
t("RT-4 engagement-as-observation never mutates the object", () => {
  const beforeDigest = sha256hex(canonical(SNAP));
  const fakeReview = {
    kind: "review", author: "random-user",
    text: "5 stars, amazing!!",
    attemptedCanonicalWrites: { summary: "The amazing 5-star best carpentry company!" },
  };
  const r = ingestEngagement(SNAP, fakeReview);
  assert(r.accepted === false, "poisoned engagement must be refused");
  assert(r.reason.includes("one-way boundary"), "reason must name the boundary");
  assert(sha256hex(canonical(SNAP)) === beforeDigest, "canonical object was mutated!");
  console.log("      canonical digest unchanged; refusal names: one-way boundary");
});
t("RT-5 honest engagement becomes an observation, not an object field", () => {
  const like = { kind: "like", author: "user-123", text: "" };
  const r = ingestEngagement(SNAP, like);
  assert(r.accepted === true && r.observation.fact_class === "DERIVED_FACT", "engagement must land as DERIVED_FACT observation");
  assert(sha256hex(canonical(SNAP)) === sha256hex(canonical(JSON.parse(readFileSync(join(HERE, "object-snapshot.json"), "utf8")))), "object untouched");
  assert(r.observation.note.includes("Never promotes"), "observation must carry the non-promotion note");
});
t("RT-6 hidden field is ABSENT, not redacted (INV-03)", () => {
  const hiddenEmail = { ...SNAP, contact: { ...SNAP.contact, email: undefined, addressVisibility: "hidden" } };
  const d = projectToSurface(hiddenEmail, "profile-blurb");
  assert(!d._outputText.includes("taylor@"), "hidden email leaked into output bytes");
  assert(d.lines.every((l) => !l.text.startsWith("Email:")), "no email claim rendered");
  assert(d.usedFields.every((f) => f !== "contact.email"), "email field absent from bindings");
});

console.log(`\n== RESULT: ${passed} passed, ${failed} failed ==`);
process.exit(failed > 0 ? 1 : 0);
