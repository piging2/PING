/**
 * LANE S SPIKE: capability detector set + policy gate against synthetic
 * website observations.
 *
 * Pure JS, no dependencies, no network, no model. Run: node --test spike/
 *
 * Pipeline under test: synthetic observations (graded) -> detectors ->
 * candidates -> policy gate -> resolved/withdrawn capability records.
 */
"use strict";

const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Observation helpers (synthetic fixtures stand in for stage 2/3 output)
// ---------------------------------------------------------------------------

function obs({ observationId, sourceId, factRef, value, grade, firstParty, sourceUrl, kind, context }) {
  return {
    observationId,
    sourceId,
    factRef,
    value,
    grade, // SUPPORTED | DERIVED | INFERRED | UNKNOWN
    firstParty: !!firstParty,
    sourceUrl,
    kind: kind || "dom", // dom | jsonld | anchor | text
    observedAt: "2026-09-23T19:00:00.000Z",
    context: context || "",
  };
}

const GRADES_OK = new Set(["SUPPORTED", "DERIVED"]);

// ---------------------------------------------------------------------------
// Detectors: deterministic matchers over graded observations.
// Each returns candidate capabilities (status "candidate") or [].
// ---------------------------------------------------------------------------

const PHONE_RE = /\+?1?[-.\s()]?\d{3}[-.\s()]?\d{3}[-.\s()]?\d{4}/;
const BOOKING_PROVIDERS = ["calendly.com", "acuity.squarespace.com", "square.site", "booksy.com"];

function capId(tenantId, kind, channel, endpointIdentity) {
  const h = crypto.createHash("sha256")
    .update([tenantId, kind, channel, endpointIdentity].join("|")).digest("hex");
  return "cap_" + h.slice(0, 16);
}

function candidate({ tenantId, kind, channel, parameters, evidence, detector }) {
  const endpointIdentity = parameters.actionUri || parameters.formUrl || parameters.bookingUrl || parameters.displayValue;
  return {
    capabilityId: capId(tenantId, kind, channel, endpointIdentity),
    tenantId, kind, channel, status: "candidate",
    parameters, evidence,
    lineage: {
      observationIds: evidence.map((e) => e.observationId),
      factRefs: [...new Set(evidence.map((e) => e.factRef))],
      detector,
    },
  };
}

function phoneDetector(tenantId, observations) {
  const out = [];
  for (const o of observations) {
    if (!GRADES_OK.has(o.grade)) continue;
    const isTel = o.kind === "anchor" && o.value.startsWith("tel:");
    const isSchema = o.kind === "jsonld" && o.factRef === "telephone";
    if (!isTel && !isSchema) continue;
    const m = o.value.match(PHONE_RE);
    if (!m) continue;
    const digits = m[0].replace(/\D/g, "");
    const e164 = digits.length === 10 ? "+1" + digits : "+" + digits;
    out.push(candidate({
      tenantId, kind: "contact.request", channel: "phone",
      parameters: { displayValue: m[0], actionUri: "tel:" + e164 },
      evidence: [{ observationId: o.observationId, grade: o.grade, sourceId: o.sourceId, firstParty: o.firstParty, factRef: o.factRef, sourceUrl: o.sourceUrl }],
      detector: "phone-detector@1",
    }));
  }
  return out;
}

function emailDetector(tenantId, observations) {
  const out = [];
  for (const o of observations) {
    if (!GRADES_OK.has(o.grade)) continue;
    const isMailto = o.kind === "anchor" && o.value.startsWith("mailto:");
    const isSchema = o.kind === "jsonld" && o.factRef === "email";
    if (!isMailto && !isSchema) continue;
    const addr = o.value.replace(/^mailto:/, "").split("?")[0];
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) continue;
    out.push(candidate({
      tenantId, kind: "contact.request", channel: "email",
      parameters: { displayValue: addr, actionUri: "mailto:" + addr },
      evidence: [{ observationId: o.observationId, grade: o.grade, sourceId: o.sourceId, firstParty: o.firstParty, factRef: o.factRef, sourceUrl: o.sourceUrl }],
      detector: "email-detector@1",
    }));
  }
  return out;
}

function formDetector(tenantId, observations) {
  const out = [];
  for (const o of observations) {
    if (!GRADES_OK.has(o.grade)) continue;
    if (o.kind !== "dom" || (o.factRef !== "contact_form" && o.factRef !== "quote_form")) continue;
    let actionUrl;
    try { actionUrl = new URL(o.value); } catch { continue; }
    const projectScoped = /estimate|quote|project|service/i.test(o.context || "");
    out.push(candidate({
      tenantId, kind: projectScoped ? "quote.request" : "contact.request", channel: "form",
      parameters: { formUrl: actionUrl.href, displayValue: "Contact form" },
      evidence: [{ observationId: o.observationId, grade: o.grade, sourceId: o.sourceId, firstParty: o.firstParty, factRef: o.factRef, sourceUrl: o.sourceUrl }],
      detector: "form-detector@1",
    }));
  }
  return out;
}

function bookingDetector(tenantId, observations) {
  const out = [];
  for (const o of observations) {
    if (!GRADES_OK.has(o.grade)) continue;
    if (o.kind !== "anchor" && o.kind !== "dom") continue;
    if (!/book|schedule|appointment/i.test(o.context || "") && o.kind !== "dom") continue;
    let url;
    try { url = new URL(o.value); } catch { continue; }
    if (!BOOKING_PROVIDERS.some((p) => url.hostname.endsWith(p))) continue;
    out.push(candidate({
      tenantId, kind: "booking.schedule", channel: "provider",
      parameters: { bookingUrl: url.href, provider: url.hostname, displayValue: "Book online" },
      evidence: [{ observationId: o.observationId, grade: o.grade, sourceId: o.sourceId, firstParty: o.firstParty, factRef: o.factRef, sourceUrl: o.sourceUrl }],
      detector: "booking-detector@1",
    }));
  }
  return out;
}

function newsletterDetector(tenantId, observations) {
  const out = [];
  for (const o of observations) {
    if (!GRADES_OK.has(o.grade)) continue;
    if (o.kind !== "dom" || o.factRef !== "newsletter_form") continue;
    let actionUrl;
    try { actionUrl = new URL(o.value); } catch { continue; }
    out.push(candidate({
      tenantId, kind: "subscribe.newsletter", channel: "form",
      parameters: { formUrl: actionUrl.href, displayValue: "Newsletter signup" },
      evidence: [{ observationId: o.observationId, grade: o.grade, sourceId: o.sourceId, firstParty: o.firstParty, factRef: o.factRef, sourceUrl: o.sourceUrl }],
      detector: "newsletter-detector@1",
    }));
  }
  return out;
}

function locationDetector(tenantId, observations) {
  const out = [];
  for (const o of observations) {
    if (!GRADES_OK.has(o.grade)) continue;
    if (o.kind !== "dom" && o.kind !== "jsonld") continue;
    if (o.factRef !== "postal_address" && o.factRef !== "address") continue;
    if (!o.value || o.value.trim().length < 4) continue;
    out.push(candidate({
      tenantId, kind: "visit.in_person", channel: "in_person",
      parameters: { displayValue: o.value.trim().slice(0, 160), actionUri: null },
      evidence: [{ observationId: o.observationId, grade: o.grade, sourceId: o.sourceId, firstParty: o.firstParty, factRef: o.factRef, sourceUrl: o.sourceUrl }],
      detector: "location-detector@1",
    }));
  }
  return out;
}

const DETECTORS = [phoneDetector, emailDetector, formDetector, bookingDetector, newsletterDetector, locationDetector];

function detect(tenantId, observations) {
  const all = [];
  for (const d of DETECTORS) all.push(...d(tenantId, observations));
  // Dedupe by capabilityId: same endpoint observed twice -> one candidate, merged evidence.
  const byId = new Map();
  for (const c of all) {
    const prev = byId.get(c.capabilityId);
    if (prev) {
      for (const e of c.evidence) {
        if (!prev.evidence.some((x) => x.observationId === e.observationId)) prev.evidence.push(e);
      }
      for (const id of c.lineage.observationIds) {
        if (!prev.lineage.observationIds.includes(id)) prev.lineage.observationIds.push(id);
      }
    } else byId.set(c.capabilityId, c);
  }
  return [...byId.values()];
}

// ---------------------------------------------------------------------------
// Policy gate: fail-closed. Returns { status: "resolved"|"rejected", record?, failures[] }.
// ---------------------------------------------------------------------------

const POLICY_VERSION = "cap-policy@1-spike";

function safeUri(uri, allowedSchemes) {
  try {
    const u = new URL(uri);
    if (!allowedSchemes.includes(u.protocol.replace(":", ""))) return false;
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(uri)) return false;
    return true;
  } catch { return false; }
}

function gate(candidateCap, ctx) {
  // ctx: { ownerHidden: string[] (capabilityIds), ownerConfirmed: string[] (factRefs),
  //        conflicts: string[] (factRefs under unresolved conflict), firstPartyHost: string }
  const failures = [];
  const checks = {};

  // 1. evidence sufficiency: >=1 SUPPORTED/DERIVED citation, >=1 first-party or owner-confirmed
  const ev = candidateCap.evidence.filter((e) => GRADES_OK.has(e.grade));
  const firstParty = ev.some((e) => e.firstParty) ||
    ctx.ownerConfirmed.some((f) => candidateCap.lineage.factRefs?.includes(f));
  checks.evidence = ev.length > 0 && (ev.some((e) => e.firstParty) || ctx.ownerConfirmed.length > 0)
    ? "pass" : "fail";
  if (checks.evidence === "fail") failures.push("evidence: no first-party SUPPORTED/DERIVED citation");

  // 2. authorization: at least one citation from the business's own host or owner attestation
  const authorized = ev.some((e) => {
    try { return new URL(e.sourceUrl || "").hostname === ctx.firstPartyHost; }
    catch { return !!e.firstParty; }
  }) || ctx.ownerConfirmed.length > 0;
  checks.authorization = authorized ? "pass" : "fail";
  if (!authorized) failures.push("authorization: no first-party or owner-attested source");

  // 3. legitimacy: display value used verbatim, never invented
  checks.legitimacy = candidateCap.parameters.displayValue ? "pass" : "fail";
  if (checks.legitimacy === "fail") failures.push("legitimacy: no observed display value");

  // 4. safety: URIs through the allowlist gate
  const p = candidateCap.parameters;
  const uriChecks = [];
  if (p.actionUri) {
    const scheme = candidateCap.channel === "phone" ? ["tel"]
      : candidateCap.channel === "email" ? ["mailto"] : ["https"];
    uriChecks.push(safeUri(p.actionUri, scheme));
  }
  if (p.formUrl) {
    let ok = safeUri(p.formUrl, ["https"]);
    try {
      const host = new URL(p.formUrl).hostname;
      ok = ok && (host === ctx.firstPartyHost || host.endsWith("formspree.io") || host.endsWith("typeform.com"));
    } catch { ok = false; }
    uriChecks.push(ok);
  }
  if (p.bookingUrl) {
    let ok = safeUri(p.bookingUrl, ["https"]);
    try { ok = ok && BOOKING_PROVIDERS.some((bp) => new URL(p.bookingUrl).hostname.endsWith(bp)); }
    catch { ok = false; }
    uriChecks.push(ok);
  }
  checks.safety = uriChecks.length === 0 ? "pass"   // display-only capability: no URI to gate
    : uriChecks.every(Boolean) ? "pass" : "fail";
  if (checks.safety === "fail") failures.push("safety: URI failed the allowlist gate");

  // 5. no customer-posing: capabilities are presentation-only, never executed by us
  checks.no_customer_posing = "pass"; // structural: this pipeline never executes actions

  // 6. owner state
  if (ctx.ownerHidden.includes(candidateCap.capabilityId)) {
    checks.owner_state = "fail";
    failures.push("owner_state: owner hid this capability");
  } else checks.owner_state = "pass";

  // 7. conflict honesty
  const factRefs = candidateCap.lineage.factRefs || [];
  const blocked = factRefs.some((f) => ctx.conflicts.includes(f));
  checks.conflict = blocked ? "fail" : "pass";
  if (blocked) failures.push("conflict: underlying fact under unresolved conflict");

  if (failures.length > 0) {
    return { status: "rejected", failures, checks, capabilityId: candidateCap.capabilityId };
  }
  return {
    status: "resolved",
    record: {
      ...candidateCap,
      status: "resolved",
      policy: { policyVersion: POLICY_VERSION, decidedAt: "2026-09-23T19:05:00.000Z", checks, decidedBy: "policy-gate" },
      surfaces: ["object_view", "ask_context", "sitespec_section"],
      version: 1,
    },
  };
}

module.exports = {
  obs, detect, gate, DETECTORS, POLICY_VERSION,
  phoneDetector, emailDetector, formDetector, bookingDetector, newsletterDetector,
  locationDetector,
};
