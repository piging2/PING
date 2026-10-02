# Phase 2+3: edits to re-apply on the Pig when the bridge recovers
# Base state on Pig (verified 2026-09-22 ~08:40 UTC, branch fyd/builder-composition):
# - src/app/api/fyd/ask/* : ask-pipeline.ts (WITH record cast fix), ask-route.ts, ask-siteid-route.ts,
#   ask-classes-tenant.test.ts (WITHOUT owner-correction integration test), visitor-answer.ts, jest.config.cjs, css-stub.cjs
# - src/app/api/fyd/objects/[objectId]/overrides/* : patch-loop.ts (WITHOUT view-digest changes),
#   overrides-route.ts (WITHOUT demoLabel/view-digest, but WITH record cast fix),
#   overrides-patch-loop.test.ts (WITHOUT new tests), jest.config.cjs, css-stub.cjs
# Pull each file from the Pig (base64 via bridge), apply the edits below with python
# (exact string replacements), transfer back via 2000-char base64 chunks, md5-verify,
# then run jest suites + filtered tsc.

## 1. src/app/api/fyd/objects/[objectId]/overrides/patch-loop.ts
E1. import line:
  OLD: import { knownServices } from "@/fyd/object/view";
  NEW: import { knownServices, loadObjectView } from "@/fyd/object/view";
E2. BoundApproval type: after `baseStateDigest: string;` add `baseViewDigest: string;`
  and document: base owner-state digest AND current composed build-view digest.
E3. Before buildBoundApproval, add:
  export function buildViewDigest(objectId: string): string {
    const view = loadObjectView(objectId);
    return digestOf(view ?? { objectId, missing: true });
  }
  (document: this is the current build-state equivalent of the requested base
  SiteSpec/state digest: it hashes the composed ObjectView the build surface renders.)
E4. buildBoundApproval: call buildViewDigest(objectId), include baseViewDigest in the
  returned approval object.

## 2. src/app/api/fyd/objects/[objectId]/overrides/route.ts
E1. import: add buildViewDigest to the "@/app/api/fyd/objects/[objectId]/overrides/patch-loop" import.
E2. Add helper (after the module docstring):
  function demoLabel() {
    return {
      demoOwnerContext: true as const,
      demoNote:
        "DEMO OWNER CONTEXT: mutations on this route run as a seeded demo " +
        "actor. No owner identity was verified. Not a production owner API.",
    };
  }
E3. Replace every `{ demoOwnerContext: true as const, ... }` / plain `{...}` error/success
  response object with `{ ...demoLabel(), ... }`. All 14 JSON responses must carry it,
  including tenant_mismatch, invalid_tenant, unknown-object 404, bad-body 400s,
  propose success, approve success, tampered-command 400, missing-digest 400, stale 409.
  Keep actorDisclosure on propose success (asserted by tests).
E4. Propose success digests: add `baseViewDigest: buildViewDigest(objectId)`.
E5. Approve: read `const presentedView = record.baseViewDigest;`
  validate: typeof presentedView === "string" && /^[0-9a-f]{64}$/.test(presentedView),
  else 400 { code: "missing_digest", error mentioning baseViewDigest }.
E6. Stale check becomes:
  const viewDigest = buildViewDigest(objectId);
  const stateMoved = presentedBase !== ownerStateDigest;
  const viewMoved = presentedView !== viewDigest;
  if (stateMoved || viewMoved) -> 409 stale_proposal, error message names which moved:
  "STALE PROPOSAL: the owner state changed since this proposal was drafted. ..."
  "STALE PROPOSAL: the build view (source refresh under the override) changed since this proposal was drafted. ..."
  include presentedBaseStateDigest, currentBaseStateDigest, presentedBaseViewDigest, currentBaseViewDigest.
E7. buildBoundApproval call gains presentedView argument.

## 3. src/app/api/fyd/objects/[objectId]/overrides/__tests__/overrides-patch-loop.test.ts
E1. approveProposal helper: pass baseViewDigest: body.digests.baseViewDigest.
E2. propose test: assert body.digests.baseViewDigest is 64-hex and stable across two proposes.
E3. approve-without-digests test: also assert demoNote contains "DEMO OWNER CONTEXT".
E4. tampered-command test: pass baseViewDigest; assert demo label on the 400.
E5. NEW test "tampered view digest": propose, approve with baseViewDigest = "0"*64,
  expect 409 stale_proposal, error matches /build view/, overrides file unchanged,
  response carries demo label.
E6. stale test: pass baseViewDigest; assert presentedBaseViewDigest in 409 body; assert demo label.
E7. bound-approve test: assert approval.baseViewDigest === digests.baseViewDigest.
E8. demo-label test: assert every listed response has demoOwnerContext true and demoNote
  mentions "DEMO OWNER CONTEXT" (propose success, approve success, tampered 400,
  missing-digest 400, stale 409, tenant-mismatch 400).
E9. NEW G4 test "body actor claims are ignored": propose, then approve with body
  { actor: { id: "mallory", label: "Mallory" }, ...digests incl. baseViewDigest };
  expect 200 and approval.actor.id === "demo-owner" and demoOwnerContext true.
E10. revert test: pass baseViewDigest in the revert approve call.

## 4. src/app/api/fyd/ask/__tests__/ask-classes-tenant.test.ts
E1. Add imports: mkdtempSync from node:fs, tmpdir from node:os, join from node:path.
E2. NEW test "SUPPORTED: an approved owner correction is answered by Ask FYD citing the owner override":
  - save/restore process.env.FYD_OWNER_DIR; set to mkdtempSync(join(tmpdir(), "fyd-owner-ask-"))
  - jest.requireActual the owner-store, view, ping-object-source, owner-overlay modules
  - knownServices("happy-place") -> ids, names
  - parseOwnerCommand({type:"set-contact-field",field:"phone",value:"+1 541 555 0123"})
  - read raw source phone exactly like the approve stage:
    getPingObjectGraphSync("happy-place", { ownerOverlay: false }).graph
    -> findBusinessObject -> rawFieldValue(business, "phone"); expect "+15412865190"
  - applyOwnerCommand("happy-place", command, ids, names, { sourceValue, actorLabel: "Demo Owner (seeded, unverified)" })
  - POST nested route (happy-place) { question: "What is the phone number?", mode: "visitor" }
  - expect 200, ok true, refusal false, answerClass "supported"
  - answer contains "+1 541 555 0123" and matches /owner corrected/i
  - at least one citation with /owner correction/i in source and claimClass "supported"

## 5. src/app/api/fyd/ask/ask-pipeline.ts
(already has the record cast fix on the Pig; no further edit)

## After re-applying: run on Pig
- npx jest --config src/app/api/fyd/objects/[objectId]/overrides/jest.config.cjs
- npx jest --config src/app/api/fyd/ask/jest.config.cjs
- filtered tsc --noEmit on the worker surfaces
- builder + tenant regression suites
- stage explicit paths, commit locally (no push)
