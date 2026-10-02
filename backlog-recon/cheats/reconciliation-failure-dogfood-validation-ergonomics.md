- **ID:** reconciliation-precedence-frozen
  **DOMAIN:** RECONCILIATION **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** The send-eligibility gate settles eligibility on a fail-closed precedence ladder: (1) canonical structured state, (2) explicit suppression, (3) verified communication history, (4) derived projection, (5) notes/free text advisory only. Any disagreement between the two canonical sources is itself a fail-closed discrepancy. Do not keep redesigning it; future work extends it (Messenger DM path, meta-ai-intel ingest) rather than replacing it.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-030 follow-up (2026-09-21): `~/workspace/outreach/send-eligibility.py` + `test-send-eligibility.py` 17/17 pass; exit codes 0 ELIGIBLE / 1 INELIGIBLE / 2 DISCREPANCY / 3 ERROR.
  **DEPENDENCIES:** per-recipient Gmail `in:sent to:<addr>` verification (mandatory); JSONL + pipeline.md as the two canonical sources.
  **ACCEPTANCE:** `send-eligibility.py` runs in the engine cron before every outbound action (email wired 2026-09-21; Messenger/meta-ai-ingest still pending, tracked as RECON-EXTEND).
  **NEXT FALSIFICATION:** dry-run the checker against a known-completed-ladder recipient; it must exit 2 (DISCREPANCY), not 0.

- **ID:** suppression-not-deletion
  **DOMAIN:** RECONCILIATION **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** Suppression is a hard block recorded in structured state, never a delete. Canyon Creek Electric and Lico's Electric remain SUPPRESSED after the round-105 ladder violation: "no further touches ever," rows retained in JSONL and pipeline.md with errata appended.
  **EVIDENCE:** `~/workspace/outreach/eligibility-reconciliations.md` (2026-09-22, DISC-20260922133428-1d79eb and DISC-20260922133527-b74d5e); FL-20260921-030 (2026-09-21).
  **DEPENDENCIES:** canonical structured state writable by the engine; trash-not-rm for stale drafts.
  **ACCEPTANCE:** `grep` the canonical JSONL for both businesses: rows present, suppression_state shows the ladder-violation suppression, zero sends after 2026-09-21 02:21 MDT.
  **NEXT FALSIFICATION:** any future touch to a SUPPRESSED row re-opens FL-20260921-030-class incident; the gate must have blocked it first.

- **ID:** reconciliation-state-hash-binding
  **DOMAIN:** RECONCILIATION **STATUS:** OPEN **PRIORITY:** 2
  **WHY:** A reconciliation covers a discrepancy only while the structured state hash is unchanged. If the state moves under a reconciliation, the disposition is stale. This binding exists as an assertion in the FL-20260921-030 follow-up but needs mechanical enforcement in the checker (compare state_hash at reconcile time vs at discrepancy emission).
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-030 follow-up (2026-09-21): "reconciliation covers a discrepancy only while the structured state hash is unchanged"; `eligibility-discrepancies.jsonl` carries `state_hash` per record.
  **DEPENDENCIES:** reconciliation-precedence-frozen.
  **ACCEPTANCE:** checker refuses to mark a discrepancy reconciled when the current state_hash differs from the discrepancy's state_hash; covered by a fixture test.
  **NEXT FALSIFICATION:** craft a fixture where structured state changes between discrepancy emission and reconciliation; a reconciled verdict must fail.

- **ID:** discrepancy-reopen-on-contradiction
  **DOMAIN:** RECONCILIATION **STATUS:** OPEN **PRIORITY:** 2
  **WHY:** Reopen on evidence/source/disposition contradiction: notes suggesting outreach while structured state blocks (or asserting completion while structured looks eligible) must emit a fresh DISCREPANCY record rather than being folded into the old one. 10 reconciliations are recorded; the rule needs a standing test that a contradicted disposition re-opens.
  **EVIDENCE:** `~/workspace/outreach/eligibility-reconciliations.md` (10 rows, 2026-09-21/22); FL-20260921-030 follow-up test cases (a) and (c) cover stale-note contradictions.
  **DEPENDENCIES:** send-eligibility.py discrepancy emission path.
  **ACCEPTANCE:** a fixture where a note asserts "ladder complete" while Gmail shows 1 touch emits a new DISCREPANCY row (not a silent pass, not a send).
  **NEXT FALSIFICATION:** re-run the checker against B & B Plumbing & Heating's stale leads.md DRAFTED notes; verify a discrepancy row, not a send.

- **ID:** row-count-attestation-gap
  **DOMAIN:** RECONCILIATION **STATUS:** OPEN **PRIORITY:** 2
  **WHY:** The writer rewrote the canonical JSONL twice on 2026-09-22 (07:12/07:14 UTC) with a 16-row delta (318 -> 302) and no row-level backup; attribution is impossible. Closure disposition + independent ingestion evidence cannot be claimed while row-count changes are unaccounted.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260922-001 OBSERVATION (2026-09-22 ~02:00 MDT): "Cause of the 16-row delta is UNKNOWN... Not claimed as deletion."
  **DEPENDENCIES:** outreach engine owns the writer; engine must reconcile row counts.
  **ACCEPTANCE:** engine run emits a row-count reconciliation (before/after count + per-row diff against a snapshot backup) on every rewrite.
  **NEXT FALSIFICATION:** diff the next engine rewrite against its pre-write snapshot; any unexplained delta re-opens this item.

## FAILURE-LEDGER-DERIVED (runtime defects / deployment lessons; all DONE_VERIFIED = lesson recorded)

- **ID:** bridge-outage-fingerprint
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** Pig bridge outage signature: egress proxy TCP reachable but CONNECT to 100.79.154.43:22 aborts (`nc: proxy read: Broken pipe`). Distinct from Pig death, commute blackout, and profile poisoning. Bounded retries with backoff, then stop hammering; lane work parks with a resume script.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-072 (2026-09-21, RECOVERED; authoritative window 15:53-16:12 MDT); FL-20260921-007 (2026-09-21, transient bridge failures during 7B push/test).
  **DEPENDENCIES:** pigwsl-run.sh bridge; pig health heartbeat.
  **ACCEPTANCE:** documented fingerprint + `transfer-remaining.sh` resume pattern; recorded in AGENTS.md Pig bridge lessons.
  **NEXT FALSIFICATION:** next bridge outage is classified within 2 probes as proxy-CONNECT-abort vs Pig-down vs blackout; misclassification re-opens.

- **ID:** argv-probe-misattribution
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** emit-observation.py probed `WHERE event_id='fetch'` because the JS bound `process.argv[2]` (literal 'fetch') instead of `process.argv[3]` (the event_id). Five rounds of "canonical-byte fetch failed" were misattributed to Pig unreachability. Lesson: probe bugs produce infrastructure-shaped symptoms; verify the probe reads what it claims before blaming the transport. Fixed one-char change, verified live 2/2; 37 sidecar IDs batch-checked: 30 FOUND durable, 7 MISSING (pre-epoch Sep 13-14, convergence artifact, separate item).
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-111 (2026-09-21, HEALED).
  **DEPENDENCIES:** tandem ingest path.
  **ACCEPTANCE:** fix in place; batch verification recorded in `meta-ai-verification-round111.jsonl`.
  **NEXT FALSIFICATION:** any future multi-round "infrastructure" failure must include a probe-self-check before the third round; failure to do so re-opens.

- **ID:** stale-prose-instruction-regression
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** Deprecated `suppression_state` value `in-follow-up-ladder` (FL-20260919-008, HEALED 2026-09-19 with 0 contamination) was reintroduced on 4 JSONL rows because a stale queue file (written 2026-09-17, pre-migration vocabulary) carried the on-acceptance instruction and was executed verbatim on 2026-09-20. Lesson: queue/prose instructions are live writers even after a vocabulary migration; migration must cover instruction templates AND historical-but-re-runnable files. Historical queue files kept as record (not drift); the one-shot merge script `jsonl-merge-round31.py:114` annotated DEPRECATED so it cannot be reused silently.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260922-001 (2026-09-22, HEALED; residuals (a)/(b) row-count observation still OPEN for the engine).
  **DEPENDENCIES:** prospect-source-of-truth.md canonical vocabulary; pre-send-check.py `ladder\b` regex branch.
  **ACCEPTANCE:** 302 rows scanned, 0 stale values; residuals (a)/(b) owned by the engine.
  **NEXT FALSIFICATION:** the perfecting pass's vocabulary scan runs every sweep; any non-zero contamination re-opens.

- **ID:** self-heal-rule-violation-logged
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 2
  **WHY:** The perfecting pass hit a malformed shell command (exit 2, bash unexpected-EOF), recovered inline, and narrated it without writing the ledger entry — violating its own "ledger entry first, narration second" rule. Retroactive entry created as the reference case. Lesson: the recorder is inside the blast radius; the rule must survive the failure it governs.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260922-002 (2026-09-22, LOGGED).
  **DEPENDENCIES:** ping-perfecting-pass cron body (rule 2b stands).
  **ACCEPTANCE:** retroactive entry exists with evidence quote; future pass reports checked for a ledger entry per self-heal step.
  **NEXT FALSIFICATION:** next pass that recovers inline without an entry re-opens as a repeat violation.

- **ID:** ladder-violation-structural-fix
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** Duplicate 4th-touch emails to Canyon Creek Electric and Lico's Electric (round-105) after completed ladders — caused by trusting stale leads.md notes over verified per-recipient Gmail history and treating a contradictory empty Gmail result as a green light. Fix was structural, not prose: deterministic `send-eligibility.py` gate wired before every Gmail send; per-recipient `in:sent to:<addr>` mandatory; empty/contradictory result = hard stop. Lesson: no-repeat-external-action without current-state check; worker claim != accepted deliverable.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-030 (2026-09-21, incident OPEN pending draft-trashing/learnings; structural fix DONE).
  **DEPENDENCIES:** send-batch.py gate wiring; cron body steps 5-6.
  **ACCEPTANCE:** 17/17 checker tests pass; Messenger DM path + meta-ai-ingest extension still pending (RECON-EXTEND, OPEN).
  **NEXT FALSIFICATION:** any send that bypasses the gate (e.g., a Messenger DM on a completed ladder) re-opens the class.

- **ID:** nohup-session-lifetime-invariant
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 2
  **WHY:** A gateway launched with `nohup ... &` via the bridge died at the next bridge call with no crash: WSL session teardown kills the process group; nohup only guards SIGHUP. Invariant: always `setsid`-detach Pig background services launched via the bridge.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-226 (2026-09-21, CLOSED); reused in FL-20260921-228 (dev server restart).
  **DEPENDENCIES:** pigwsl-run.sh bridge semantics.
  **ACCEPTANCE:** invariant stated in the entry; verified persistent across later bridge calls.
  **NEXT FALSIFICATION:** next bridge-launched daemon found dead-without-crash re-opens; check for setsid absence.

- **ID:** premature-certification-epistemic
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** `oracle-deployment-84486f056-certification.md` declared ORACLE_RUNTIME_PROVEN: YES with 14 certification gaps still open (no live collision proof, no fanout proof, unassessed CVEs, no distribution manifest/digest, overstated document). The failure was epistemic, not operational: downstream promotion decisions could have rested on uncertified claims. Self-heal corrected the document in place (PREMATURE/SUPERSEDED, preserved not deleted) per the release doctrine snapshot->closure->smoke->build->swap->runtime-proof. Lesson: certification is void until re-proven; never delete the voided document.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260920-023 (2026-09-20, OPEN pending gap closure + new dated certification).
  **DEPENDENCIES:** release doctrine; gap-closing lanes.
  **ACCEPTANCE:** new dated certification document issued only after all 14 gaps close.
  **NEXT FALSIFICATION:** any promotion-grade claim resting on a certification with open gaps re-opens as the same class.

- **ID:** unauthenticated-tenant-crud
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** A read-only audit probe `POST /tenants {"tenant_id":"probe"}` (no auth) returned HTTP 200 and created a row in tenant_registry — both a security defect (SEC-001: /tenants CRUD mounted without auth middleware; SEC-002: /mc BI surfaces also public) and a process lesson (read-only audits must probe auth with GET-first or scratch surfaces; accidental writes disclosed in artifact AND ledgered by the parent). Probe row surgically deleted; defect owned by convergence lane.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260919-AUDIT-001 (2026-09-19, OPEN); `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-001/SEC-002, TEN-002 (dual registries disconnected).
  **DEPENDENCIES:** convergence lane auth model decision (grill candidate G4 interacts with TEN-001).
  **ACCEPTANCE:** unauthenticated POST /tenants no longer 200s; read-only-audit probe discipline documented.
  **NEXT FALSIFICATION:** any future read-only lane writing a live row re-opens the process defect independently of the security fix.

- **ID:** image-baked-event-registry-gap
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 2
  **WHY:** POST of `FYD_SITE_OVERLAY` to the 8080 gateway returned "Unknown event_type": the validator only accepts types in the image-baked `event_registry.json` (233 types), and the repo's generator (the sanctioned source of truth) had never registered the type. Per Nolan's directive, FYD used the repo generator + its own demo gateway (233->234 types, proof COMPLETE 2026-09-21 ~13:45) rather than turning into gateway debugging. 8080 registration requires an image rebuild: explicit backlog item. Lesson: the registry is a contract surface with an owner; crossing lanes needs the owner's explicit decision.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-231 (2026-09-21, CLOSED for demo path; 8080 registration pending as explicit backlog item).
  **DEPENDENCIES:** deployment lane (8080 image rebuild).
  **ACCEPTANCE:** demo-gateway emit accepted (event_id 39fc9971...); Happy Place page renders the new service with zero React edits; Coppersmith unchanged.
  **NEXT FALSIFICATION:** if the 8080 image is rebuilt without re-registering, any FYD overlay emit to 8080 must still fail closed with the unknown-type error, not silently drop.

- **ID:** stale-anchor-edit-class
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 3
  **WHY:** Six consecutive anchor mismatches (FL-20260921-ASK1 through ASK6) from editing against stale reads/post-compaction files. Lesson: re-read the anchor immediately before the edit; never trust a pre-compaction draft's line/anchor memory. Process fix, all closed.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-ASK1..ASK6 (2026-09-21, all CLOSED).
  **DEPENDENCIES:** chunked Pig transfer path (md5-verified).
  **ACCEPTANCE:** edit scripts assert anchor presence and fail before writing.
  **NEXT FALSIFICATION:** an edit landing on a stale anchor after a compaction boundary re-opens.

- **ID:** shadow-copy-patch-mislocation
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 2
  **WHY:** Two shadow-tree injuries in one day: (1) custody patch applied to a Pig-side /tmp copy, not the local file (FL-20260921-018); (2) stale Pig file copy caused a phantom verification failure (FL-20260921-219). Both are the ERGO-002 shadow-tree condition made concrete: when two live copies exist, the agent edits the wrong one and the proof lies. Lesson: one canonical copy; every other copy is a labeled derivative; verify provenance before trusting a read.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-018, FL-20260921-219 (2026-09-21, both CLOSED).
  **DEPENDENCIES:** ERGO-002 resolution direction (canonical tree).
  **ACCEPTANCE:** both recovered; feeds ergo-shadow-tree-canonical item.
  **NEXT FALSIFICATION:** any future "verification passed on the wrong copy" incident re-opens with severity raised.

- **ID:** event-durability-and-collision-fixes
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** Two P0 runtime defects, both fail-open: (1) `UnifiedEventRuntime.emit()` returned `{status:'ok'}` with a null pool — ACK without durability (FL-20260920-012); (2) `ON CONFLICT (event_id) DO NOTHING` treated same-ID-different-semantics as a harmless duplicate while handlers received the unpersisted payload (FL-20260920-013). Fixes: fail closed before dispatch when no pool; on conflict, fetch existing payload and compare canonical JSON, erroring on semantic difference. Lesson: an 'ok' that wasn't observed is a lie; duplicates are only duplicates when semantics match.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260920-012, FL-20260920-013 (2026-09-20, FIXED in commit ccfef91f3).
  **DEPENDENCIES:** canonicalization authority for the collision comparison.
  **ACCEPTANCE:** syntax + inspection verified; replay via `git show ccfef91f3`.
  **NEXT FALSIFICATION:** FL-20260920-023's gap (1)-(5) — no live same-ID-different-semantics proof on Oracle — keeps this as PROVE, not closed.

- **ID:** hostile-url-href-sink
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** OPEN **PRIORITY:** 1
  **WHY:** The FYD renderer neutralizes hostile HTML text (React escaping) but rendered `javascript:alert(1)` verbatim into `href` attributes for fields.website/socials. React warns; it does not block. Lesson: text-escaping is not URL-sanitizing; href sinks need an explicit scheme allowlist.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-032 (2026-09-21, OPEN, hostile-content probe).
  **DEPENDENCIES:** renderer href interpolation sites.
  **ACCEPTANCE:** hostile probe re-run: no `javascript:` (or other non-allowlisted scheme) in any rendered href; allowlist documented.
  **NEXT FALSIFICATION:** re-run the step5 hostile probe; any `javascript:` href re-opens.

- **ID:** pg-bigint-string-normalizer
  **DOMAIN:** FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 3
  **WHY:** node-postgres returns BIGINT as string; `typeof v === "number"` checks fell through to null, degrading the follow-attestation sequence evidence (715 -> null) and inexacting the projector-ordering mirror. Fix: `asSequence()` normalizer in readers.ts + attestation gate. Lesson: driver type contracts are part of the evidence contract.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-227 (2026-09-21, CLOSED, sequences 747/748/749 verified flowing).
  **DEPENDENCIES:** none.
  **ACCEPTANCE:** attestation responses carry numeric sequence matching the journal row.
  **NEXT FALSIFICATION:** any future `sequence: null` on a row with a journal sequence re-opens.

## EXTERNAL USER VALIDATION (real domain; currently empty — that is the finding)

- **ID:** first-external-owner
  **DOMAIN:** EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 1
  **WHY:** No external business owner has used FYD. The nearest candidate is the pending in-person conversation with Monument View Coffee Shop owners (Grand Junction/Redlands); a meeting-ready research brief was built 2026-09-09 but the conversation has not happened. Architecture does not substitute for this.
  **EVIDENCE:** `memory/2026-09-09.md#L64, L77, L79` (research brief completed and shared via muse.ai URL; shop's tech footprint: self-hosted WordPress brochure site, no online ordering/booking, POS unknown).
  **DEPENDENCIES:** Nolan's schedule (weekday evenings/weekends); owner willingness.
  **ACCEPTANCE:** one external owner identified by name/business with a scheduled FYD conversation.
  **NEXT FALSIFICATION:** if the Monument View conversation happens and the owners decline, this item updates with the reason; it does not close.

- **ID:** first-owner-url-submission
  **DOMAIN:** EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 1
  **WHY:** The core product loop begins when an owner (not the team) submits a URL. No owner-submitted URL exists; all acquisitions so far are team-authorized demo tenants (Happy Place, Coppersmith).
  **EVIDENCE:** memory 2026-09-22 (FYD backends stay at two until Nolan can personally use both end-to-end); `MEMORY.md` harvest directive (2026-09-22): authorized demo businesses/sources only.
  **DEPENDENCIES:** first-external-owner.
  **ACCEPTANCE:** a URL submitted by an external owner, ingested through the acquisition path, with provenance (source URL + observed_at + digest).
  **NEXT FALSIFICATION:** an owner-submitted URL that the proceduralizer cannot ingest re-opens as the first real acquisition defect.

- **ID:** what-fyd-got-wrong-first-owner
  **DOMAIN:** EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 1
  **WHY:** The honest-failure inventory for a real business is empty. Demo evidence of the correction machinery exists (Ask FYD refusal + evidence classes fixed 2026-09-21; propose->approve owner loop proven on the demo gateway), but nothing has been proven wrong by an owner yet.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-232 (CLOSED: fallback made reachable, classificationFromProvenance wired, 36/36 + 13/13 tests); FL-20260921-212 failure 2 (immediate-apply semantics rebuilt as propose->approve before completion claim).
  **DEPENDENCIES:** first-owner-url-submission.
  **ACCEPTANCE:** first owner correction recorded as a typed proposal, approved, applied, and verified across generated site, Circle, Ask FYD, and search projection (the 2026-09-21 product proof target).
  **NEXT FALSIFICATION:** an owner correction that applies to the page but not to Ask FYD (divergent truth) is a stop-and-fix projection/authority failure per the 2026-09-21 product proof additions.

- **ID:** time-to-usable-presence
  **DOMAIN:** EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 2
  **WHY:** No baseline exists for URL -> usable presence latency. The five must-win metrics (mobile UX, contact discoverability, service discoverability, performance, trust/correctability) were reaffirmed 2026-09-21 but none are instrumented.
  **EVIDENCE:** memory 2026-09-21#L1462 (five must-win metrics); memory 2026-09-21#L1033 (performance mobile/contact/services/trust "measure before fixing the first broken customer experience" — no completion evidence in that slice).
  **DEPENDENCIES:** instrumentation of the acquisition->proceduralization->SiteSpec->render path.
  **ACCEPTANCE:** measured minutes/hours from owner URL submission to a usable presence for the first external owner, with per-stage timings.
  **NEXT FALSIFICATION:** if the first owner waits longer than one sitting (no same-session usable presence), the acquisition path is the bottleneck, not the renderer.

- **ID:** owner-correction-taxonomy
  **DOMAIN:** EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 3
  **WHY:** Customization requests from a real owner will define the product surface; currently only Nolan's directives exist (structured patches only: add/remove/move section, change variant/binding, feature object, change token/owner copy — 2026-09-22 FYD architecture invariants). The taxonomy must be grown from owner behavior, not invented.
  **EVIDENCE:** `MEMORY.md` FYD architecture invariants (2026-09-22, Nolan): structured patches only, no arbitrary filesystem mutations; owner approval = strong binding (tenant+actor+base digest+patch digest+approval+result digest).
  **DEPENDENCIES:** first-external-owner.
  **ACCEPTANCE:** the first 10 real owner requests classified; any request falling outside the structured-patch set is recorded as a taxonomy gap, not shoehorned.
  **NEXT FALSIFICATION:** an owner request that cannot be expressed as a structured patch and is implemented anyway via arbitrary mutation re-opens the invariant.

- **ID:** ask-fyd-usefulness-external
  **DOMAIN:** EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 2
  **WHY:** Ask FYD is evidence-bounded and refusal-capable in demo (FL-20260921-232), but no external visitor has ever asked it anything. Usefulness = real visitor questions answered from evidence, with unknowns honestly labeled.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-232 (CLOSED 2026-09-21 ~13:38); memory 2026-09-21#L1492 (Ask FYD must be broad evidence-bounded Q&A; first test "What services does this business offer, and how do you know?").
  **DEPENDENCIES:** first-owner-url-submission; visitor traffic.
  **ACCEPTANCE:** 20 real visitor questions logged with evidence-class coverage and refusal rate; zero plausible-filler answers.
  **NEXT FALSIFICATION:** a single confident answer with no evidence basis (the blood-type failure shape) re-opens as a contract violation.

- **ID:** return-usage-and-sharing
  **DOMAIN:** EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 3
  **WHY:** Return usage and willingness to keep/use/share are the only metrics that validate the product. Dogfood metrics (rendered pages, passing probes) measure the engine, not the market. Nothing is instrumented yet.
  **EVIDENCE:** none exists — that is the finding. Contrast with dogfood evidence below.
  **DEPENDENCIES:** first-external-owner; privacy-honest telemetry (owner controls visibility PUBLIC/HIDDEN/FOLLOWERS/PING_ONLY, memory 2026-09-21#L1425).
  **ACCEPTANCE:** owner returns unprompted within 30 days; owner shares the presence URL or Circle with at least one third party.
  **NEXT FALSIFICATION:** an owner who never returns after onboarding falsifies "the presence is useful"; investigate, do not re-market.

## DOGFOOD (engine breadth — NOT external validation)

- **ID:** dogfood-happy-place-coppersmith
  **DOMAIN:** DOGFOOD **STATUS:** IN_PROGRESS **PRIORITY:** 1
  **WHY:** Two real businesses run through acquisition -> object graph -> SiteSpec: Happy Place (15 direct facts, 2 objects, 1 relationship, SiteSpec digest bc4148b9...), Coppersmith (38 facts, 4 objects, 3 relationships, digest 473c9d97...). Both served 200 through the private Tailscale path on port 3100; logo ingestion independently verified with rights/provenance; webp derivatives on disk. Proves engine breadth across two meaningfully different business profiles.
  **EVIDENCE:** memory 2026-09-21#L711, L1009, L1148; happyplacecarpentry.com redirects to Google sign-in (junk-source hazard documented in FL-20260921-216).
  **DEPENDENCIES:** demo gateways; FYD media pipeline (download+digest+derivative, hotlink fallback only).
  **ACCEPTANCE:** both businesses render page + Circle + Ask FYD from the same canonical graph (one-read-model invariant); two-site structural-difference standard met (planner differences, not just string swaps).
  **NEXT FALSIFICATION:** if the two SiteSpecs are structurally identical despite materially different graphs, the site planner is too generic (memory 2026-09-21#L653) — fix the planner generically.

- **ID:** dogfood-not-customer-validation
  **DOMAIN:** DOGFOOD **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** Standing boundary: dogfood validates engine breadth; it is not equivalent to external customer validation. Nolan froze "FYD backends stay at two until Nolan can personally use both end-to-end through the private preview, Ask FYD, owner mode, Circle -> Node, and customization" (2026-09-22). Do not cite dogfood numbers as market proof.
  **EVIDENCE:** `MEMORY.md` (2026-09-22, Nolan's call); memory 2026-09-21#L1425 (demo journal FYD_OVERLAY_JOURNAL=demo; base layer mechanically derived from committed fixture TS — derivation input, not event-sourced).
  **DEPENDENCIES:** none.
  **ACCEPTANCE:** no product claim uses dogfood evidence as customer evidence.
  **NEXT FALSIFICATION:** any deck/pitch citing Happy Place/Coppersmith results as customer validation re-opens as a truthfulness defect.

- **ID:** one-canonical-read-model
  **DOMAIN:** DOGFOOD **STATUS:** IN_PROGRESS **PRIORITY:** 1
  **WHY:** Frozen product invariant (2026-09-21 ~14:30 MDT, Nolan's law): ONE canonical read model feeds Page, Circle, ObjectView, Ask FYD, search, agents, and future protocol projections. Fixtures are test inputs only; no production fixture fallback; unavailable data = FAIL HONESTLY / SHOW UNKNOWN. Proven 2026-09-21: service website-service-51de038c1defe8bd reached page, Circle, ObjectView, Ask FYD with same object ID and factual digests; mutation converged all four; revert restored exact digests; scoped replay byte-identical across two runs (REPLAY DIGEST MATCH).
  **EVIDENCE:** memory URI `MEMORY.md#L174` (FYD Product Invariant); `~/workspace/FAILURE_LEDGER.md` FL-20260921-233 (OPEN: ObjectView/Circle still read hardcoded fixture graphs — the first broken boundary).
  **DEPENDENCIES:** FL-20260921-233 fix (unify on PING-backed projection; fixtures become explicit FIXTURE class).
  **ACCEPTANCE:** FL-20260921-233 closed; Circle and Ask FYD read the same projection; no fixture read path in production code.
  **NEXT FALSIFICATION:** any surface disagreeing with the projection on the service list (Decks/Fences/Pergolas vs "Pergola Design Consultations") re-opens.

- **ID:** nolan-presence-dogfood
  **DOMAIN:** DOGFOOD **STATUS:** DONE_VERIFIED **PRIORITY:** 3
  **WHY:** Nolan's own presence (PING Social homepage: 14-section narrative incl. continuity, TenantOS, build journal, roadmap, newsletter, contact; /technology overhaul preserving honest status language) is the personal-presence dogfood instance. The one-snippet Circle embed exists for putting a circle on any website.
  **EVIDENCE:** memory 2026-09-16#L964; memory 2026-09-21#L1130 (Circle: collapsed ~48px, expansion ~208px; 'My Circles' margin panel grouped by trade; one-snippet embed).
  **DEPENDENCIES:** none.
  **ACCEPTANCE:** embed snippet works on a third-party page without PING JS on the host.
  **NEXT FALSIFICATION:** an embed that phones home with visitor data or breaks host CSP re-opens as a trust defect.

## OUTREACH-RUNTIME LESSONS PLATFORM-ONLY (machinery, never content)

- **ID:** bounded-authorized-automation
  **DOMAIN:** OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** Standing architectural principle (2026-09-14, Nolan's correction): respect platform constraints, use bounded authorized automation, fail closed when platform behavior indicates a restriction. A detected restriction becomes BLOCKED, never an optimization problem. Caps and pacing are implementations of bounded automation, not evasion. Replaces "behave like a person so platforms don't notice."
  **EVIDENCE:** `~/workspace/AGENTS.md` (Platform automation principle); `~/workspace/FAILURE_LEDGER.md` doctrine (2026-09-19): "Classify. Use the lane's classifier; a detected restriction becomes BLOCKED... Never exceed the budget. Never hammer."
  **DEPENDENCIES:** deterministic skill owns rate/volume bounds, authorization, session health, checkpoint detection, stop conditions, retry policy, audit trail.
  **ACCEPTANCE:** any lane encountering a restriction transitions to BLOCKED with evidence, never retries-into-it.
  **NEXT FALSIFICATION:** a lane that treats a checkpoint/action-block as a targeting problem re-opens as a principle violation.

- **ID:** capability-deny-semantics
  **DOMAIN:** OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** DONE_VERIFIED **PRIORITY:** 2
  **WHY:** Capability gates give deterministic deny semantics: e.g., instagram-browser-automation status BROWSER_WEDGE on the ig-profile Chrome -> DEPENDENCY_FAILURE, zero actions, schedule stays enabled (FL-20260921-218). Threads comment path fail-closed correctly (nothing published) when the composer has no Post button (FL-20260921-213). The intent ledger's refuse filter prevents silent double-actions for UNKNOWN_EXECUTION intents.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-218, FL-20260921-213, FL-20260919-003 (39 intents QUARANTINED at UNKNOWN_EXECUTION, never retried).
  **DEPENDENCIES:** intent ledger; capability-state files.
  **ACCEPTANCE:** capability wedge => no actions attempted, no re-fires, schedule preserved.
  **NEXT FALSIFICATION:** an action attempted while its capability gate reports wedge/denied re-opens as a deny-semantics breach.

- **ID:** evidence-graded-claims
  **DOMAIN:** OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** DONE_VERIFIED **PRIORITY:** 2
  **WHY:** Every finding about a prospect's stack or presence is graded CONFIRMED / STRONG INDICATION / WEAK INDICATION / UNKNOWN — never assumed. This is the portable machinery: the same grading gates Ask FYD citations (DIRECT_FACT / website_statement / owner_authorship) and FYD service extraction (DIRECT STRUCTURED > DIRECT PAGE > DERIVED DETERMINISTIC > AI-INFERRED).
  **EVIDENCE:** `MEMORY.md` (stack research grading rule); `~/workspace/FAILURE_LEDGER.md` FL-20260921-232 fix (classificationFromProvenance); memory 2026-09-21#L1425 (service extraction evidence preference, never collapsed, always labeled).
  **DEPENDENCIES:** provenance capture at acquisition.
  **ACCEPTANCE:** no stack/pitch/answer claim appears without a grade; unknowns render as UNKNOWN, never as healthy.
  **NEXT FALSIFICATION:** a claim presented as fact with no traceable basis (the blood-type shape) re-opens wherever it appears.

- **ID:** send-eligibility-precedence
  **DOMAIN:** OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** DONE_VERIFIED **PRIORITY:** 1
  **WHY:** Never decide send eligibility from free-form notes when structured pipeline state exists. Precedence: canonical structured state > explicit suppression > verified communication history > derived projection > notes/free text; notes never resurrect a completed sequence. On disagreement, fail closed: do not send, emit the discrepancy and evidence, require reconciliation.
  **EVIDENCE:** `MEMORY.md` (2026-09-21, Nolan's boundary); `~/workspace/FAILURE_LEDGER.md` FL-20260921-030 follow-up; eligibility-reconciliations.md (stale planning notes "predate the ladder-violation suppression; canonical structured SUPPRESS hard block wins").
  **DEPENDENCIES:** reconciliation-precedence-frozen.
  **ACCEPTANCE:** checker implements the precedence; 17/17 tests.
  **NEXT FALSIFICATION:** a send justified by a note while structured state blocked re-opens as a precedence violation.

- **ID:** rate-volume-bounds-in-skill
  **DOMAIN:** OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** DONE_VERIFIED **PRIORITY:** 2
  **WHY:** Rate/volume bounds are owned by the deterministic skill: cold email cap 10/UTC day (verified against Gmail-accepted count, never in-memory counts); Facebook heavy ceiling 75 likes + 20 comments per pass every 3h with human pacing 45-90s; trust-rebuild reduced caps after locks; halved caps after any action block. The skill — not the agent's judgment — owns session health, checkpoint detection, stop conditions, retry policy, audit trail.
  **EVIDENCE:** `~/workspace/AGENTS.md` (cold email cap; engagement cadences); FL-20260921-218 (target_per_day NOT halved on infra failure — caps react to account signals, not infrastructure).
  **DEPENDENCIES:** skill definitions; audit trails (facebook-engagement.md etc.).
  **ACCEPTANCE:** caps enforced by the skill; every like/comment logged; action-block => instant stop + halved caps next pass.
  **NEXT FALSIFICATION:** volume exceeding the cap without an explicit Nolan decision re-opens as a bounds breach.

- **ID:** unknown-execution-non-reconciliation
  **DOMAIN:** OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** DONE_VERIFIED **PRIORITY:** 2
  **WHY:** UNKNOWN_EXECUTION is a real terminal-ish state: reconcile can only assert EXECUTED or NOT_ATTEMPTED, and with zero per-action evidence neither is provable. The 60 stranded Facebook intents were deliberately left unreconciled; the refuse filter prevents future double-actions on those exact (account, action, url) tuples. Lesson for any action substrate: never convert "outcome unobserved" into success or into a retry.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260920-015 (2026-09-20); FL-20260919-003 (39 intents QUARANTINED); memory 2026-09-21#L1425: "an agent recommendation never becomes a human decision; a dispatched external action never becomes SUCCESS until its success semantics are observed."
  **DEPENDENCIES:** intent ledger refuse path.
  **ACCEPTANCE:** intents with zero evidence remain UNKNOWN_EXECUTION and are refused as future candidates.
  **NEXT FALSIFICATION:** an UNKNOWN_EXECUTION intent silently retried (double-action) re-opens as the worst-case failure of this lesson.

- **ID:** durable-cursor-bounded-batch
  **DOMAIN:** OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** PROVE **PRIORITY:** 2
  **WHY:** Recorded architectural lesson (not built): 2,000 actions cannot be one opaque browser pass. Required future shape: ACTION PLAN -> bounded batches -> durable cursor -> idempotency -> per-action receipt -> UNKNOWN handling -> reconciliation. A sleeping machine must cost at most the current bounded action. Most pieces exist (intent ledger, guard, orphan reaper, ensurePage, browser lock, wake ownership); the missing piece is the durable-cursor bounded-batch worker loop.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-107C note (line ~2355, 2026-09-21).
  **DEPENDENCIES:** wake-lock discipline (acquire -> bounded pass -> release in finally; memory 2026-09-22).
  **ACCEPTANCE:** a worker loop exists that survives host sleep and resumes from a durable cursor with per-action receipts; campaign engine implementation NOT authorized until then.
  **NEXT FALSIFICATION:** a >500-action single pass dispatched without a durable cursor re-opens as the lesson unlearned.

## REPOSITORY ERGONOMICS

- **ID:** ergo-shadow-tree-canonical
  **DOMAIN:** REPOSITORY ERGONOMICS **STATUS:** OPEN **PRIORITY:** 1
  **WHY:** `~/ping/` and `~/ping-gateway-src/` contain divergent copies of `unified_event_runtime.js`; tests use one, docs point to the other. The audit calls it the lane's highest-leverage trap. Concrete injuries already recorded (FL-20260921-018, FL-20260921-219). Recommendation: do not ask Nolan to pick a canonical tree; resolve empirically from runtime/deployment evidence first.
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` ERGO-002; `~/workspace/FAILURE_LEDGER.md` FL-20260921-018, FL-20260921-219.
  **DEPENDENCIES:** deployment evidence (which copy the running gateway loads).
  **ACCEPTANCE:** one canonical copy named; all other copies labeled DERIVATIVE with a pointer; no test or doc references the shadow copy.
  **NEXT FALSIFICATION:** another patch applied to or verified against the wrong copy re-opens with severity raised (see shadow-copy-patch-mislocation).

- **ID:** ergo-supersession-metadata
  **DOMAIN:** REPOSITORY ERGONOMICS **STATUS:** OPEN **PRIORITY:** 2
  **WHY:** Multiple architecture documents name incompatible event authorities and none are marked superseded; agents cannot determine which authority is current without oral history. Same class: the constitutional-convergence branch vs. main vs. worktree copies.
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` ERGO-001.
  **DEPENDENCIES:** ergo-shadow-tree-canonical (authority docs must point at the canonical tree).
  **ACCEPTANCE:** every architecture doc carries a status header (CURRENT / SUPERSEDED-BY <doc> / HISTORICAL); the event-authority question resolves to one doc.
  **NEXT FALSIFICATION:** an agent implements against a superseded authority doc re-opens.

- **ID:** ergo-doc-currency-guide
  **DOMAIN:** REPOSITORY ERGONOMICS **STATUS:** OPEN **PRIORITY:** 2
  **WHY:** `~/ping/` holds 390 Markdown files, 65 audit files, 46 reports with no currency/deprecation guide; archaeology dominates orientation time. Nolan's artifact policy exists (KEEP / ARCHIVE / DELETE classes; docs move into WSL; repo's canonical docs structure preferred over parallel invention) but the guide itself is not in place.
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` ERGO-005; memory 2026-09-15#L389 (artifact/storage policy).
  **DEPENDENCIES:** repo canonical docs structure.
  **ACCEPTANCE:** a currency guide exists at the docs root; KEEP/ARCHIVE/DELETE triage applied to the 390 files.
  **NEXT FALSIFICATION:** a new agent's orientation still requires oral history to find the current authority doc.

- **ID:** ergo-misleading-entrypoints
  **DOMAIN:** REPOSITORY ERGONOMICS **STATUS:** OPEN **PRIORITY:** 3
  **WHY:** `simple_server.js`, underscore-prefixed tests, and duplicate launchers create misleading entrypoints and skipped tests. Six gateway launch paths use three PostgreSQL defaults; some contain hardcoded environment-specific paths and secret values. Source boot paths resolve `GENERATION_MANIFEST.yaml` and `database/canonical_events.sql` in trees where they do not exist.
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` ERGO-009, ERGO-004, ERGO-003; `~/workspace/FAILURE_LEDGER.md` FL-20260920-018 (missing SQL files in distribution), FL-20260920-019 (missing GENERATION_MANIFEST.yaml), FL-20260920-014 (Dockerfile missing runtime deps).
  **DEPENDENCIES:** distribution-closure item below.
  **ACCEPTANCE:** one documented launch path per deployment target; skipped tests either fixed or deleted; boot resolves every file it references.
  **NEXT FALSIFICATION:** a deploy failing on a file the boot path assumes re-opens.

- **ID:** ergo-distribution-closure
  **DOMAIN:** REPOSITORY ERGONOMICS **STATUS:** IN_PROGRESS **PRIORITY:** 2
  **WHY:** Distribution images have repeatedly shipped incomplete: missing runtime deps (Dockerfile only COPYed gateway/, breaking ../../ping-runtime imports), missing `database/` SQL, missing GENERATION_MANIFEST.yaml, tree-sitter native build failure in Alpine, missing @types/node breaking tsc in pristine containers. Lesson: prove closure from the built artifact, not from the source tree; prefer the repo's pinned toolchain over npx-fetched binaries.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260920-014 (FIXED 8b42c1b01), FL-20260920-017, FL-20260920-018, FL-20260920-019, FL-20260921-027, FL-20260921-023 (prefer repo's own tsc).
  **DEPENDENCIES:** release doctrine (clean exact-source snapshot build; deployed-filesystem vs certified-snapshot comparison — FL-20260920-023 gaps 10-12).
  **ACCEPTANCE:** a closure proof (built image contains every boot-resolved file; tsc passes in the pristine container) gates every candidate.
  **NEXT FALSIFICATION:** any candidate promoted without a closure proof re-opens.

- **ID:** ergo-round-script-schema-drift
  **DOMAIN:** REPOSITORY ERGONOMICS **STATUS:** DONE_VERIFIED **PRIORITY:** 3
  **WHY:** Round-specific merge scripts duplicate schemas and validation logic instead of using the existing schema as one authority (ERGO-007); `jsonl-merge-round31.py:114` hardcoded the deprecated suppression value and, while not the cause of FL-20260922-001, was a loaded gun until annotated DEPRECATED. Lesson: one-shot scripts are future live writers; annotate or archive them.
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` ERGO-007; `~/workspace/FAILURE_LEDGER.md` FL-20260922-001 residual (c) CLOSED 2026-09-22 ~08:00 MDT.
  **DEPENDENCIES:** prospect-schema.json as the single schema authority.
  **ACCEPTANCE:** the script carries a DEPRECATED ONE-SHOT header; `ast.parse` verified.
  **NEXT FALSIFICATION:** any future one-shot script with hardcoded vocabulary reused by the engine re-opens.

- **ID:** ergo-worktree-reachability
  **DOMAIN:** REPOSITORY ERGONOMICS **STATUS:** DONE_VERIFIED **PRIORITY:** 3
  **WHY:** Convergence worktrees (`/home/nolan/worktrees/constitutional-convergence`) were unreachable from subagent sandboxes, hard-blocking lanes (FL-20260919-P08-LANE3-001, FL-20260919-P04-LANE2-001, FL-20260919-P0-LANE1-001). Lesson: lane briefs must assert worktree reachability as a precondition; reconstruction-from-sandbox is the fallback, not the plan.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260919-P08-LANE3-001, FL-20260919-P04-LANE2-001, FL-20260919-P0-LANE1-001 (2026-09-19).
  **DEPENDENCIES:** sandbox mount topology.
  **ACCEPTANCE:** lane preconditions include a reachability probe; blocked lanes park with evidence instead of improvising.
  **NEXT FALSIFICATION:** a lane starting work it cannot reach, without a recorded precondition check, re-opens.

## FUTURE BUSINESS OPTIONALITY (capture only — nothing below is authorized to build)

- **ID:** opt-business-websites
  **DOMAIN:** FUTURE BUSINESS OPTIONALITY **STATUS:** IN_PROGRESS **PRIORITY:** 1
  **WHY:** Core FYD loop (URL -> object graph -> SiteSpec -> renderer -> owner customization) is the product under construction on two demo tenants. Website revamp angle is already a Nolan-approved pitch (very non-technical owners with weak websites only; TenantOS pipeline; portfolio proof https://happy-place-platform.vercel.app/).
  **EVIDENCE:** `MEMORY.md` (2026-09-11 website revamp angle); FYD harvest directive (2026-09-22).
  **DEPENDENCIES:** EXTERNAL USER VALIDATION domain.
  **ACCEPTANCE:** first external owner end-to-end.
  **NEXT FALSIFICATION:** an owner whose site cannot be acquired re-opens as an acquisition defect, not a product pivot.

- **ID:** opt-creator-presences-newsletters
  **DOMAIN:** FUTURE BUSINESS OPTIONALITY **STATUS:** DEFERRED **PRIORITY:** 3
  **WHY:** Personal/creator presences and newsletters are named in the optionality set; the PING Social homepage narrative already covers a newsletter section and the pig mascot system exists, but neither is a live product surface.
  **EVIDENCE:** memory 2026-09-16#L964 (homepage 14-section narrative incl. newsletter); `MEMORY.md` (PING pig mascot hard rule 2026-09-14).
  **DEPENDENCIES:** business websites proven first.
  **ACCEPTANCE:** deferred until an owner or Nolan asks.
  **NEXT FALSIFICATION:** n/a (deferred, not rejected).

- **ID:** opt-social-graph-circles-nodes
  **DOMAIN:** FUTURE BUSINESS OPTIONALITY **STATUS:** HARVEST **PRIORITY:** 2
  **WHY:** Circles exist in demo (collapsed ~48px, expansion ~208px, 'My Circles' margin panel grouped by trade, one-snippet embed). Circle -> Node is in Nolan's end-to-end acceptance for the two backends. Social relationships (Circle/Node), cross-network following where supported, and embeddable Circles are the social layer; Related Circles must come from actual graph relationships, ranked deterministically.
  **EVIDENCE:** memory 2026-09-21#L1130; memory 2026-09-22#L355 (required next proof: primary Business Circle from the same canonical graph; no fabricated visual density); `MEMORY.md` (2026-09-22: backends stay at two until Nolan uses both end-to-end incl. Circle -> Node).
  **DEPENDENCIES:** one-canonical-read-model.
  **ACCEPTANCE:** Related Circles render from real relationships; embed snippet proven on a third-party page.
  **NEXT FALSIFICATION:** a Circle showing fabricated relationships (density without evidence) re-opens as a truthfulness defect.

- **ID:** opt-commerce-services-appointments
  **DOMAIN:** FUTURE BUSINESS OPTIONALITY **STATUS:** DEFERRED **PRIORITY:** 3
  **WHY:** Commerce, services, appointments, lead capture, reviews, campaigns are named future surfaces. Primitives exist on the outreach side (review-triggered outreach; speed-to-lead EXP-003; 48-hour stale-estimate follow-up EXP-002; post-job review requests EXP-001) but all are blocked on one provider-binding decision (sms_integration.js / email_integration.js are stubs; Quo vs Twilio/SMTP capability investigation comes before any Nolan question).
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` EXP-001..004, EXP-007, shared bottleneck note; `MEMORY.md` (Monument View: no online ordering/booking — the demand is real).
  **DEPENDENCIES:** provider-binding decision; TEN-001 for any tenant-scoped variant.
  **ACCEPTANCE:** deferred; the provider capability investigation is the authorized next step, not the build.
  **NEXT FALSIFICATION:** building any of these on the current stubs re-opens as premature construction.

- **ID:** opt-business-intelligence
  **DOMAIN:** FUTURE BUSINESS OPTIONALITY **STATUS:** HARVEST **PRIORITY:** 2
  **WHY:** BI surfaces exist but are immature or exposed: /mc lead/invoice/at-risk surfaces are public (SEC-002); 72 group-scan files could rank group yield but selection is hardcoded (COMP-001); 102/305 prospect rows have stack signals and 117/305 have primary opportunities with no segment aggregation feeding the playbook (COMP-003); the competitive-signal-pass skill is the deterministic intelligence pattern (exactly one terminal state, never writes to PING).
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-002, COMP-001, COMP-003; `~/workspace/skills/competitive-signal-pass/SKILL.md`.
  **DEPENDENCIES:** tenant isolation (TEN-001) before any multi-tenant BI.
  **ACCEPTANCE:** BI reads are authenticated and tenant-scoped; segment aggregation feeds the playbook deterministically.
  **NEXT FALSIFICATION:** a BI claim presented without evidence grading re-opens under evidence-graded-claims.

- **ID:** opt-protocol-projections-identity
  **DOMAIN:** FUTURE BUSINESS OPTIONALITY **STATUS:** HARVEST **PRIORITY:** 2
  **WHY:** FYD is N inputs -> graph -> M outputs: website, Circle, Ask FYD, feed, ActivityPub, ATProto, MCP, campaigns, future interfaces (memory 2026-09-21#L1414). Portable identity rule: FYD wraps existing PING identity semantics, extracts only dependency-light primitives, never forks a second user system (memory 2026-09-21#L1577). Protocol projections ride the one-read-model invariant.
  **EVIDENCE:** memory 2026-09-21#L1414, L1577; `MEMORY.md` one-read-model invariant (feeds "future protocol projections").
  **DEPENDENCIES:** one-canonical-read-model; agent<->tenant authority model (TEN-001, grill candidate G4).
  **ACCEPTANCE:** a second projection (feed or MCP) renders from the same canonical graph with no new truth source.
  **NEXT FALSIFICATION:** a projection inventing facts the graph does not contain re-opens as a binding-verifier failure.

- **ID:** opt-agent-swarms-bounded
  **DOMAIN:** FUTURE BUSINESS OPTIONALITY **STATUS:** HARVEST **PRIORITY:** 3
  **WHY:** Agent swarms under bounded capability are named optionality; the ORCA autonomy lane is the live experiment. Its Phase 0 evidence shows the failure shapes swarms must survive: A6 restart duplicated task 1 under a new work_order_id (in-memory workorder lifetime), two distinct canonical WORKER_FAILED events for one logical task.
  **EVIDENCE:** `~/workspace/evidence-binding.md` (findings 1-2, branch feature/orca-autonomy @ 0b8acadfc).
  **DEPENDENCIES:** bounded-authorized-automation; durable-cursor-bounded-batch.
  **ACCEPTANCE:** a restarted swarm never double-executes a logical task (idempotent work-order identity across restarts).
  **NEXT FALSIFICATION:** a restart duplicating a dispatched external action re-opens as the critical swarm-safety defect.

- **ID:** opt-developer-api-ecosystem
  **DOMAIN:** FUTURE BUSINESS OPTIONALITY **STATUS:** HARVEST **PRIORITY:** 3
  **WHY:** The `ping-gateway-exterior-agent-integration` goal exists; the 8080 deployment lane owns the gateway. But exterior surfaces are currently unauthenticated in places (SEC-001/SEC-002, TEN-001 caller-asserted namespaces, TEN-003 principal loss across hops: `req.authenticatedAgent` consumed by almost nothing). No developer ecosystem until the auth/tenant model is decided.
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-001/002/003, SEC-001/002; `~/workspace/FAILURE_LEDGER.md` FL-20260921-231 (deployment lane owns 8080).
  **DEPENDENCIES:** grill candidate G4 (agent<->tenant authority model).
  **ACCEPTANCE:** exterior API with authenticated principals bound into event metadata; tenant isolation proven by the authorized cross-principal bleed falsification test.
  **NEXT FALSIFICATION:** the TEN-001 falsification probe succeeding (cross-tenant write/read from different credentials) keeps this blocked — that is the expected current result.

## PERFORMANCE (engineering budget, never an excuse for a worse product)

- **ID:** perf-no-latency-slos
  **DOMAIN:** PERFORMANCE **STATUS:** OPEN **PRIORITY:** 1
  **WHY:** No measured numbers exist for URL->presence latency, crawl latency, proceduralization time, SiteSpec generation time, render latency, Ask FYD latency, or mobile performance. The five must-win metrics name performance but it is uninstrumented; "measure mobile, contact, services, performance, and trust before fixing the first broken customer experience" (2026-09-21) has no completion evidence.
  **EVIDENCE:** memory 2026-09-21#L1462; memory 2026-09-21#L1033.
  **DEPENDENCIES:** instrumentation in the acquisition->render path.
  **ACCEPTANCE:** per-stage latency table for both demo tenants, published as a dated artifact; budgets set from the table, not from aspiration.
  **NEXT FALSIFICATION:** any performance claim ("fast", "optimized") without a measured number re-opens as a P1 names-overclaim-mechanism defect.

- **ID:** perf-intelligence-budget
  **DOMAIN:** PERFORMANCE **STATUS:** PROVE **PRIORITY:** 2
  **WHY:** Goal: generous intelligence where it earns value, not unnecessary LLM calls. Positive evidence: Ask FYD's topic-gating fails closed instead of spending inference on filler; the proceduralizer's source-coverage diagnostic is deterministic (memory 2026-09-21#L681). Negative evidence: Meta AI duplicate verification load was 63-72% (COST-001) — intelligence spent re-verifying the already-known.
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` COST-001; memory 2026-09-21#L681.
  **DEPENDENCIES:** cost-verification-cache.
  **ACCEPTANCE:** an intelligence-spend ledger per lane (calls, cost driver, value earned); duplicate-verification rate trending down via the content-addressed cache.
  **NEXT FALSIFICATION:** an LLM call whose output is never consumed by a deterministic gate re-opens as budget waste.

- **ID:** perf-mobile-first-proof
  **DOMAIN:** PERFORMANCE **STATUS:** OPEN **PRIORITY:** 2
  **WHY:** Mobile is a must-win metric and the renderer has two open mobile defects: Happy Place/Coppersmith hero clipping at 375x812 (FL-20260921-033, root cause narrowed to composed-page intrinsic-width interaction; headless Chrome clamps layout viewport to 500px minimum on Windows per FL-20260921-SITE3, which contaminates mobile proof methodology). First-broken-step rule applies: FL-20260921-031 (Coppersmith SiteSpec validation) precedes the mobile boundary.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-033 (+diagnosis update), FL-20260921-031 (OPEN), FL-20260921-SITE3.
  **DEPENDENCIES:** FL-20260921-031 fix first.
  **ACCEPTANCE:** both tenants render clean at 375x812 with a proof method that accounts for the 500px headless clamp (real device or corrected viewport).
  **NEXT FALSIFICATION:** a "mobile clean" claim from a headless capture without viewport-correction re-opens as unproven.

- **ID:** perf-incremental-refresh-cache
  **DOMAIN:** PERFORMANCE **STATUS:** OPEN **PRIORITY:** 3
  **WHY:** Incremental refresh, cache hit rates, and verification caching are unmeasured. The source-change pipeline is specified (SOURCE T2 -> OBJECT DIFF -> DEPENDENCY IMPACT -> GENERATED BASE UPDATE -> REAPPLY OWNER OVERRIDES -> VALIDATE -> RENDER, 2026-09-22 invariants) but its refresh latency and override-preservation are unproven; one owner correction must become effective across all surfaces (2026-09-21 proof target).
  **EVIDENCE:** `MEMORY.md` FYD architecture invariants (2026-09-22); memory 2026-09-21#L1492.
  **DEPENDENCIES:** one-canonical-read-model.
  **ACCEPTANCE:** measured refresh latency for a source change with owner overrides preserved; cache hit rates reported.
  **NEXT FALSIFICATION:** a source refresh that drops an owner override re-opens as the "preserve owner customization through refresh" invariant violation.

## COST

- **ID:** cost-verification-cache
  **DOMAIN:** COST **STATUS:** OPEN **PRIORITY:** 2
  **WHY:** Meta AI duplicate verification load was 63-72% in audited rounds (13/18, 13/22, 12/19 duplicates). A content-addressed verification cache would cut most of it. This is the largest measured intelligence-cost sink.
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` COST-001.
  **DEPENDENCIES:** tandem verification path.
  **ACCEPTANCE:** duplicate verification rate measured per round and trending down after the cache lands.
  **NEXT FALSIFICATION:** three consecutive rounds above 50% duplicates with no cache progress re-opens.

- **ID:** cost-artifact-hygiene
  **DOMAIN:** COST **STATUS:** OPEN **PRIORITY:** 3
  **WHY:** Measured dead weight: `~/workspace/tmp-diag/` ~706 MB completed diagnostics (COST-002); paused voice venv ~434 MB (COST-003); generated orchestration artifacts ~104 MB dated 2026-07-21 (COST-005); PING content inbox ~56 MB rejected generations (COST-006). Cleanup is authorized only with ownership proven; the tmp-diag and orchestration artifacts are the cleanest candidates.
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` COST-002/003/005/006.
  **DEPENDENCIES:** ownership verification per artifact set.
  **ACCEPTANCE:** each set either deleted with ownership evidence or explicitly retained with a reason; no silent accumulation.
  **NEXT FALSIFICATION:** tmp-diag growing without bound re-opens.

- **ID:** cost-idle-fleet-ownership
  **DOMAIN:** COST **STATUS:** DEFERRED **PRIORITY:** 3
  **WHY:** ~10-container Pig fleet mostly idle with duplicated brain-*/ping-* data services (COST-004). The audit deliberately withheld the shutdown recommendation: shutting down shared services is destructive and hard to reverse without proven ownership and need. Do not delete merely because something looks unused; ownership first.
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` COST-004; `~/workspace/FAILURE_LEDGER.md` FL-20260919-RCA-008 (surgical order: active writer proven and contained, zero leak, no migration target).
  **DEPENDENCIES:** container ownership mapping.
  **ACCEPTANCE:** ownership proven per container before any shutdown; shared data services never stopped without a migration target.
  **NEXT FALSIFICATION:** an idle-container shutdown that breaks a live lane re-opens as a destructive-action violation.

- **ID:** cost-media-cache-rights
  **DOMAIN:** COST **STATUS:** PROVE **PRIORITY:** 2
  **WHY:** FYD media architecture: download + digest + derivative, hotlink as fallback only; downloaded bytes are NOT canonical business truth; the media record answers where-from/when-observed/what-bytes; never imply copyright ownership by caching; unclear provenance = retain reference only, never silent republish (2026-09-22 harvest directive). Logo ingestion for both demo tenants is independently verified with rights classification. The cost question (media cache growth) is subordinate to the rights question.
  **EVIDENCE:** `MEMORY.md` FYD harvest directive media decision (2026-09-22); memory 2026-09-21#L1148 (logo ingestion verified, webp derivatives on disk).
  **DEPENDENCIES:** managed media pipeline (next boundary after one-read-model).
  **ACCEPTANCE:** every cached derivative carries source URL + observed_at + digest + rights classification; junk-source captures (Google sign-in page) rejected by visual verification.
  **NEXT FALSIFICATION:** a cached derivative with unclear provenance used as a published asset re-opens as a rights defect (see FL-20260921-216 lesson: 2KB webp for a 480w render is a smell).

## LOCAL-FIRST/DESKTOP

- **ID:** local-first-desktop-vision
  **DOMAIN:** LOCAL-FIRST/DESKTOP **STATUS:** DEFERRED **PRIORITY:** 3
  **WHY:** Future Windows product named in the lane framing: Identity Vault, Object Store, Relationship Graph, Private Context, Feed Projection, Capability Runtime, Agent Runtime, protocol adapters. No memory evidence of Tauri/WebView2 selection or key-custody design beyond the dev-key-custody check. Track only; no build authorized.
  **EVIDENCE:** task lane framing (vision component list); `~/workspace/FAILURE_LEDGER.md` FL-20260921-016 (dev-key-custody git-ignored check); memory 2026-09-19#L1743 (`ping-vault` container unhealthy, root cause undiagnosed).
  **DEPENDENCIES:** TEN-001 (tenant/identity authority) must land before any vault holds real keys.
  **ACCEPTANCE:** deferred; a Tauri/WebView2/key-custody decision appears only when the product needs it.
  **NEXT FALSIFICATION:** n/a (deferred). If a desktop build starts, the first item is the key-custody threat model.

- **ID:** local-key-custody-hygiene
  **DOMAIN:** LOCAL-FIRST/DESKTOP **STATUS:** OPEN **PRIORITY:** 2
  **WHY:** Key custody is already load-bearing: Bearer tokens resolved at runtime from the ping-gateway container env, never stored (tandem); rotation record shows 4 distinct historical PG passwords and SCRAM-verifier comparison done in-memory, never in argv (FL-20260920-022 rotation record). But `ping-vault` is unhealthy with undiagnosed root cause, and the Oracle deploy reused a stale credential without updating /opt/ping/.env. Hygiene is proven in procedure, not in infrastructure.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260920-022 + rotation record (2026-09-21); memory 2026-09-19#L1743.
  **DEPENDENCIES:** vault health diagnosis.
  **ACCEPTANCE:** vault healthy or formally decommissioned; no live credential reachable via a second stale copy.
  **NEXT FALSIFICATION:** a credential found in tool output, a file, or a stale config re-opens (FL-20260920-022 class).

## SEARCH/KNOWLEDGE

- **ID:** search-qdrant-truthfulness
  **DOMAIN:** SEARCH/KNOWLEDGE **STATUS:** OPEN **PRIORITY:** 1
  **WHY:** Semantic search is down: Qdrant unreachable from the gateway (Docker Desktop host port-forward reset every HTTP request; later `ping-qdrant` unhealthy, root cause undiagnosed); embedding init wrapped in try/catch -> null. Current "hybrid search" is PostgreSQL keyword search wearing a hybrid label (P1 names-overclaim-mechanism). Rule: no "hybrid" label unless hybrid actually executes.
  **EVIDENCE:** `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` PERS-001; `~/workspace/FAILURE_LEDGER.md` FL-20260919-005 (HEALED on Pig dev gateway via docker restart — Oracle was never affected, a different instance); memory 2026-09-19#L1743.
  **DEPENDENCIES:** Qdrant network/config fix (mechanical); decision whether anything depends on BullMQ/Redis before rewiring.
  **ACCEPTANCE:** `/health` reports qdrant+embedding healthy from the deployed gateway's network namespace; or the "hybrid" label is removed everywhere.
  **NEXT FALSIFICATION:** any surface labeled "hybrid"/"semantic" while semanticHits=0 re-opens as a truthfulness defect.

- **ID:** search-postgres-fallback-honesty
  **DOMAIN:** SEARCH/KNOWLEDGE **STATUS:** DONE_VERIFIED **PRIORITY:** 2
  **WHY:** Until Qdrant is healthy, Postgres keyword search is the honest fallback — labeled as keyword search, not hybrid. The 2026-09-13 read-only probes proved the working surface: POST /knowledge/search (keyword works), GET /knowledge/nodes filterable, event traversal L1 (EAB 8-deep chain). Lesson: presented truth must equal actual truth (P1); a degraded mode is fine, a mislabeled one is not.
  **EVIDENCE:** memory 2026-09-13#L725 (read-only live probes: 1,875 events, knowledge graph 134 nodes all candidate, 0 edges; semanticHits 0).
  **DEPENDENCIES:** search-qdrant-truthfulness.
  **ACCEPTANCE:** every search surface states its actual mechanism; no "semantic" claim without vectors.
  **NEXT FALSIFICATION:** a "semantic search" claim with Qdrant down re-opens.

- **ID:** search-knowledge-graph-edges
  **DOMAIN:** SEARCH/KNOWLEDGE **STATUS:** OPEN **PRIORITY:** 2
  **WHY:** The knowledge graph has 134 nodes, 0 edges, all status candidate; KnowledgePromoter is wired but zero approval inputs have ever arrived (all 68 nodes remain candidate per the audit). The compiler pipeline (raw -> snapshot -> artifact -> evidence -> observation -> fact -> claim -> relationship -> knowledge object -> verification -> accepted) has never completed to "accepted" in production. Derived knowledge (rankings, relationship projections) cannot exist until edges and approvals do.
  **EVIDENCE:** memory 2026-09-13#L725; `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` LOOP-002 (approval path complete and idle; approval genuinely affects ranking when present).
  **DEPENDENCIES:** the approval input (COMP-005: AI workspace accept/reject actions are the missing supply side).
  **ACCEPTANCE:** first non-test relationship edge materialized with evidence; first approval promotes a node out of candidate.
  **NEXT FALSIFICATION:** six months of candidate-only nodes re-opens as "the compiler never compiles."

- **ID:** search-ask-fyd-retrieval-gaps
  **DOMAIN:** SEARCH/KNOWLEDGE **STATUS:** OPEN **PRIORITY:** 2
  **WHY:** Ask FYD retrieval is evidence-bounded with per-claim classes (FL-20260921-232 CLOSED), but residuals remain: GENERIC_WORDS topic stoplist is heuristic; contact/location/review branches are not topic-gated (surgical scope). Ask FYD must answer UNKNOWN when evidence is insufficient and must never fill from model priors. The proceduralizer's deterministic source-coverage diagnostic (which sources discovered/extracted/unused/unsupported/conflicted) is the retrieval-side contract.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-232 (residuals noted); memory 2026-09-21#L681 (proceduralizer coverage diagnostic); `MEMORY.md` ask-fyd-evidence-gap (ask-fyd-evidence-gap.md in fyd-lane).
  **DEPENDENCIES:** one-canonical-read-model.
  **ACCEPTANCE:** all branches topic-gated or explicitly classified heuristic; 20-question visitor test (ask-fyd-usefulness-external) with zero filler.
  **NEXT FALSIFICATION:** an ungated branch dumping a description on an unsupported question re-opens (the exact 232 failure shape).

- **ID:** search-object-relationship-evidence
  **DOMAIN:** SEARCH/KNOWLEDGE **STATUS:** PROVE **PRIORITY:** 2
  **WHY:** Object search, relationship search, and evidence search must all read the one canonical model. Current state: Circle/ObjectView read hardcoded fixtures (FL-20260921-233 OPEN) while Ask FYD and pages read the PING-backed projection — the same divergence that would corrupt all three search surfaces. Related Circles must come from actual graph relationships, ranked deterministically, omitted when evidence is insufficient.
  **EVIDENCE:** `~/workspace/FAILURE_LEDGER.md` FL-20260921-233; memory 2026-09-22#L355.
  **DEPENDENCIES:** one-canonical-read-model (FL-20260921-233 fix).
  **ACCEPTANCE:** object/relationship/evidence search return identical business facts as the page, Circle, and Ask FYD for both demo tenants.
  **NEXT FALSIFICATION:** any search surface disagreeing with the canonical projection re-opens as a read-model divergence.

---

## NOTES FOR THE PARENT
1. **Count:** 56 items across 11 domains (target was 40-60).
2. **The KNOWN_PERMANENT lifecycle could not be grounded.** If the parent's reconciliation design depends on that vocabulary, it needs to be introduced as new design, not cited as existing — the existing machinery has dispositions (ELIGIBLE/INELIGIBLE/SUPPRESSED) but no named lifecycle states. I recorded this as Contradiction #1 rather than inventing items around an unverified term.
3. **Biggest open risks, in my read:** (a) EXTERNAL USE