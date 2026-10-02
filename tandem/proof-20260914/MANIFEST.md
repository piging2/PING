# Production acceptance proof: artifact manifest (2026-09-14, run 20260914-201906)

Scope: one fresh traversal REAL EVENT -> OBSERVATION -> VALIDATION ->
VERIFICATION -> PING -> VERIFIED KNOWLEDGE -> BUSINESS AGENT -> DECISION ->
DURABLE ACTION INTENT -> AUTHORIZED EXECUTION -> OBSERVATION -> OUTCOME ->
NEW EVIDENCE -> PING. Auditor: use ONLY these artifacts. Do not consult
chat history, memory, or any file not listed here.

## 1. Real event + observation + validation
- ~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260914-201906-b-new-business-radar.job.json
  (job envelope: job_id, mission_id, initiator, objective)
- ~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260914-201906-b-new-business-radar.md
  (raw Meta AI answer; 10 numbered new-business claims; explicitly admits SOS
  filing dates and grand-opening dates were NOT verified)
- ~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260914-201906-b-new-business-radar.provenance.json
  (sidecar; transitions: researched -> validated -> verified -> accepted_by_ping)
- ~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl
  (run ledger; find run_id 20260914-201906-b-new-business-radar)
- ~/workspace/tandem/.pack-cache/b-new-business-radar-4c20e6fe02.md
  (context pack v4c20e6fe02 referenced by the run)

## 2. Verification
- ~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/verified-20260914-201906-b.md
  (per-claim web verification: 9 operating / 1 defunct via acquisition;
  newness contradicted for 7, unproven for 2, refuted for 1; 0 of 10 with a
  verified CO SOS formation date; dedupe check incl. Grand Valley Concrete
  LLC vs Grand Valley Concrete Polishing)
- Verification gate: ~/workspace/tandem/mark-verified.sh (existing machinery)

## 3. PING emissions (verify via gateway, Bearer <redacted> resolved at runtime)
- Event eed7671b3e6ba802c4dc7e431d9bd90c7a3d24003e99056f081689bfec51de1a
  (OBSERVATION_CREATED: radar verification outcome; observation bytes in
  ~/workspace/tandem/proof-20260914/observation-radar-201906.txt)
- Event 5e1ad638023ab1e35b851302a35437c0ba57f9222312d9934ea9183944bd62a4
  (OBSERVATION_CREATED: decision outcome as new evidence; bytes in
  ~/workspace/tandem/proof-20260914/observation-outcome-rd05.txt)
- Pre-existing accepted rule, retrieved live during the decision:
  event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7
  ("no pipeline add without a verified Colorado SOS formation date")
- Emission machinery: ~/workspace/tandem/emit-observation.py (existing)

## 4. Business agent decision (counterfactual executed, not hand-coded)
- ~/workspace/tandem/proof-20260914/candidates-verified.json (10 candidates + evidence states)
- ~/workspace/tandem/proof-20260914/decision-counterfactual.py (proof-scoped
  decision function; runs once with live PING retrieval, once with PING rows
  removed; asserts no PING leak in the without run)
- ~/workspace/tandem/proof-20260914/decision-counterfactual.json
  (decision RD-20260914-05: 8 NO_VALUE, 2 RESEARCH_MORE, PING_RELEVANCE=NONE)

## 5. Durable action intent + execution + outcome
- ~/workspace/tandem/routing-decisions.jsonl (find RD-20260914-05 and its
  decision_outcome record: governed no-add recorded; no pipeline mutation)
- ~/workspace/tandem/proof-20260914-baseline.sha256
  (canonical store digest BEFORE the decision)
- Canonical prospect store: ~/workspace/your_files/western-co-prospects.jsonl
  (305 rows; digest must equal baseline: 9c597fd91817d3e0e7c09dde99b5c815805d1f26ee33fc3f1c1f04bbcc52a3cf)
- ~/workspace/tandem/pipeline-jsonl-gaps.jsonl + ~/workspace/tandem/gap-population.log
  (gap count must be 181: 108 ACT / 31 WATCH / 42 RESEARCH_MORE)

## Deliberately NOT used (verify absence is justified, not an omission)
- No business graph exists anywhere in this proof (none was built).
- No new scheduler/cron was created (R7 tick coverage lives in the existing
  ping-pipeline-reconcile watchdog; untouched).
- ~/workspace/outreach/action-intent-ledger.py was NOT used: its CLI is scoped
  to instagram/facebook engagement passes; this proof's action was a
  records/governance action, and forcing it through the engagement ledger
  would be architecture misuse. Durable intent lives in the decision record.
- The 2 RESEARCH_MORE candidates were NOT added to the pipeline: the accepted
  rule forbids pipeline adds without a verified SOS date. They are noted in
  the decision record only, pending interactive CO SOS lookup (browser task).
- The stale duplicate prospect store (quarantined SUPERSEDED) was not read
  or used at any point in this proof.

## What the auditor must produce
1. Reconstruct every link of the 14-step chain from the artifacts above,
   citing the exact artifact and field/line that proves each link.
2. Attempt all 10 falsification verdicts, each as PASS (falsified: the proof
   is broken here, with evidence) or FAIL (withstands: evidence it holds):
   WRONG ENTITY, STALE EVIDENCE, BAD VERIFICATION, WRONG PING RETRIEVAL,
   BAD ROUTING, UNAUTHORIZED ACTION, DUPLICATE ACTION, UNKNOWN EXECUTION,
   WRONG OUTCOME, BROKEN LINEAGE.
3. One-line verdict: PROOF PASSES or PROOF FAILS, naming the smallest failing
   seam if any.
