# Q24 — ASK FYD / ASK PING REFUSAL (hostile test)
Audited: 2026-10-01 ~18:24 MDT
Audited worktree SHA: 2b5c95eef02f3c271c3c1966ec80df2f7e629876 (code reviewed here)
SERVED plane (where queries ran): /home/nolan/projects/ping-fyd-converged on Pig :3100 (next-server pid 46070, started Sep 30; build may differ from audited SHA — see caveat)
Note: this attacks Pigi's first-pass "PARTIAL" for Q24 with live hostile queries.

## Code path (audited SHA, read-only)

- Route: src/app/api/fyd/ask/route.ts → handleAskRequest (ask-pipeline.ts) → answerAskFyd (src/fyd/ask/visitor-answer.ts:551) → composeAskFyd (src/fyd/ask/answer.ts:68) → composeAnswer (src/lib/ping/ask-composer.ts:505).
- Refusal contract: deterministic template pipeline, no LLM. `noEvidenceAnswer` (ask-composer.ts:474): "I do not have evidence for that in the current context, so I will not guess." Refusal = partial answer with zero citations → route labels answerClass "UNSUPPORTED" / answerState "UNKNOWN", refusal: true (ask-pipeline.ts answerClassFor; visitor-answer.ts:676).
- Hours/emergency branch (ask-composer.ts:1150-1198 in audited SHA): no record → pushClaim("No emergency service is on record for X.", classification "INFERENCE") + noteUnknown("emergency"). Code comment: "emergency service with no record is an explicit UNKNOWN, never inferred from a general plumbing offering."

## Live hostile queries (read-only POSTs from the Pig, 2026-10-01 ~18:30 MDT)
Endpoint: POST http://127.0.0.1:3100/api/fyd/ask/happy-place (served :3100)
Site: happy-place (Happy Place Carpentry LLC, Adair Village OR; services: Repairs/Fencing/Painting/Drywall/Restoration)

### H1: "Do they provide 24/7 emergency service?"
- OBSERVED: answerClass "SUPPORTED DIRECTLY", answerState "KNOWN", refusal false.
- Answer text: "No hours are on record for Happy Place Carpentry LLC. [1]\n\nHappy Place Carpentry LLC does not offer emergency service: nothing in the site record mentions it. [1]"
- claims[]: {"claim": "Happy Place Carpentry LLC does not offer emergency service", "claimClass": "DERIVED", evidenceRefIds: [business object]}.
- Citation [1] claimClass: "SUPPORTED DIRECTLY" (the business object itself — it evidences nothing about emergency service).
- VERDICT: FAIL (narrow, real). The served text asserts a categorical negative — "does not offer emergency service" — derived from silence. The claims[] layer honestly labels it DERIVED, but the top-level answerClass/answerState reported to consumers is SUPPORTED DIRECTLY / KNOWN, and the visitor text states it as fact. Two compounding defects: (a) negative asserted from absence (the code comment promises "explicit UNKNOWN", noteUnknown("emergency") fires, yet the served sentence is a negation); (b) answerClassFor reduces from citation claimClass, so a DERIVED negation riding on a direct citation surfaces as SUPPORTED DIRECTLY at the top level. The strict epistemic rule ("if unsupported: say so; never fill") is bent here.

### H2: "Are they licensed in Utah?"
- OBSERVED: answerClass "UNSUPPORTED", answerState "UNKNOWN", refusal true.
- Answer: "I cannot answer that: nothing in the site record covers it, and I will not guess." + lists what was consulted.
- VERDICT: PASS.

### H3: "How many employees do they have?"
- OBSERVED: answerClass "UNSUPPORTED", answerState "UNKNOWN", refusal true.
- Answer: "The site data contains no person records for Happy Place Carpentry LLC, so I cannot answer that: there is no owner or staff information on record. I will not guess at names, roles, or personal details that are not on record."
- VERDICT: PASS.

### H4: "Are they the best plumber in Colorado?"
- OBSERVED: answerClass "UNSUPPORTED", answerState "UNKNOWN", refusal true.
- Answer: "I cannot answer that: nothing in the site record covers it, and I will not guess." (correctly refused a superlative about the wrong trade in the wrong state)
- VERDICT: PASS.

### Control: "What services do they offer?"
- OBSERVED: answerClass "SUPPORTED BY MULTIPLE EVIDENCE", KNOWN, refusal false, 5 citations to service objects sourced to the business website with lastChecked 2026-09-21. PASS (supported answer with evidence).

## Verdict

PROPOSITION: "When evidence does not establish the answer, Ask FYD says so instead of inventing."
STATUS: 4 of 5 PASS; H1 FAILS. The refusal machinery is real and deterministic (no LLM filler anywhere in the path). The failure is the emergency-service negative-from-silence: text states "does not offer", top-level classification hides the DERIVED label.
SMALLEST FIX IF FAIL: (1) in the no-record branch, render the honest sentence the code already composed ("No emergency service is on record for X") instead of the categorical negative; (2) make answerClassFor consider claim classifications, not only citation claimClass, so a DERIVED claim can never surface as top-level SUPPORTED DIRECTLY/KNOWN. Regression test: the four hostile questions against the fixed build.
CAVEAT: queries ran against the :3100 served build of ping-fyd-converged, not a build of the audited website SHA — the composer TEXT differs slightly between the two ("does not offer…" vs audited-SHA claim text "No emergency service is on record for…"), so the served build may predate a partial fix. The classification-reduction defect (b) is visible in the served response regardless.

## Evidence locations
- Transcripts: this file (full JSON bodies in the audit log below)
- ask-pipeline.ts.txt, visitor-answer.ts.txt, ask-answer.ts.txt in ~/workspace/gaps/swarm/product/worktree-audit/
- Full Q bodies: see q24-transcripts.json
