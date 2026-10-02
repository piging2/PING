# L5-DOOR: Vocabulary-Survivor Decision Brief + Approval-Surface Spec
**Lane:** L5-DOOR (owner-intent pipeline) | **Date:** 2026-09-29 ~06:00 MDT (sprint T+1:00)
**Working line:** Pig `/home/nolan/projects/ping` @ `fyd/builder-harvest-trackc-2026-09-28` @ `f877c391`
**Scope:** OWNER CORRECTION → CONVERSATIONAL CUSTOMIZATION → APPROVAL. Specs and briefs only. No wiring, no picks made unilaterally.

---

## 1. VERIFICATION RESULTS (read-only; all claims checked on the working line)

### 1a. The three vocabularies — CONFIRMED with corrections

**F1 / proceduralize (the LIVE vocabulary).** `src/fyd/proceduralize/patch.ts`:
- `SiteIntent`: 7 op kinds — reorder_section, toggle_section, set_featured, reorder_object, deactivate_object, edit_copy, set_theme_token.
- `SitePatchBody`: `{ kind: "site_patch", proposalDigest, targetPage, targetSection, component, propsDiff }`; digest = sha256 over canonical JSON minus volatile keys.
- `proposeSitePatch` / `applySitePatch` (apply is pure, returns new spec).
- The LIVE route `src/app/api/fyd/customize/route.ts` (parse/approve/clear, 685 lines) consumes it via `src/fyd/customize/propose.ts` (`proposeFromSiteIntent`), guarded by `write-boundary.ts` (runIdempotentWrite, canonicalPayloadDigest, replay/conflict/rejected/unknown) and `server.ts` (emitOverlayEvent, FYD-037 journal identity pre-flight → typed WRONG_JOURNAL, stale-guard re-verified → 409 STALE_APPROVAL / PRECONDITION_CHANGED).
- CORRECTION to baseline: the baseline attributed the "typed 10-op vocabulary" (fdb5d3f3) and the staged pipeline (47ea5b26) to F1/proceduralize. Both commits touch **only** `src/fyd/sitepatch/`. F1's own op count is 7, not 10.

**F2 / Ask-shaped.** `src/fyd/ask/site-patch.ts`:
- 3 intents: reorder_services_first, feature_object, professionalize (+ typed refusal paths: no spec in context, no site.propose grant, no match).
- Drafts `AskProposal` (kind: "site_patch") with `SitePatchOperation[]` carrying before/after diffs (e.g. op "reorder_section_objects"); `signSitePatchDraft` / `verifySignedSitePatchDraft`; `buildSitePatchCard` → `SitePatchCard`.
- CORRECTION to baseline: the claim "NOTHING consumes sitePatchCard; drafts die at the card" is STALE. `src/fyd/ask/answer.ts` calls detect → draft → buildSitePatchCard; the card rides in the `AskAnswer` type (`src/fyd/ask/types.ts`) and is traced by `src/fyd/lineage/tracer.ts`. What is TRUE: nothing RENDERS the card (no UI references SitePatchCard) and nothing forwards an F2 proposal into the customize approve path — F2's shapes (before/after diffs) do not match F1's `SitePatchBody`, and no converter exists.

**F3 / Lane-D keyword path.** `src/fyd/customize/intent.ts` + `owner-command-compiler.ts`:
- `intent.ts`: ~10 keyword regex patterns → 5 `ParsedIntent` kinds (promote_first, feature_object, hide_section, show_section, hide_object); unmatched → honest `UnsupportedIntent` (never silently reinterpreted). This is what the LIVE route parses.
- `owner-command-compiler.ts`: 9 `OwnerIntent` kinds (4 classic reusing Lane D shapes + promote_action, show_locations, hide_fact, show_fact, remove_social_link) with `classicIntentOf` bridge back to ParsedIntent. Consumed only by the orphaned console, owner-proposal, and tests — NOT by the live route.
- CORRECTION to baseline: "10 intents" is the pattern count, not the kind count (5 in intent.ts, 9 in the compiler).

**Three-layers law** — CONFIRMED frozen in `src/fyd/customize/types.ts` header: FACTS (never written by intent pipeline) / PRESENTATION INTENT (journaled directives, applied OVER the spec at render time via apply-layer.ts, pure) / DESIGN SYSTEM (refused, never coerced). `apply-layer.ts` confirmed present.

### 1b. sitepatch/v1 convergence layer — CONFIRMED orphaned, but NOT "design-record only"

- `src/fyd/sitepatch/`: `types.ts` (10 ops — MOVE_SECTION, ADD_SECTION, REMOVE_SECTION, SET_VISIBILITY, SET_FEATURED_OBJECT, SET_DESIGN_TOKEN, SET_PRESENTATION_COPY, ADD_PAGE, REMOVE_PAGE, CHANGE_QUERY — **not 13**; baseline's "13 canonical ops" is FALSIFIED), `SITE_PATCH_OP_MAP` with ADOPT/ADAPT/REFUSE dispositions ("nothing here duplicates an existing implementation"), `pipeline.ts` (663-line staged pipeline PATCH→VALIDATE→CAPABILITY→PREVIEW→APPROVAL→EVENT→NEW SPEC VERSION, composes live `proposeSitePatch`/`applySitePatch` and `SetPresentationIntentOp`), `approval-seam.ts` (adapter emitting Phase-1 OwnerProposal shape; header states BINDING STATUS: PENDING, decision belongs to the Phase-1 gate alone, records marked `seam: "trackc-sitepatch/pending-phase1-binding"`), 16 tests (f877c391).
- **Zero external importers** of pipeline/approval-seam/types (grep over src, excluding self). CONFIRMED unwired.
- **No `SITEPATCH_V1.md` exists anywhere in the repo** (find over the tree). Baseline's citation is FALSIFIED or refers to an uncommitted doc.
- Correction: the layer is a real, tested implementation (663-line pipeline + 16 green tests), not a design record. "Orphaned" is accurate; "design-record only" is not.

### 1c. demo-owner-console — CONFIRMED orphaned, no route

- `src/fyd/owner-mode/demo-owner-console.tsx`: zero importers, mounted on no route. Six tabs (OBJECTS/CONTENT/VISIBILITY/SITE/ASK FYD/EVIDENCE), honest demo-owner banner, plain-words language rule.
- It drives a DIFFERENT stack than the live route: owner-command-compiler (9 kinds) + `src/fyd/customize/owner-proposal.ts` (drafted→approved→applied lifecycle, replayOwnerJournal, ownerStateDigest). `owner-proposal.ts` has exactly ONE importer: the console.
- Its `ProposalStatus` has NO denied/rejected terminal — a terminal-first gap.

### 1d. Journal / authority — CONFIRMED

- FYD journal gateway default `http://127.0.0.1:18199/events` (`src/fyd/customize/server.ts:87`); FYD-037 pre-flight asserts the live-derived identity marker before any POST → typed WRONG_JOURNAL, zero POSTs on mismatch.
- Demo-owner authority: `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` + private-host gate; banner "DEMO OWNER MODE - not real authentication". OwnerIdentityProvider seam UNBOUND (no production provider).
- KEY GAP CONFIRMED: approve→serve is NOT automatic — journaled-but-unserved until manual `FYD_OVERLAY_JOURNAL=demo python3 tools/fyd-site-projection/dump.py`. This is L6's seam; approve side is mine.

---

## 2. VOCABULARY-SURVIVOR DECISION BRIEF (for Nolan — one decision, one sitting)

### What each candidate owns today

| | F1 (proceduralize + customize route) | F2 (ask/site-patch) | sitepatch/v1 |
|---|---|---|---|
| Op count | 7 (snake_case) | ~1 op shape w/ before-after diffs | 10 (UPPER_SNAKE) |
| Intent front end | F3 intent.ts, 5 kinds, keyword-anchored | 3 Ask intents, keyword-anchored | none (takes typed ops) |
| Approve path | LIVE: parse→propose→write-boundary→stale-guard→journal event | none (card only) | staged pipeline, UNWIRED |
| Idempotency | request_id + digest → replay / 409 conflict | none | gate-level already_decided |
| Journal | FYD_SITE_OVERLAY events, FYD-037 pre-flight | none | reuses FYD_SITE_OVERLAY shape |
| Terminal law | replay/no-redecision (live) | none | already_decided/digest_mismatch/expired |
| Proof | owner loop GREEN twice (2026-09-24, 2026-09-28); 67 tests green today | Ask pipeline only | 16 unit tests, no live run |
| Authority | demo-owner gate, honest banner | site.propose grant check | Phase-1 gate (BINDING PENDING, not ours to accept) |

### Unification cost per survivor

**If F1 survives (RECOMMENDED):**
- Change: ONE new adapter file F2→F1 (convert F2's SitePatchOperation before/after diffs into F1 SiteIntent; F2's card signature travels as the evidence ref). F2's detect/draft/card become the proposal SURFACE; F1's route stays the approval CORE. sitepatch/v1 stays as the convergence RECORD (its OP_MAP is the reconciliation table) and its staged pipeline becomes a future L6 regen-seam consumer; approval-seam stays PENDING until the Phase-1 coordinator accepts the binding.
- Breaks: nothing live. The two green owner loops are untouched.
- Cost: ~1 adapter + spec (this brief's §3). Smallest diff, zero re-proof.

**If F2 survives:**
- Change: F1's route must learn F2's AskProposal/Card shapes (before/after diffs ≠ SitePatchBody); F2 needs a journal writer, idempotency ledger, stale-guard, FYD-037 pre-flight, demo-owner gate — all built from zero.
- Breaks: the only proven approve path; both green owner loops must be re-proven end to end.
- Cost: high. Rebuilds guarantees F1 already has, mid-sprint.

**If sitepatch/v1 survives:**
- Change: wire pipeline.ts into (or above) the route; resolve the Phase-1 binding — which belongs to another coordinator and is explicitly PENDING.
- Breaks: nothing in F1 if it sits above as a staged wrapper, but every proven guarantee (stale-guard, idempotency, FYD-037) must be re-proven THROUGH the new pipeline; the UPPER_SNAKE↔snake_case mapping must be exact or the digest law forks.
- Cost: medium-high, and BLOCKED on an external binding decision.

### Recommendation (evidence-backed)

**F1 survives as the ONE SitePatch type.** Reasons: (1) it is the only vocabulary with a proven end-to-end owner loop, green twice, with all fail-closed properties proven in code and re-verified today (67/67 tests); (2) sitepatch/v1 was DESIGNED to compose F1's machinery — its own OP_MAP states "nothing here duplicates an existing implementation," i.e. it is a convergence record over F1, not a replacement; (3) F2's natural role is the proposal SURFACE (it already produces signed, evidence-carrying cards in the Ask flow) — the missing piece is a converter, not a vocabulary swap; (4) at sprint T+1:00, swapping the vocabulary orphans the only journaled, idempotent, stale-guarded approve path and forces re-proof of everything. The pick remains Nolan's; if he picks otherwise, this brief's cost table is the migration plan.

**Do NOT wire the survivor now** (per tasking): the pick is one decision, one sitting, by Nolan.

---

## 3. ONE APPROVAL SURFACE SPEC (vocabulary-agnostic; no wiring)

Per convergence matrix §14-15: an Ask/proposal renders as ONE DECISION, ONE SENTENCE, ONE EVIDENCE LINK, APPROVE or DENY.

### 3a. Surface contract

Every proposal, regardless of source vocabulary, is projected onto one abstract shape before it reaches the surface:

```
ProposalView {
  proposalId: string            // stable id for this draft
  sentence: string              // ONE sentence, plain words, no jargon
  evidenceRef: string           // ONE link: before/after, spec digest, who/when
  proposalDigest: string        // sha256-canonical-json-v1 over the proposal bytes
  baseDigest: string            // digest of the spec/base the proposal was drafted against
  source: "f1" | "f2" | "v1"    // which vocabulary produced it (provenance, not behavior)
  expiresAt: string             // decision deadline; past it the proposal is unapprovable
}
```

The surface shows: the sentence, the evidence link, and exactly two actions: APPROVE | DENY. Nothing else on the decision surface. Vocabulary adapters (F1 SitePatchBody → ProposalView, F2 SitePatchCard → ProposalView, v1 SitePatchOp → ProposalView) are pure functions; the approval core never sees op vocabularies.

### 3b. APPROVE → typed evidence-marked transition

APPROVE emits exactly one transition record, immutable once written:

```
ApprovalTransition {
  decision: "APPROVED",
  proposalId, proposalDigest,
  identity: string,             // demo-owner actor today; OwnerIdentityProvider when bound
  identityBinding: "demo-unverified" | "verified",
  evidenceRef: string,
  preHash: string,              // baseSpecDigest at decision time
  postHash: string,             // layeredSpecDigest after application
  requestId: string,            // idempotency key, minted server-side
  decidedAt: string,
  authority: string             // which gate decided (demo-owner today; phase1 when bound)
}
```

Preconditions (ALL must hold or APPROVE is refused, fail-closed):
1. `proposalDigest` present and verifies against the proposal bytes (re-derive; byte-for-byte).
2. `baseDigest` still matches the current base (stale-guard; else 409 STALE_APPROVAL / PRECONDITION_CHANGED).
3. Source is bound (demo-owner gate or verified identity; unbound source = DENY).
4. Not expired; not already decided (terminal-first: post-terminal → ALREADY_DECIDED, never re-decided).

### 3c. DENY / timeout → state untouched + journaled denial

- DENY writes a `DenialRecord { decision: "DENIED", proposalId, proposalDigest, identity, evidenceRef, reason?, decidedAt }` to the journal and changes NO other state. (GAP, §4.4: the existing path has no denial action — owner denial today is just "never approve." The spec adds it.)
- Timeout is TWO layers, and they must not be confused:
  - **Decision layer:** a proposal the owner never decides before `expiresAt` → treated as DENY (reject-by-default; Codex harvest pattern). No approval without a recorded decision. Ever.
  - **Write layer:** a journal POST whose outcome is unknown (timeout/lost response) → UNKNOWN (504 unknown_outcome), NEVER failed, NEVER retried as a new write — retry reuses the same request_id and the idempotency ledger resolves it. ("Timeout never means failed" — changing this risks double-apply or lost-apply misreporting. The existing write-boundary semantics are CORRECT and must be preserved.)
- Missing digest, unbound source, or expired proposal at decision time = DENY, fail-closed, journaled.

### 3d. F2 sitePatchCard → customize approve-path continuity (vocabulary-agnostic)

The missing link is a pure converter, specified here, not wired:

```
F2 SitePatchCard (signed draft, before/after op diffs, evidenceReason)
  → convertToProposalView(): ProposalView        // the ONE surface renders this
  → convertToSiteIntent(): SiteIntent (F1)       // only for F1-shaped ops
       (reorder_section_objects w/ before+after → reorder_object w/ objectIds=after;
        feature_object → set_featured; professionalize → edit_copy or typed refusal)
  → existing F1 approve: proposeFromSiteIntent → write-boundary → stale-guard → journal
```

- The card's existing signature (`signSitePatchDraft`) travels as the `evidenceRef` — F2's signing is an asset, keep it.
- Ops with no F1 equivalent (e.g. `professionalize` if it means arbitrary restyle) → typed refusal at conversion, never coerced. The three-layers law (design system refused, not coerced) holds across the converter.
- The converter is vocabulary-agnostic in the other direction too: when/if v1 wires up, v1 ops project onto the same ProposalView through the ADOPT/ADAPT/REFUSE map.

### 3e. Terminal-first law on the surface

Proposal lifecycle: DRAFTED → APPROVED | DENIED | EXPIRED. APPROVED/DENIED are immutable historical truth. A later observation (stale base, regen, re-ask) never reinterprets them: re-approve of an APPROVED proposal → ALREADY_DECIDED; re-deny of a DENIED proposal → ALREADY_DECIDED. STALE_SUPERSEDED applies ONLY to a still-pending (DRAFTED) proposal whose base became invalid. (Note: the live route speaks this law today as idempotency replay/conflict; v1 speaks it as already_decided; the surface spec standardizes on ALREADY_DECIDED / STALE_SUPERSEDED per the standing law.)

### 3f. Harvest lineage (named patterns, as tasked)

- **Codex typed review gate** → the surface's verdict is typed `{ APPROVE | DENY, evidenceRef, decidedBy, decidedAt }`, timeout rejects by default at the decision layer.
- **Lane C draft/preview/apply** (`owner-proposal.ts`: drafted/approved/applied + replayOwnerJournal) → the surface's state machine; extended with the missing DENIED/EXPIRED terminals. The console's SITE tab is the design reference for the flow; it is NOT the implementation (see §5).

---

## 4. FALSIFICATION RESULTS (existing F1 path, no new wiring)

All run 2026-09-29 ~06:00 MDT on the working line, Pig, read-only.

| Criterion | Result | Evidence |
|---|---|---|
| Stale/tampered proposals → 409 | PROVEN | `stale-guard.test.ts`: drifted base → STALE_APPROVAL, rebased digest → PRECONDITION_CHANGED, op-count change → PRECONDITION_CHANGED, authority swap → PRECONDITION_CHANGED — all with ZERO writes; route maps StaleGuardError → 409. Suite 40/40 green (with write-boundary suite). |
| Timeout → reject | PARTIALLY FALSE, by design | Journal POST timeout → UNKNOWN (504 `unknown_outcome`), never failed, never re-decided: "Timeout never means failed" (`server.ts:205-214`, `write-boundary.ts:17-18`). The owner-facing DECISION layer has no timeout today. The spec (§3c) puts reject-by-default at the decision layer and KEEPS unknown-at-write-layer — these are compatible, not contradictory. Do not "fix" by rejecting at the write layer. |
| Deny (parse-without-approve) → zero state change | PROVEN | `handleParse` (route.ts:225-278) is pure read + draft: parse → resolve → propose → return proposal + reviewCard. No `emitOverlayEvent`, no journal POST, no mutation. |
| Journal records approvals AND non-approvals | PARTIALLY FALSE — real gap | Approvals ARE journaled (FYD_SITE_OVERLAY events, FYD-037 pre-flighted). Non-approvals (unsupported 400 / unresolved 422 / no_op 422 / rejected writes) return typed responses with local `diag` only — no journal records. Owner DENY has no route action at all. The spec (§3c) adds journaled DenialRecords. |
| One source byte changed → digest changes | PROVEN | tsx probe on `proposeSitePatch`: identical input → identical digest; `toIndex` 0→1 (one field) → digest differs. sha256-canonical-json-v1 avalanche + approve-time byte-for-byte re-derivation. |
| Terminal-first holds | PROVEN (two dialects) | Live: same request_id + same digest → `replayed` (original result, no new event); same request_id + different digest → 409 `idempotency_conflict` — a terminal outcome is never re-decided. v1: `verifyGateDecision` → `already_decided` on double decision (test, 16/16 green). Spec standardizes on ALREADY_DECIDED. |

Test totals today: customize suites 51/51 (stale-guard + write-boundary 40, e2e 11), sitepatch pipeline 16/16.

---

## 5. CONSOLE RECOMMENDATION: formally FREEZE the demo-owner-console — do NOT mount it

**Recommendation: FREEZE.** Do not mount on a route. Reasons:

1. **It drives a second, unproven approval lifecycle.** The console's SITE tab runs owner-command-compiler (9 OwnerIntent kinds) + owner-proposal.ts (drafted→approved→applied) — a DIFFERENT stack from the live, twice-green route (intent.ts 5 kinds + propose + write-boundary + FYD journal). Mounting now creates two approval authorities beside each other, directly against the ONE-approval-surface goal (§3) and the Constitutional Rule of One.
2. **Terminal-first gap:** its `ProposalStatus` has no DENIED/REJECTED terminal.
3. **Mounting is new wiring**, explicitly out of scope for this lane and for tonight's read-only-until-pick posture.
4. **Freeze mechanics:** add a `FROZEN` header to `demo-owner-console.tsx` + `src/fyd/customize/owner-proposal.ts` (whose only importer is the console) stating: frozen pending Nolan's vocabulary pick; the SITE tab's draft→preview→approve→apply flow is the DESIGN REFERENCE for the §3 surface, not an implementation. Keep `owner-command-compiler.ts` unfrozen (tests + `classicIntentOf` bridge). Revisit after the pick: either the console becomes the §3 surface's UI (if its lifecycle is adopted) or it is deleted.

---

## 6. OPEN QUESTIONS / FOLLOW-UPS FOR THE COORDINATOR

1. **Nolan's pick** (the one decision this brief exists for): F1 survives (recommended) / F2 / v1. Nothing wires until he picks.
2. **Denial journaling** (§4.4 gap): needs a new journal event type for DenialRecord — a small schema addition on the journal side; flag for whoever owns the journal schema.
3. **Phase-1 binding** stays PENDING and belongs to the Phase-1 coordinator; L5 does not touch it.
4. **Approve→serve gap** (journaled-but-unserved until manual dump.py) is L6's seam; noted, not touched.
5. Baseline corrections for the record: F1 has 7 ops (not 10); the "10-op vocabulary" and staged pipeline are sitepatch/v1's (fdb5d3f3, 47ea5b26); v1 has 10 ops (not 13); no SITEPATCH_V1.md in repo; sitePatchCard IS consumed inside the Ask pipeline (just never rendered or approved).

**Verdict: brief delivered, surface spec'd, falsification run. Awaiting Nolan's vocabulary pick. No code written, no wiring done, nothing pushed.**
