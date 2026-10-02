# CAPABILITY RECORD FORMAT (Lane S — published for lanes T, G, I)

**Status:** published 2026-09-23. Lane S owns the record shape; lanes T/G/I consume it.
**Authority note:** this record is DERIVED truth (observation -> candidate -> gate ->
resolved). The DECISION authority remains PING's existing machinery
(src/fyd/ask/capabilities.ts FORBIDDEN_AGENT_EFFECTS + FydGrant vocabulary);
this layer discovers and resolves, it does not re-decide.

## 1. Canonical record (discovery layer)

```jsonc
{
  "capabilityId": "cap_<16 hex>",   // deterministic: sha256(tenantId|kind|channel|endpointIdentity)
  "tenantId": "coppersmith-plumbing",
  "objectId": "website-business-2f1327c09d622175",  // owning business object
  "kind": "contact.request | booking.schedule | quote.request | order.purchase | subscribe.newsletter | calendar.subscribe | event.enroll | api.invoke | visit.in_person | fact.correct | report.view",
  "channel": "phone | email | form | provider | social_dm | in_person | api | console",
  "description": "Call Coppersmith Plumbing at the published number",  // human
  "status": "candidate | resolved | withdrawn | needs_review",
  "visibility": "public | owner",       // who may learn of its existence
  "existenceSensitivity": "low | high", // high => denials are generic ("not available")
  "parameters": {
    "displayValue": "(970) 245-3869",   // VERBATIM as observed; NEVER invented, NEVER a secret
    "actionUri": "tel:+19702453869",    // allowlisted scheme only; null when display-only
    "formUrl": null, "bookingUrl": null, "provider": null
  },
  "requiredPrincipal": "public | owner", // derived from visibility; kept explicit for readers
  "requiredScope": null,                 // FydGrant | null (e.g. "business.mutate")
  "approvalClass": "auto | owner-approval | human-approval",
  "effects": ["visitor is shown the business phone number"],
  "reversibility": "presentation-only; offering the affordance changes no world state",
  "cost": "none",
  "preconditions": [                     // the gate checks that passed, as named preconditions
    "policy.evidence.pass", "policy.authorization.pass", "policy.legitimacy.pass",
    "policy.safety.pass", "policy.no_customer_posing.pass",
    "policy.owner_state.pass", "policy.conflict.pass"
  ],
  "evidence": [
    { "observationId": "cop-o1", "grade": "SUPPORTED", "sourceId": "site",
      "firstParty": true, "factRef": "telephone",
      "sourceUrl": "https://coppersmithplumbing.com/" }
  ],
  "policy": {
    "policyVersion": "cap-policy@1",
    "decidedAt": "2026-09-23T19:05:00.000Z",
    "checks": { "evidence": "pass", "authorization": "pass", "legitimacy": "pass",
                "safety": "pass", "no_customer_posing": "pass",
                "owner_state": "pass", "conflict": "pass" },
    "decidedBy": "policy-gate"
  },
  "lineage": {
    "observationIds": ["cop-o1"],
    "factRefs": ["telephone"],
    "detector": "phone-detector@1",
    "supersedes": null,                  // set on re-resolution after withdrawal
    "withdrawal": null,                  // { cause, at } when status=withdrawn
    "review": null                       // { cause } when status=needs_review
  },
  "surfaces": ["object_view", "ask_context", "sitespec_section", "owner_console"],
  "version": 1,
  "lastChecked": "2026-09-23T19:05:00.000Z",  // freshness source for lane T
  "updatedAt": "2026-09-23T19:05:00.000Z"
}
```

Invariants:
- `parameters` NEVER carries secrets (lane L). A capability that needs a token is a
  capability HANDLE; the token lives in the secret broker.
- `status=candidate` records NEVER leave the discovery layer (not to T, G, I, or viewers).
- `status=withdrawn` records are tombstones: kept for lineage/audit, never offered.
- Withdrawal is an append; re-resolution never inherits a past gate decision.
- `displayValue` is binding-verified verbatim; normalization (E.164) touches `actionUri` only.

## 2. Resolution contract (what consumers actually read)

`resolveForPrincipal(records, { principal, contextObjectId })` -> per record:
`{ capabilityId, decision: "granted"|"denied"|"invisible", reason, rule?, record? }`

Rules (in order; all fail-closed):
- R0 status must be `resolved`, else invisible (candidates/withdrawn/needs_review never offered).
- R1 object binding: `record.objectId === contextObjectId`, else invisible.
  Relationship traversal yields at most a `reference` affordance, never the target's
  capabilities. Rule id: `capability.object-binding`.
- R2a high-sensitivity owner-only: denied GENERICALLY ("not available to this
  principal"), rule `visibility.owner.no-leak`. No name, no kind, no reason detail.
- R3 agent boundary: agent principal + `requiredScope` in FORBIDDEN_AGENT_EFFECTS ->
  denied with the exact rule: "Ask FYD agent boundary: '<grant>' is never
  agent-authorized." Rule id: `agent.forbidden-effect (FORBIDDEN_AGENT_EFFECTS)`.
  Runs before low-sensitivity visibility so the agent gets the exact citation;
  runs after R2a so no-leak capabilities stay un-named.
- R2b low-sensitivity owner-only: denied naming the rule (`visibility.owner`).
- R4 grants: non-null `requiredScope` must be held, else denied (`grant.missing`).

Execution-time re-check (TOCTOU): `executeGuard(record, registry)` re-reads the live
entry at USE time; refuses (`execution.recheck-status` / `execution.recheck-params`)
when the record is no longer resolved or its parameters changed. Resolution is not a
license to act later.

Enumeration guard: cross-tenant kind queries are refused
(`enumeration.cross-tenant-denied`) unless the principal holds the admin grant;
scoped queries return records that still pass `resolveForPrincipal`.

## 3. Projection to Lane T's CapabilityRecord (lane T consumes this shape)

Lane T's contract (ACTION-PLANNER-DESIGN.md section 4) is satisfied by this projection:

| Lane T field | Projection from this record |
|---|---|
| id | capabilityId |
| kind | kind table below; S kind strings pass through verbatim when outside T's listed union (the union documents the common set, it is not a closed enum) |
| objectId | objectId |
| label | description |
| valueRef | parameters.displayValue (public claim) or deep-link token; NEVER a secret |
| evidence | { state: derived from evidence[0].grade (SUPPORTED->observed, DERIVED->inferred, owner attestation->observed), receipt: "policy-gate <policyVersion>", steps: lineage.detector, asOf: lastChecked } |
| lastChecked | lastChecked |
| status | resolved+fresh->"active"; resolved+older than 30d->"stale"; withdrawn->"vanished"; candidate/needs_review NEVER projected |
| grantRequired | requiredScope |
| limits | { note: cost } (+ provider quotas when present) |

Kind table (S kind+channel -> T kind):
contact.request/phone->phone; contact.request/email->email;
contact.request/form->contact_form; quote.request/form->contact_form;
booking.schedule->booking; visit.in_person->directions;
subscribe.newsletter, calendar.subscribe, event.enroll, api.invoke,
fact.correct, order.purchase, report.view -> pass S kind string through.

## 4. Contract for Lane G (Ask FYD context compiler)

- The compiler includes ONLY records with status=resolved AND decision=granted for the
  viewer; denials are not claims and must not enter the packet as claims.
- Where the packet must explain a refusal, use the resolution `reason` verbatim;
  for R2a (no-leak) the packet carries exactly "not available to this principal".
- Withdrawn capabilities MUST be filtered before packet assembly; a withdrawn record
  that reaches the concierge is a pipeline bug (spike test PROOF-6 / RED-5).

## 5. Declarative extension (no code deploy for new kinds)

New capability kinds are added by writing rows in `spike/detectors.registry.json`
(kind, channel, description, observation patterns, gate params). A new detector
MODULE is needed only when the pattern language cannot express the observation
shape; anything needing judgment becomes a review-queue entry, never silent
auto-resolution.
