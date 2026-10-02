/**
 * Lane T spike: synthetic fixtures. Recorded responses only, no live data.
 * Mirrors the capability record contract from ACTION-PLANNER-DESIGN.md section 4.
 */
"use strict";

function cap(id, kind, { evidenceState = "observed", receipt = "the business website", lastChecked = "2026-09-20", status = "active", grantRequired = null, valueRef = null } = {}) {
  return {
    id,
    kind,
    objectId: "obj:happy-place-carpentry",
    label: kind === "phone" ? "Phone" : kind === "email" ? "Email" : kind,
    valueRef: valueRef || `(verified ${kind} on file)`,
    evidence: { state: evidenceState, receipt, steps: [], asOf: lastChecked },
    lastChecked,
    status,
    grantRequired,
    limits: {},
  };
}

const HAPPY_PLACE_CAPS = [
  cap("cap:phone:hpc-001", "phone"),
  cap("cap:email:hpc-001", "email"),
  cap("cap:form:hpc-001", "contact_form", { evidenceState: "inferred", receipt: "contact page form detected" }),
];

const HAPPY_PLACE_CAPS_WITH_BOOKING = [
  ...HAPPY_PLACE_CAPS,
  cap("cap:booking:hpc-001", "booking", { valueRef: "https://books.example/hpc" }),
];

const HAPPY_PLACE_CAPS_VANISHED_BOOKING = [
  ...HAPPY_PLACE_CAPS,
  cap("cap:booking:hpc-001", "booking", { status: "vanished", lastChecked: "2026-09-23", valueRef: "https://books.example/hpc" }),
];

const HAPPY_PLACE_CAPS_STALE_PHONE = [
  cap("cap:phone:hpc-001", "phone", { status: "stale", lastChecked: "2025-06-01", evidenceState: "unverified" }),
  cap("cap:email:hpc-001", "email"),
];

const NO_CONTACT_CAPS = [];

const CTX_BASE = {
  targetObjectId: "obj:happy-place-carpentry",
  targetTitle: "Happy Place Carpentry",
  controllerId: "id:owner-1",
  grants: [],
  forbiddenEffects: ["purchase.make", "ad.buy"],
};

const PRINCIPALS = {
  visitor: { kind: "visitor", viewerId: "id:visitor-7" },
  owner: { kind: "owner", viewerId: "id:owner-1" },
  anonymous: { kind: "anonymous", viewerId: null },
};

function ctx(principal, capabilities, extra = {}) {
  return { ...CTX_BASE, principal, capabilities, ...extra };
}

module.exports = {
  cap, ctx, PRINCIPALS,
  HAPPY_PLACE_CAPS, HAPPY_PLACE_CAPS_WITH_BOOKING,
  HAPPY_PLACE_CAPS_VANISHED_BOOKING, HAPPY_PLACE_CAPS_STALE_PHONE,
  NO_CONTACT_CAPS,
};
