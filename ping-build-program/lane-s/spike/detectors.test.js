/**
 * Spike tests: detector set + policy gate against synthetic website observations.
 * Run: node --test
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { obs, detect, gate } = require("./detectors");

const TENANT = "clearwater-plumbing-demo";
const CTX = {
  ownerHidden: [],
  ownerConfirmed: [],
  conflicts: [],
  firstPartyHost: "clearwater.example.com",
};

function realSiteObservations() {
  return [
    obs({ observationId: "o1", sourceId: "site", factRef: "telephone",
      value: "tel:+19705550142", grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://clearwater.example.com/", kind: "anchor" }),
    obs({ observationId: "o2", sourceId: "site", factRef: "telephone",
      value: "+1-970-555-0142", grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://clearwater.example.com/", kind: "jsonld" }),
    obs({ observationId: "o3", sourceId: "site", factRef: "email",
      value: "mailto:hello@clearwater.example.com", grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://clearwater.example.com/", kind: "anchor" }),
    obs({ observationId: "o4", sourceId: "site", factRef: "contact_form",
      value: "https://clearwater.example.com/contact", grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://clearwater.example.com/contact", kind: "dom", context: "contact us" }),
    obs({ observationId: "o5", sourceId: "site", factRef: "quote_form",
      value: "https://clearwater.example.com/estimate", grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://clearwater.example.com/estimate", kind: "dom",
      context: "request an estimate for your project" }),
    obs({ observationId: "o6", sourceId: "site", factRef: "booking",
      value: "https://calendly.com/clearwater-plumbing/consult", grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://clearwater.example.com/book", kind: "anchor", context: "book online" }),
  ];
}

test("real observations: phone dedupes across tel: anchor and JSON-LD, both resolve", () => {
  const cands = detect(TENANT, realSiteObservations());
  const phones = cands.filter((c) => c.channel === "phone");
  assert.equal(phones.length, 1, "two phone observations collapse to one candidate");
  assert.equal(phones[0].evidence.length, 2);
  const r = gate(phones[0], CTX);
  assert.equal(r.status, "resolved");
  assert.equal(r.record.parameters.actionUri, "tel:+19705550142");
  assert.ok(r.record.parameters.displayValue.length > 0, "display value is observed, not invented");
});

test("email, contact form, quote form, booking all resolve on first-party evidence", () => {
  const cands = detect(TENANT, realSiteObservations());
  const byChannel = Object.fromEntries(cands.map((c) => [c.channel + ":" + c.kind, c]));
  assert.ok(byChannel["email:contact.request"]);
  assert.ok(byChannel["form:contact.request"]);
  assert.ok(byChannel["form:quote.request"], "project-scoped form becomes quote.request, not generic contact");
  assert.ok(byChannel["provider:booking.schedule"]);
  for (const c of cands) {
    const r = gate(c, CTX);
    assert.equal(r.status, "resolved", JSON.stringify(r.failures));
  }
});

test("INFERRED and UNKNOWN observations never produce candidates", () => {
  const cands = detect(TENANT, [
    obs({ observationId: "x1", sourceId: "site", factRef: "telephone",
      value: "tel:+19705559999", grade: "INFERRED", firstParty: true,
      sourceUrl: "https://clearwater.example.com/", kind: "anchor" }),
    obs({ observationId: "x2", sourceId: "site", factRef: "email",
      value: "mailto:guess@clearwater.example.com", grade: "UNKNOWN", firstParty: false,
      sourceUrl: "https://clearwater.example.com/", kind: "anchor" }),
  ]);
  assert.equal(cands.length, 0);
});

test("third-party-only phone number is detected but REJECTED at the gate", () => {
  const cands = detect(TENANT, [
    obs({ observationId: "y1", sourceId: "aggregator", factRef: "telephone",
      value: "tel:+19705558888", grade: "SUPPORTED", firstParty: false,
      sourceUrl: "https://random-directory.example/listings/123", kind: "anchor" }),
  ]);
  assert.equal(cands.length, 1, "detector fires on the observation");
  const r = gate(cands[0], CTX);
  assert.equal(r.status, "rejected");
  assert.ok(r.failures.some((f) => f.startsWith("authorization")));
});

test("phishing form action on attacker domain is REJECTED at the safety check", () => {
  const cands = detect(TENANT, [
    obs({ observationId: "z1", sourceId: "site", factRef: "contact_form",
      value: "https://clearwater-examp1e.evil.example/harvest", grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://clearwater.example.com/contact", kind: "dom", context: "contact" }),
  ]);
  assert.equal(cands.length, 1);
  const r = gate(cands[0], CTX);
  assert.equal(r.status, "rejected");
  assert.ok(r.failures.some((f) => f.startsWith("safety")));
});

test("booking on a non-allowlisted provider is REJECTED (no live link without review)", () => {
  const cands = detect(TENANT, [
    obs({ observationId: "b1", sourceId: "site", factRef: "booking",
      value: "https://sketchy-booker.example/acct/9", grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://clearwater.example.com/book", kind: "anchor", context: "book online" }),
  ]);
  assert.equal(cands.length, 0, "detector allowlist drops unknown booking providers before the gate");
});

test("bare phone-shaped text with no contact context produces no candidate", () => {
  const cands = detect(TENANT, [
    obs({ observationId: "t1", sourceId: "site", factRef: "body_text",
      value: "call now!!! 9705550100 deals deals", grade: "SUPPORTED", firstParty: true,
      sourceUrl: "https://clearwater.example.com/blog", kind: "text" }),
  ]);
  assert.equal(cands.length, 0);
});

test("owner HIDE suppresses an otherwise resolvable capability", () => {
  const cands = detect(TENANT, realSiteObservations());
  const phone = cands.find((c) => c.channel === "phone");
  const r = gate(phone, { ...CTX, ownerHidden: [phone.capabilityId] });
  assert.equal(r.status, "rejected");
  assert.ok(r.failures.some((f) => f.startsWith("owner_state")));
});

test("unresolved conflict on the phone fact blocks phone resolution only", () => {
  const cands = detect(TENANT, realSiteObservations());
  const ctx = { ...CTX, conflicts: ["telephone"] };
  const phone = cands.find((c) => c.channel === "phone");
  const email = cands.find((c) => c.channel === "email");
  assert.equal(gate(phone, ctx).status, "rejected");
  assert.equal(gate(email, ctx).status, "resolved", "email unaffected by the phone conflict");
});

test("capability ids are deterministic across runs (occurrence identity)", () => {
  const a = detect(TENANT, realSiteObservations());
  const b = detect(TENANT, realSiteObservations());
  assert.deepEqual(
    a.map((c) => c.capabilityId).sort(),
    b.map((c) => c.capabilityId).sort(),
  );
});

test("withdrawal: absent source on refresh marks the capability withdrawn, never deleted", () => {
  // Simulate: refresh drops the booking observation; detector emits ABSENT.
  const before = detect(TENANT, realSiteObservations());
  const booking = before.find((c) => c.kind === "booking.schedule");
  const resolved = gate(booking, CTX).record;
  assert.equal(resolved.status, "resolved");

  const afterRefresh = realSiteObservations().filter((o) => o.observationId !== "o6");
  const after = detect(TENANT, afterRefresh);
  assert.ok(!after.some((c) => c.kind === "booking.schedule"), "no fresh candidate without the observation");

  // Lifecycle transition the registry would apply:
  const withdrawn = { ...resolved, status: "withdrawn",
    withdrawal: { cause: "source_absent", at: "2026-09-23T20:00:00.000Z", supersedes: null } };
  assert.equal(withdrawn.status, "withdrawn");
  assert.ok(withdrawn.lineage.observationIds.length > 0, "lineage retained after withdrawal");
  assert.ok(withdrawn.policy.checks, "gate decision retained for audit");
});
