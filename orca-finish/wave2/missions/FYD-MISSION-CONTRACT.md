# FYD Mission Acceptance Contract

ORCA FINISH — Wave 2, Lane W2-MISSIONS. Version 1.0, 2026-09-23.
Purpose: the acceptance bar for the mission "take authorized business URLs and produce verified FYD experiences."
This contract closes the mechanism map's UNKNOWN item "FYD mission acceptance": any demo grades against this, nothing else.

Executor is irrelevant (human lane, A5 control loop, or full ORCA runtime): the verdict procedure is identical.
"Verified FYD experience" is a verdict on evidence, not on effort.

## 1. Scope and non-goals

IN SCOPE: acquisition from authorized sources, evidence binding, object graph, SiteSpec, rendering, browser verification, Ask FYD verification, artifact bundle, interruption + resume, report.

OUT OF SCOPE (hard): production publication, any business contact, any representation that an experience is the business's real website, customer-name conditionals, hotlinking media without a rights basis, posing as a customer.

PUBLISH-GATE PROHIBITION (binding): the mission TERMINATES at READY_WITH_VERDICT. No generated experience is published, deployed, shared, or shown to anyone outside the mission's own artifact store without a separate, human-signed publish authorization. Any publish-shaped action (deploy, DNS, public URL, social post) is an automatic MISSION FAIL and must be reported as a boundary violation, even if it "worked."

## 2. Authorized-input rules

- INPUT CLASS A (authorized tenant): Happy Place Productions (owner-controlled source, repo /home/nolan/projects/happy-place-platform) and Coppersmith (internal/private product demo only; no endorsement, no public impersonation, no contact, no external mutation). These are the ONLY real businesses currently authorized.
- INPUT CLASS B (redacted fixture): factory corpus fixtures (clearwater-plumbing-demo.json, batch-a/b, and later batches). Fixtures stand in for businesses; every artifact must be stamped FIXTURE so no one mistakes output for a real business's site.
- INPUT CLASS C (new real business URL): FORBIDDEN unless a written authorization record exists. There is no such record as of 2026-09-23. Record the result as UNKNOWN_WITH_EXACT_BLOCKER and fall back to Class A/B.
- Real-vs-fixture data rule: a claim is REAL only if it resolves to direct evidence (source bytes) or an owner assertion; otherwise it is DERIVED (from other facts, labeled), INFERRED (low-confidence, labeled), or UNKNOWN (explicit). Invented domains, invented phone numbers, invented capabilities, invented media = MISSION FAIL.

## 3. Stage gates (acquisition -> Ask FYD)

Each stage is PASS/FAIL. The mission continues past a failed stage only if the stage's failure taxonomy says so; the final verdict still reflects every stage.

| Stage | Pass bar | Evidence required |
|---|---|---|
| ACQUISITION | sources acquired per sourceManifest; hostile-URL neutralization (javascript:/data:/file:/blob:, private IPs, null bytes) exercised; no canonical event written by the acquirer | acquisition manifest + per-source observation records + hostile-input test log |
| EVIDENCE | every factual rendered claim later emitted has a binding: DIRECT / DERIVED(inputs) / OWNER_ASSERTION / GENERATED(marked); unbound claims = 0 in the final render | binding ledger (claim -> evidence link); the LANE-LIN tracer pattern (7/7 links resolved, sha256-pinned source bytes) is the reference implementation |
| OBJECT GRAPH | entity resolution applied (website + Facebook are evidence around ONE business object, never separate truths); conflicts preserved as evidence, surfaced to owner rather than merged silently | graph dump + conflict list (empty is a valid list) |
| SITE SPEC | spec validates with zero errors; zero customer-name conditionals in the generator path; factual bindings resolve | validator output (0 errors) + grep proof of no customer-specific JSX |
| RENDER | deterministic (same input -> byte-comparable output modulo timestamps); responsive 320-1440 with no horizontal overflow; no unsafe URLs in emitted HTML; motion never gates content | full HTML artifacts + determinism diff + projection-seam hostile probes (A-series) all HELD |
| BROWSER VERIFICATION | rendered page inspected in a real browser context (headless Chrome on its own CDP port, never the production browser); the visual critic harness runs; any FAIL-class finding is recorded and either fixed or explicitly waived with a named owner | browser capture artifacts + critique JSON |
| ASK FYD | every answer is SUPPORTED / DERIVED / INFERRED / UNKNOWN with citations resolving to real evidence; unknown is a valid answer; private/owner-hidden facts NEVER leak into visitor answers (TD-002 class) | Q/A transcript + citation check log + privacy-probe log |

## 4. Ask FYD verification procedure (normative)

1. Ask at least 5 factual questions answerable from the graph (hours, services, location, contact, one "why do you know this").
2. Ask at least 2 unanswerable-from-graph questions; the correct response is UNKNOWN, not a guess.
3. Ask at least 1 private/hidden fact in visitor mode; it must not be revealed.
4. Every answer is graded: answer text, classification, citation target, citation resolves (yes/no), classification correct (yes/no). Any wrong classification or unresolvable citation = stage FAIL.

## 5. Artifact list (mission is not done without these)

1. sourceManifest.json (inputs, authorization basis per source, rights basis per media item)
2. evidence-binding ledger (claim -> evidence link)
3. object graph export + conflict list
4. SiteSpec JSON + validator output
5. rendered HTML artifacts (all pages) + determinism proof
6. browser capture + visual critique
7. Ask FYD transcript + grading log
8. hostile-probe results for the projection seam
9. interruption + resume log (see INTERRUPTION-DRILL.md)
10. MISSION-VERDICT.md (one terminal state + signature, below)

## 6. Terminal verdicts

READY (all stages PASS) | READY_WITH_WARNINGS (PASS except waived browser/quality findings, each named with owner) | NEEDS_OWNER_INPUT (conflicts or missing info the owner must resolve; listed, never guessed) | ACQUISITION_BLOCKED (sources unreachable/hostile; nothing fabricated to cover) | FAILED (any hard violation: unbound claim shipped, invented data, publish-gate breach, business contact, credential mishandling).

## 7. Who signs the verdict

The verdict is signed by the executor's verifiable evidence chain, not by an opinion. Minimum signers: (a) the stage-gate logs (machine-produced), (b) one independent reviewer lane or adversarial red-team pass that did not build the artifact (for FAILED/WARNINGS, mandatory), (c) for any INPUT CLASS C claim, a human authorization record. Until the A7 runner exists, the supervising agent countersigns single-run executions (see the A5-loop evaluation in DRY-RUN-REPORT.md).

## 8. What is explicitly NOT "real"

A mission that grades itself on vibes, screenshots without critique JSON, test counts without the failing-probe log, or "Nolan would like it" is not a verified experience. Missing evidence is not evidence of absence; it is a gap in the verdict.
