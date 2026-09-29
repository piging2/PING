# Integration Ledger 06 — 2026-09-29 ~11:53 MDT
**Interval:** PING/FYD convergence interval 6. Coordinator: convergence coordinator.
**Branch:** `security/secret-redaction-2026-09-28` (workspace). Nothing pushed.

## Headline verdict: QUEUED WORK CLOSED, HARVEST RANKED, PROGRAM FRAME ADOPTED

Intent-routing defect fixed and independently verified. dump.py acquisition-lane defects fixed. All three external harvest miners completed under the hard cap; top 2 primitives ranked and authorized for writer time next interval. Acquisition rebuild scoped writer-ready. No marketer build started per the new program frame.

## Program frame (binding, new this interval)

**FYD-TEN-DAY-PRODUCT-DIRECTIVE.md adopted** (Nolan, 2026-09-29 ~11:50 MDT, committed `4d4e5c6`). The ten-day directive is now the program: build the first FYD tenant that can truthfully say "my business has an autonomous marketer." Current scope (close WHY THIS → OWNER CORRECTION → DURABLE OWNER INTENT → REGENERATION → OWNER INTENT SURVIVES) is explicitly P0. Correction loop stands: product arrow → missing invariant → harvest → smallest integration → proof. CRX stays a mine, not a dependency. Prohibited this program: MarketerAuthority/CampaignAuthority/AgentAuthority/LearningAuthority/SocialAuthority, new event bus/graph DB/identity system, generic agent OS, CRX convergence.

**Scope cut** (Nolan, 2026-09-29 ~11:48 MDT, committed `a3839b3`): PING is the single exploratory tenant. The directive's two-tenant proof is deferred; no second tenant starts until PING proves the loop. When marketer build work begins after the arrow-close, it targets PING only.

**Mission Control ecosystem vision** (Nolan, 2026-09-29 ~11:44 MDT): consumer AND business capabilities from day one; English prompts execute autonomous offer analysis and actions; every existing website is a potential node; the trust layer (evidence, Why This, owner correction, authorized transitions) is what makes autonomous actions sellable instead of scary. This vision is what the harvest ranking below is scored against.

Per the directive, **no autonomous-marketer build work started this interval**. No new primitives, no campaign machinery. The harvest writer-time authorization below is queued for next interval, not dispatched.

## ARROWS

**Intent-routing defect (website-design → phone-number): GREEN (FIXED / VERIFIED).** Committed `7bf04cd9` on the served line. Root cause confirmed exactly as diagnosed: the services branch silently skipped ungrounded topics, then the contact gate re-consumed "website". Smallest delta in `src/lib/ping/ask-composer.ts` (+23/-1): the services branch now notes unmatched topics as unknowns for genuine services intent (strong triggers only) and sets a `servicesIntentUngrounded` flag; the contact gate carries the negative guard. The dead `detectIntents()` classifier was not touched (not on the served path). The loose "do" fallback ("Do you have a website?") deliberately still routes to contact.

**Independently verified by the coordinator** (not taken on the writer's word): jest `src/lib/ping` 24/24, jest `src/fyd/ask` + `src/app/api/fyd/ask` 343/343 — 367/367 total, matching the writer's claim exactly. Behavior harness: "Does PING offer website design?" now answers "I cannot answer that: nothing in the site record covers it, and I will not guess." with unknowns ["website","design"]; "What is your phone number?", "Do you have a website?", "What services do you offer?" byte-identical before/after.

**dump.py acquisition-lane environment findings: 2 FIXED, 1 FALSIFIED.** Committed `a62fd1da` (separate atomic commit). (1) 0600 overlay JS vs docker cp: CONFIRMED live (uid 1000 file EACCES for container uid 1001 nodejs user); fixed with `os.chmod(js_path, 0o644)` at both temp-file sites, verified end to end. (2) pg module path: CONFIRMED (`/app/node_modules/pg` does not exist in container); corrected to `/app/gateway/node_modules/pg`, verified in-container. (3) Missing demo journal: FALSIFIED — journal gateway up on 127.0.0.1:18199, demo mode runs end to end (happy-place 30 overlays, coppersmith-plumbing 31 overlays, exit 0). Dumper version 1.2.1 → 1.2.2. Caveats: main-journal overlay path still fails closed by design (8080 journal lacks the overlay marker; pending gateway cutover HOLD); stale `fyd-overlay-query-*.js` files accumulate in container /tmp (sticky-bit uid mismatch, harmless, unique per pid); port 18199 is the old `ping` repo's gateway while the converged repo's own gateway runs on 18200 — no rewiring done.

**External harvest: 3 miners complete, RANKED, top 2 authorized for next interval.** One read-only pass per source, clones in /tmp only, nothing written to the workspace. License posture recorded per source: MatrixClaw MIT; MyAgens GPLv3 (clean-room semantic reimplementation only); Pioneer custom UEL (concept reference only, anti-commercial-derivative); Talos MIT; OpenHands MIT; POLYROB MIT; AgentArk MIT/Apache-2.0.

Authorized for writer time **next interval** (hard cap: top 1-2 with a current product-arrow mapping; NOT dispatched this interval per the directive):
1. **Turn-origin tagging, fail-closed** (POLYROB `a869af97`, MIT): every execution context stamped genuine_owner / delegated / wake / reentry; unprovable origin defaults to least-privileged; all world-affecting verbs route through one origin predicate. Arrow: DURABLE OWNER INTENT — a wake or delegation re-entry must never present as the owner at an authorized transition, which is where "same correction survives" silently breaks. Smallest delta: one `origin` field on the authorized-transition record, enforced at the single authorization chokepoint. Copy semantics, not names.
2. **Accepted/corrected outcome ledger with confidence-decay consolidation** (AgentArk `63985cf8`, MIT/Apache-2.0): outcome-state fields (accepted/failed/corrected, accepted_at) on outcome records; contradicted procedures decay confidence by fixed step with floor, never delete. Arrow: OWNER CORRECTION → DURABLE OWNER INTENT — decay-not-delete honors "never rewrite history to make Y look source-derived."

REFERENCE (no writer time; mapped to the directive's program for later): Talos action-bound capability tokens + default-deny two-tier kernel (directive's action policy ALLOW/NEEDS_OWNER/DENY — marketer build, not this interval); Talos receipt chain + receipt-text rule (Why This presentation discipline); MatrixClaw orphaned-run fail-closed (SURVIVAL; Mission Control audit confirmed no BLOCKED state and no boot sweep — genuine gap, queued behind the pair); OpenHands sandbox invariant doctrine (worker execution); MyAgens worker-registry seam / stall watchdog / failover invariants (GPL clean-room only); POLYROB owner-notice resend cooldown; POLYROB claim/lease (verify Mission Control ownership first — duplication risk); AgentArk evidence gate + promotion gate (timed to the owner-controlled-learning arrow, which does not exist yet). REJECTED: all chat/social/provider-matrix/memory-store/event-bus/approval-ontology items per the not-harvest list; AgentArk self-rewriting source (doc-ahead-of-code, absent at the pinned commit).

**PING knowledge acquisition rebuild: SCOPED, writer-ready for next interval.** Staleness reproduced end to end: base frozen at 2026-09-21T00:00:00.000Z (8+ days), 7 objects all owner-asserted, 4 service objects with empty fields; the producing tool (`fyd-dogfood-builder@1`) does not exist in the repo; happy-place and coppersmith were re-dumped 2026-09-28, PING never got a second dump. No live refresh path: `refreshSource` has zero production callers; Ask rebuilds from the pinned fixture + journal overlays every read and never reads the disk projection or Postgres. Four competing website→graph producers exist; exactly one (the presence compiler `compile-tenant` + `anonymous-preview`) should own the rebuild. Smallest delta (one writer-sized unit): declare the PING source list, re-derive with existing machinery keeping object IDs byte-stable, regenerate the fixture mechanically, update the digest pin (fail-closed does the rest), run the `refreshSource`/`diffTwin` survival proof, re-green the contract test. No new crawler, no cron, no scheduler. One genuine decision required: the authoritative PING source list and the provenance vocabulary split (owner-asserted vs website-ingestion).

**Media manifests: still PENDING OWNER DECISION.** The three dual-nature manifests (`coppersmith-plumbing-live.json`, `happy-place-live.json`, `live-9d13c4196b4f.json`) carry both evidence-side fields (sourceUrl, observedAt, digest, rights) and projection-side fields (generator, ingest run, FYD media ID, roles, lifecycle, variants). Rubric holds: split semantic ownership without duplicating the asset; asset identity shared by digest. The mechanical schema choice is presented below, not silently integrated.

## CONVERGENCE

Served line `fyd/convergence-2026-09-28`: `000ea349` → `a62fd1da` via two atomic commits (`7bf04cd9` intent-routing, `a62fd1da` dump.py). Both verified by the coordinator. Only dirt: pre-existing `mc-approval/__pycache__/`. Nothing pushed. Served build not yet rebuilt/restarted — the two commits are code-level; a rebuild + served verification belongs to the next interval's arrow-close work.

## STRANDING

**0.** Interval 05 cleared 26 → 0. No new stranded implementations this interval: all harvest work was read-only, no code written from external sources.

## TRUTH

No new semantic authority created. Falsification results: intent-routing root cause CONFIRMED; dump.py 0600 CONFIRMED; dump.py pg path CONFIRMED; missing demo journal FALSIFIED; PING staleness REPRODUCED; Mission Control blocked-state/orphan-sweep CONFIRMED GAP; Talos "dual gating" CLARIFIED (policy-decide + mint-recheck doubling, no second gate file — no writer should hunt for it); AgentArk self-rewrite ABSENT at pinned commit. The scoper's interaction note stands: dump.py cannot run for ping-fyd (not in its fixture map) and the Ask seam deliberately never reads its output — no collision between the two writer lanes.

## PRODUCT

The owner-visible changes this interval: (1) "Does PING offer website design?" now gets an honest unknown instead of a phone-number dump — the Ask honesty layer no longer leaks contact info through a routing defect. (2) The dump.py acquisition lane's two live environment defects are fixed, and demo mode is verified end to end. Everything else is ranked scope for next interval: the P0 arrow-close proof, the acquisition rebuild, and the two authorized harvest primitives.

## Pending owner decisions

1. **Media-pipeline schema (3 dual-nature manifests).** Smallest explicit choice: (a) split each manifest into an evidence-side record (sourceUrl, observedAt, digest, rights, acquisition outcome) and a projection-side record (generator, ingest run, FYD media ID, roles, lifecycle, variants), joined by shared asset digest; or (b) keep one manifest file with two namespaced sections (`evidence:` / `projection:`) under one digest. Recommend (a): it enforces the rubric mechanically (evidence records can never become renderer state). Owner picks; no silent integration until then.
2. **PING source list + provenance vocabulary** for the acquisition rebuild: which sources are authoritative (tenant config vs website vs both) and which provenance kinds re-derived facts carry. The writer produces the candidate refreshed graph + diffTwin diff as review artifacts before any pin swap.
3. **Harvest pair ordering**: P1 (turn-origin tagging) + P2 (outcome ledger) are authorized for next interval; Nolan may reorder (e.g., prefer the MatrixClaw orphaned-run fail-closed or the Talos receipt-text rule) before writer dispatch.
4. Standing, unchanged: credential containment + any CRX history remediation; Happy Place accidental local commit `f21ba933`; corrupt ref `fyd/builder-rebuild-v1`.

## Falsification probes for next interval

- Arrow-close proof per the directive: owner corrects fact, owner hides fact, owner explicitly publishes address, owner changes section priority, regeneration occurs, source re-observed, owner intent survives — with the precedence candidate tested, not constitutionalized.
- Acquisition rebuild: candidate refreshed graph + diffTwin diff reviewed before pin swap; owner-layer digest equality machine-checked.
- Served verification: rebuild + restart served :3100 on `a62fd1da`, re-run the Ask contract suite against the live build.
