# Execution Audit and Hardening Pass — 2026-09-13

## What this was

A full execution audit and hardening pass across the deployed PING gateway and Orca orchestration routes, the Marketing OS and outreach machinery, and the Pig/Meta AI research seam. Target sequence: AUTHENTICATION → ACTION AUTHORIZATION → BOUNDED ORCHESTRATION → AUTHENTICATED WORKER IDENTITY → EVIDENCE/ARTIFACT PROVENANCE → RESEARCHED → VALIDATED → VERIFIED → ACCEPTED_BY_PING → MARKETING/TENANT OS.

Authority map held throughout: PING is the canonical knowledge authority. Orca is the execution substrate. The Pig is the machine/browser substrate. Muse orchestrates. Meta AI is a specialized research worker. The Marketing OS is the application layer, never another authority.

Constraints honored: no second database, scheduler, MCP, A2A, browser, or truth store. The existing `runs.jsonl` remains execution truth. The existing PING remains the canonical knowledge authority. The existing gateway/auth infrastructure remains the security boundary. Verification stays a human or authorized gate; there is no automatic promotion into PING. Chrome lease and the capability manifest stay deferred per the standing decisions.

## Phase 1 — Audits (read-only, all complete)

**Gateway authorization/boundedness/identity/provenance audit** (live container `ping-gateway`, image `phase4-eventauth7`). Found: the middleware attaches only `req.authenticatedAgent = { agentId, agentName }`; there is no level field, so L1/L2 are name-only at the middleware layer (live principals: `muse` = "Muse Level 1 (Observe)", `muse-level-2` = "Muse Level 2 (Workspace Write)"). All 11 `/orchestration/*` routes required a Bearer token after the earlier one-line fix, but any authenticated principal could still inject missions, dispatch, submit caller-selected worker outputs, mutate quality/confidence, and run an unbounded synchronous loop. `maxIterations` had no server ceiling. `workerId` came verbatim from the request body into output collection and reputation mutation (two call sites). Artifacts carried mission id, timestamp, content hash, and a caller-claimed worker id, but no run id, no action label, no verified actor, and no chain back to execution.

**Pig/Meta rotation and knowledge-state audit.** Found the crash bug: `meta-pass.sh` never reads or writes `rotation.txt`, and a worker death between a successful run and the scheduler's rotation advance repeats the same slug. Knowledge states: RESEARCHED and VALIDATED were derivable from existing ledger fields, but nothing wrote VERIFIED or ACCEPTED_BY_PING, and sidecars carried stale `verification: pending` / `ping_ingestion: pending` fields.

**Marketing OS closed-loop audit.** Found: the loop SIGNAL → RESEARCH → CANDIDATE → VALIDATE → VERIFY → PROSPECT → OUTREACH → RESPONSE → FOLLOW-UP → CONVERSION → EVIDENCE → PING existed in prose and files, but RESPONSE was prose-only (the one real decline, "No interest." from Roaring Fork Landscapes on 2026-09-10, was not in the JSONL), there was no mandatory pre-send reconciliation, no structured run lifecycle, no route for generalizable learnings into PING, and CONVERSION had no home.

## Phase 2 — Gateway hardening (deployed live)

Built `curious-squid-gateway:phase4-eventauth8` FROM the live `phase4-eventauth7` image, copying only the three changed files (never from the dirty worktree). Swapped by cloning the live container's config; the old container is preserved as `ping-gateway-prev` for instant rollback. All three files pass `node --check`; 79 pre-deploy unit tests passed.

1. **Action authorization** (`gateway/routes/orchestration.js`). Inline `requireLevel2` guard: all six POST routes require `agentId === 'muse-level-2'`, everything else fails closed with 403. All five GET routes stay open to any authenticated agent. This is a two-principal allowlist, not roles; any future credential defaults to read-only. Stated plainly in a code comment.
2. **Bounded orchestration** (`ping-runtime/orchestration/execution/engine.js`). `startAutonomousLoop` now clamps caller input to 1..25 server-side (`MAX_LOOP_ITERATIONS = 25`; non-finite input defaults to 5), is async, and yields to the event loop each iteration. The route awaits it.
3. **Authenticated worker identity** (`engine.js`, `orchestration.js`). `collectWorkerOutput` rejects empty or unregistered worker ids via the existing registry lookup (null → 404). The authenticated principal is threaded from the route and stamped as `submittedBy` on every output record; `workerId` itself is never trusted from the body for identity.
4. **Reputation integrity** (`engine.js`). Both caller-derived reputation call sites removed. Reputation now derives only from engine-observed evidence: mission quality from observed consensus acceptance (1/0), plus the existing `recordAcceptance`/`recordFailure`. Self-reported confidence no longer enters the registry anywhere.
5. **Artifact provenance** (`artifact_store.js`, `engine.js`). Every stored artifact now carries `runId`, `action` (dispatch/collect/resolve), `actor` (the authenticated agent id), and `prevHash` chaining to the previous artifact for the same mission. The stored hash covers the final record, and same-id/different-content is refused instead of silently overwritten.

Live smoke tests on the deployed container: no-credential GET/POST → 401; L1 GET → 200; L1 POST `/missions` and `/engine/loop` → 403; L2 POST `/missions` → 201; forged worker id → 404; `maxIterations: 1000000` → clamped (1e9, 3, and 25 all complete in tens of ms; an unclamped million-iteration run could not). Gateway healthy: Postgres-backed auth, EventBridge polling clean, zero route errors.

## Phase 2 — Research seam (rotation + knowledge states)

**Rotation fix** (scheduler doc `meta-ai-intel-pass__interval@6h.md`). The next slug is now a pure function of the run ledger: newest line with `outcome == "ok"` and a cycle `brief_id`, successor in a→b→c→d→a. Non-ok runs never advance; test slugs are ignored; `rotation.txt` is demoted to an optional bootstrap cache. Verified live: the derivation returns `b-new-business-radar` (the one ok run was `a-weak-website-hunt`).

**Knowledge states** (sidecar `transitions` arrays; `runs.jsonl` untouched, still 8 lines, append-only):
- `meta-pass.sh` now records `researched` (on ok) and `validated` (when the validator passes) via an append-only, deduped, atomic `record_transition` that can never fail a run.
- `tandem/mark-verified.sh` (new): the human VERIFIED gate. Refuses unless the sidecar holds a captured answer, requires `--by`, idempotent. Nothing calls it automatically.
- `tandem/emit-observation.py`: records `accepted_by_ping` with the real gateway `event_id` on the success path only, and now **fail-closes before any POST** unless the newest ok run's sidecar carries a `verified` transition (`_require_verified`, exit 2). The outreach engine doc (step 4e) now requires `mark-verified.sh --by "outreach-engine round-N"` after web-search verification and before emission. The event body now posts `verification_status: "verified"` instead of the stale `"unverified"`.
- Backfill: the one historical ok run (`20260913-191216-a-weak-website-hunt`) got `researched`+`validated` at its original timestamp, `verified` via the new script (`--by "outreach-engine round-43"`, the round that genuinely verified 12/12 businesses), and `ping_ingestion: skipped` with the note that nothing was emitted per the boundary rule. No `accepted_by_ping`, because nothing was emitted.

## Phase 3 — Adversarial live tests (all PASS)

Against the live `eventauth8` container and real local data: L1 POST on all six POST routes → 403; L1 GET on all five GET routes → 200; `maxIterations` of 1e9, -5, 0, "abc", 7.9 → all complete fast with ≤25 iterations proven behaviorally and 25 exact in code, and a concurrent GET stays responsive mid-loop; forged worker id → 404, empty → 400, L1 attempt → 403 before worker validation; confidence 999 and -50 submissions leave zero trace in the registry (`qualityHistory` holds only binary consensus values); a full L2 mission flow produced four artifacts each carrying `runId`, `action`, `actor='muse-level-2'`, and a verified `prevHash` chain; identical resubmits are idempotent. Rotation crash replay on temp ledger copies: fake `capture_failed` and non-cycle slugs never advance; a fake ok `b-new-business-radar` correctly yields `c-review-complaint-signals`. Emission gate: importing the module performs no network activity; `_require_verified` passes for the verified run and refuses exit-2 otherwise. Contract tests: all pass (27 checks, then 26 after extension, plus 9 new ledger checks).

## Phase 4 — Marketing OS closed loop

Every transition is now observable in JSONL fields and derivable per-sweep from one structured ledger line, with no new store:

- **RESPONSE**: Roaring Fork Landscapes had no JSONL row at all, so it was added as row 301 from prose-log facts (hard decline 2026-09-10, SUPPRESS, never invented fields). 300 active rows remain under the quality cap. Standing rule: every sweep must project replies/declines/bounces into `suppression_state` + `next_eligible_action` + `last_signal` in the same run; prose-only outcomes are not allowed. Suppression vocabulary normalized to 8 canonical values (203 empties and inconsistent values migrated with a documented mapping).
- **OUTREACH**: mandatory pre-send reconciliation against Gmail's actual sent mail, the JSONL row, and the sweep's sent-log; any source saying sent means skip. New guard script `outreach/pre-send-check.py` (tested: the declined row → DO NOT SEND; a clear row → pass).
- **Run lifecycle**: new `outreach/append-sweep-run.py` appends one structured line per sweep to the **same** `runs.jsonl` with `origin: "outreach-engine"` (never `brief_id`, so the rotation jq and the emission resolver are provably unaffected). All 16 loop-stage counts are always present, so every transition is derivable without prose parsing.
- **EVIDENCE → PING**: documented LEARN procedure: 0–3 generalizable observations per sweep (never prospect rows, never unverified) → `learn-<sweep-id>.md` + sidecar → `mark-verified.sh` → `emit-observation.py`. The prospect row itself never goes to PING.
- **CONVERSION**: schema now 33 fields (`conversion_state`, `converted_at`, `conversion_evidence`); only a real reply/meeting/customer event with linked evidence may set them; no automation may invent a conversion.
- A full paper walk of one prospect through all twelve stages confirmed each transition is observable, resumable, evidence-linked, and owned by the right authority.

## Deployment lineage and rollback

`phase4-eventauth6` → `phase4-eventauth7` (authentication on the orchestration mount) → `phase4-eventauth8` (this pass). Live container: `ping-gateway`. Rollback: stop `ping-gateway`, rename `ping-gateway-prev` (intact `eventauth7`) back, start it. The `eventauth8` image manifest is `sha256:38e4aae0166e8628f326029b5c1c3a3cc6dbbcf2f42091bcfc7eb31629fe2a60`.

## Caveats and open items

1. **Security incident, needs your call.** During pre-deploy diagnostics, a worker ran a bare `docker inspect` on the live container, which printed both gateway bearer keys into tool output. The values are not reproduced here or in any file. Nothing was written to disk. I did not rotate the keys because credential changes need your explicit word. Recommendation: coordinated rotation of both keys when you say so; every runtime consumer reads them from the container env, so rotation is a restart, not a code change.
2. **Verification granularity.** The implemented layer is per-answer-file verified transitions. True per-observation verification (source spans, per-claim confidence, preserved contradictions) remains future work; the current gate is coarse by design and the report states its limit.
3. **Loop bound precision.** ≤25 iterations is proven behaviorally on the live gateway; the exact 25 is proven in code. Live loop results were empty because no registered workers are eligible for the currently compiled missions (pre-existing environment condition, not a hardening defect).
4. **Test residue.** The adversarial tests created several Orca missions and artifacts and added registry entries. Blast radius is confined to Orca: no PING events, no Postgres writes, no canonical pipeline touched.
5. **Deferred, unchanged.** Chrome lease and the capability manifest stay exactly as decided: deferred until a second Chrome-touching worker exists, and a tested discovery projection until a second consumer or real drift incident.

## Files changed or created

Gateway (inside image `phase4-eventauth8`): `gateway/routes/orchestration.js`, `ping-runtime/orchestration/execution/engine.js`, `ping-runtime/orchestration/execution/artifact_store.js`.
Seam: `pig-fb/meta-pass.sh`, `tandem/mark-verified.sh` (new), `tandem/emit-observation.py`, `goals/ping-social-outreach-campaign/crons/hourly/meta-ai-intel-pass__interval@6h.md`, the backfilled sidecar for `20260913-191216-a-weak-website-hunt`.
Marketing OS: `your_files/western-co-prospects.jsonl` (301 rows), `outreach/prospect-schema.json`, `outreach/prospect-source-of-truth.md`, `your_files/prospect-digest.md`, `your_files/ping-social-operations-manual.md`, `goals/ping-social-outreach-campaign/crons/hourly/ping-social-outreach-engine__interval@3h.md`, `outreach/pre-send-check.py` (new), `outreach/append-sweep-run.py` (new), `pig-fb/test-capabilities.py` (9 new checks).
Reports: `your_files/adversarial-seam-audit-2026-09-13.md`, `your_files/orchestration-auth-trace-2026-09-13.md`, this file.
