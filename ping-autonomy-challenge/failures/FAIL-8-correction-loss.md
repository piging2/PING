# FAIL-8: CORRECTION LOSS - mechanism hunt

**Failure class:** owner corrections silently lost on regeneration or source change (overwritten by re-acquired source data, or dropped because the correction was not anchored to anything stable).
**Date:** 2026-09-23. **Mode:** research only. No implementation.

## (a) Grounding: the real instances

The general shape: a later pipeline stage (regeneration, re-acquisition, re-dump) clobbers an earlier human judgment because the judgment had no durable, re-appliable identity separate from the data it corrected. The correction lived in the same layer as the source data, so refreshing the source refreshed the correction away.

**Real instance 1: the correction proof as the commercial gate (memory/2026-09-22.md L1647, L1700; memory/2026-09-21.md L1464).** The fixed product proof was ordered: real business -> Ask FYD -> evidence -> owner correction -> regeneration -> correction survives. The design rule recorded alongside it: "Source observations remain immutable; owner corrections and visibility overrides are stronger/newer evidence and projection policy, not rewritten history." And the commercial framing: "'source says X' and 'owner says Y' coexist; correction creates stronger owner evidence/override without erasing history." Correction loss was treated as the proof that had to be passed before one real owner, not as an edge case.

**Real instance 2: the three recorded corrections (STEP-06-OWNER-CORRECTION.md, 2026-09-23).** Three demo-owner decisions were recorded through the real endpoint (`POST /api/fyd/objects/happy-place/overrides`) and persisted in `data/fyd-owner/happy-place.json`: `owner.corrected-fact` (phone: effective `+1 541 555 0147`, source retained `+15412865190`), `owner.confirmed-fact` (email `taylor@happyplacecarpentry.com`), `owner.hid-fact` (service `website-service-51de038c1defe8bd`, "Pergola Design Consultations", visibility false). The approval was bound to `baseStateDigest`, `baseViewDigest`, and `patchDigest`; omitting `baseViewDigest` failed with `approval_not_bound`. The correction was already a typed, digest-bound, anchored record, not a text edit.

**Real instance 3: the simulated re-dump (STEP-07-CORRECTION-SURVIVES-REGEN.md, 2026-09-23).** A re-dump was simulated by rewriting the source projection with the business phone changed to `+15419998888` and recomputing the graph digest, without touching the owner store. Observed: the owner phone `+1 541 555 0147` was still effective; the Pergola service stayed hidden; the page displayed all three layers with the drift warning: "The source was re-observed after this correction and now says +15419998888 instead of +15412865190. The owner's value still stands." The proven conclusion: "Owner store is the system of record for decisions; the projection is the system of record for observations. A re-dump changes the source layer only; it cannot erase the owner layer."

**Real instance 4: the near-miss inside the passing test (STEP-07 defect).** The drift flag existed, but the overlay overwrote `fields[]` with the owner value while keeping only the stale `sourceValue` snapshot: the UI said the source had changed without saying WHAT it changed to. The source's current value was destroyed at composition. Fixed by adding `currentSourceValue` as a read-model derivation (never stored) attached per read by `applyOwnerFieldCorrections`. This is the class in miniature: even a system designed to preserve corrections nearly collapsed two values into one at the composition seam, and only a test asserting the new source value was visible caught it.

**Real instance 5: the standing conflict policy (memory/2026-09-22.md L1703).** "A later source contradiction must raise `SOURCE_CHANGED_AGAINST_OWNER_ASSERTION` and offer keep mine / accept source / inspect rather than silently overwriting owner intent. Fact and visibility remain separate dimensions." The policy names the failure explicitly: silent overwrite of owner intent is the thing that must not happen, and the replacement is a typed conflict state with named resolutions.

General shape confirmed: human judgment entered the pipeline without its own durable identity and storage, so a later stage's refresh semantics (re-dump, re-acquire, regenerate) treated the judgment as stale source data and clobbered it. Everything below is judged against that shape.

## (b) Surviving mechanisms

Hard rule applied: a candidate survives only if it prevents at least 2 of the 9 failure classes, with a crisp reason per class. Each survivor gets a falsifiable test.

---

### Survivor 1: Typed owner-correction patches anchored to stable object/field identity, stored in a dedicated decision store, re-applied on every read

**How it works.** A correction is never an edit to the source layer. It is a typed record (correct-fact, confirm-fact, hide-fact) carrying the stable identity of its target (object id + field path), the owner value, a snapshot of the source value it was made against, actor and timestamp, and an approval bound to the base digests (baseStateDigest, baseViewDigest, patchDigest). Corrections live in a dedicated owner decision store, one tenant-local file per business in the real system (`data/fyd-owner/<business>.json`). The read seam composes the effective value on every serve: source layer plus decision-store overlay, producing the three named values (owner says / source said at correction time / source now says). Regeneration and re-dumps write only the source layer; they cannot address the decision store, so they cannot erase a correction. Identity anchoring (not value matching) is what lets the patch re-find its target after the source value changes.

Wave-1 cross-check: this is the same identity discipline as LANE-1's stable work-order identity (`work_order_id = sha256('work-order:' + objectiveId + ':' + taskKey)`, a restart rediscovers the same work order), applied to human judgments instead of work orders.

**Prevents 4 classes:**

- **#8 correction-loss:** the correction never lives in the source layer, so no re-dump or regen can overwrite it; the read seam recomposes effective values from source plus decision store on every serve, so losing a correction would require deleting the decision store itself, which is a named destructive action, not a pipeline side effect.
- **#6 visibility-error:** hide decisions use the identical patch machinery (`owner.hid-fact`); visibility for presentation lives in the decision layer and is applied at every read, so a hidden fact stays suppressed across regen instead of leaking the moment the source re-emits it (Step 7 proves hide survives the same way corrections do).
- **#9 conflict-collapse:** the patch records the source value it was made against without replacing it, so "source says X" and "owner says Y" remain two named, simultaneously visible values; source drift raises a typed conflict rather than collapsing to a single value (Instance 4 shows even the composition seam had to be fixed to keep both values visible).
- **#5 claim-binding:** every patch is typed with actor, timestamp, and digest-bound approval, so a corrected rendered claim carries its evidence (who asserted it, when, against what base); the three-value display makes provenance visible at render instead of asserted silently.

**Falsifiable test.**

- Input: a fixture graph with a business object (phone field) and a service object; record an owner phone correction and an owner hide of the service through the real override endpoint; then simulate a hostile re-dump: change the source phone, delete the hidden service from the source fixture entirely (the worst case: the anchored object vanishes), and recompute digests. Do not touch the owner store.
- Procedure: serve the site fresh with no code changes; read the effective phone, the site payload's service list, and the three-layer display; inspect the owner store file bytes before and after.
- Expected observable outcome: effective phone equals the owner value; the hidden service is absent from the site payload; the drift warning names both the old and the new source values; the owner store file is byte-identical; the dangling hide patch either stays honored or raises a named "correction target missing" state, never silently dropped and never resurrecting the object.
- Proves the mechanism DOESN'T work: if after the re-dump the effective phone is the new source value, or the hidden service reappears, or the owner store was mutated by the re-dump, the patch was not independent of the source layer; the "dedicated decision store" is decorative and the mechanism is falsified.

---

### Survivor 2: Three-way merge on regeneration (base source, new source, owner overlay; owner wins ties by policy; drift emits a typed conflict)

**How it works.** Regeneration is not "new source replaces old output." It is a merge of three inputs: the base source (what the last regen saw), the new source (what re-acquisition found), and the owner overlay (the decision store from Survivor 1). The merge first diffs base against new, then resolves field by field: fields with no owner decision take the new source value; fields with an owner decision keep the owner value by policy, and if the new source disagrees with the recorded source snapshot, the merge emits `SOURCE_CHANGED_AGAINST_OWNER_ASSERTION` instead of choosing silently. The event carries the old value, the new value, and the three named resolutions (keep mine / accept source / inspect). "Owner wins" is a policy, not a default: it is written down, it applies only to ties on owner-decided fields, and the contradiction is preserved as a first-class state either way.

**Prevents 3 classes:**

- **#8 correction-loss:** the merge treats owner-decided fields as already resolved; the new source can contest them but can never overwrite them silently, because an overwrite would require winning a conflict that the owner is guaranteed to win by policy.
- **#9 conflict-collapse:** when the new source contradicts an owner assertion, the merge emits the typed conflict event with keep/accept/inspect options, preserving both values as a first-class conflict state instead of collapsing to one.
- **#4 fixture-drift:** base versus new source are diffed as the merge's first step, so every change is a named event; nothing about regeneration is silent, and the drift warning names the old and new values side by side.

**Falsifiable test.**

- Input: base source with phone A; new source with phone B; an owner correction recording phone C against base A.
- Procedure: run the regen merge; inspect the merged effective value, the event log, and the owner-facing surface.
- Expected observable outcome: effective value is C; a `SOURCE_CHANGED_AGAINST_OWNER_ASSERTION` event exists naming A and B; the owner surface offers keep mine / accept source / inspect with all three resolutions functional.
- Proves the mechanism DOESN'T work: three falsification modes, any one of which kills it. (1) Effective is B with no event: silent overwrite, which is #8 and #9 failing together. (2) Effective is B with the event but no working resolution path: the conflict was detected and then collapsed into source-wins anyway. (3) Effective is C with no record that B ever existed: the contradiction was collapsed into owner-wins with no trace, which is #9's failure shape with the polarity flipped. A merge that cannot show all three of its inputs in its output is not a three-way merge.

---

### Survivor 3: Correction survival tests (golden set of corrections asserted against rendered effective output after every regen)

**How it works.** A golden set of corrections (correct, confirm, hide, anchored to fixture object identities) is recorded once against fixtures and asserted after every regeneration, against the rendered effective output, not against the owner store. The suite checks: the corrected value is effective on the page; the confirmed value is unchanged; the hidden object is absent from every public payload including serialized client graphs; the three-layer display names the right values when drift was injected. The suite runs as a gate on the regen pipeline itself: a regen that breaks the suite is a failed regen, not a shipped page. The key design choice is the assertion target: asserting the store would pass while the page lies; asserting rendered output pins the outcome the owner was promised.

**Prevents 3 classes:**

- **#8 correction-loss:** the suite pins the effective outcome, not the mechanism's intent; any regen that drops, mis-anchors, or mis-resolves a correction fails the build, so loss cannot ship silently.
- **#3 graph-blindness:** corrections are anchored to object identity, so if re-acquisition's extractor silently drops an entity, the anchored correction dangles and the suite fails; an invisible acquisition regression becomes a loud build failure, because the golden set doubles as an object-roster check.
- **#4 fixture-drift:** the suite asserts rendered effective values after every regen, so any unannounced output change, corrected field or not, fails loudly instead of landing silently on the page.

**Falsifiable test.**

- Input: the golden suite plus a regen harness with two sabotage modes: (a) an extractor change that silently drops one entity type from re-acquisition; (b) a corrupted read path that skips the overlay step (simulating the Step-6 presentation boundary hole, where one consumer never got the overlay).
- Procedure: run regen under each sabotage mode, then run the golden suite; separately, verify the suite is actually wired as a regen gate rather than a manual script.
- Expected observable outcome: the suite FAILS loudly in both sabotage modes, naming the lost correction and the dangling anchor; the regen pipeline refuses to ship on suite failure.
- Proves the mechanism DOESN'T work: if the suite passes while a correction is observably lost on the rendered page (it asserts store contents instead of rendered output, or its fixtures no longer match the live schema), the suite is testing the wrong layer. If the suite can be skipped by running regen without it (not wired as a gate), it is a manual ritual, not a mechanism. Either way it is falsified.

---

### Survivor 4: Source-change diffing as a first-class regen artifact (base-to-new diff; re-verify only changed fields; vanished and new objects named)

**How it works.** Before any merge or re-verification, regeneration computes the diff between the base source and the new source as a durable artifact: per-field changes (old value, new value), added objects, vanished objects. Downstream stages consume the diff, not the raw new source. Re-verification and re-asking are scoped to changed fields only; unchanged fields, and every correction anchored to them, are provably untouched because no code path rewrites a value the diff did not mark changed. Vanished objects produce a named "object vanished from source" event rather than silent removal, which turns the diff into an acquisition-regression detector.

**Prevents 3 classes:**

- **#8 correction-loss:** corrections on fields the diff shows as unchanged are untouched by construction; the regen has no code path that rewrites values it did not diff as changed, so the correction's survival does not depend on the merge policy getting every case right.
- **#4 fixture-drift:** the diff is itself the drift record; regeneration cannot change output without the diff naming the change, so silent drift is impossible by construction rather than by vigilance.
- **#3 graph-blindness:** the diff compares the expected object roster against the re-acquired roster, so an extractor that silently drops entities produces a named vanished-objects list, catching acquisition regressions at regen time instead of at owner-complaint time.

**Falsifiable test.**

- Input: a base fixture and a new fixture where exactly one field changed (phone), one object was added, and one object vanished; an owner correction sits on an unchanged field (email).
- Procedure: run regen; inspect the diff artifact, the set of fields re-surfaced for verification, and the effective email on the rendered page.
- Expected observable outcome: the diff names exactly the changed phone, the added object, and the vanished object, with old and new values; only the phone is re-surfaced for re-verification (email is not); the effective email still equals the owner value; the vanished object produces a named event rather than silent removal.
- Proves the mechanism DOESN'T work: if the diff misses the vanished object (silent removal, meaning the graph-blindness detector is blind), or if re-verification is requested for unchanged fields (the diff exists but does not scope work), or if the correction on the unchanged email field is lost despite the field being untouched (the overlay logic does not consult the diff), the mechanism is falsified. A diff that nobody reads is documentation, not a mechanism.

---

## (c) Cut list

Each candidate below was judged against the hard rule (must prevent at least 2 of the 9 classes). All fail it, each for one stated reason.

- **Owner-wins-always (unconditional overwrite, no conflict state).** CUT: prevents #8 only; it collapses the source contradiction into the owner value with no record of the source's new claim, which is #9's failure shape (conflict-collapse) with the polarity flipped. A mechanism that fixes #8 by guaranteeing #9 cannot pass the >=2 rule.
- **Last-writer-wins on the merged record.** CUT: this is the failure, not a mechanism; whoever writes last wins silently, which guarantees #8 whenever the write order is source-last. It prevents nothing.
- **Append-only correction history with no re-application.** CUT: a log is a museum, not a guard; history records what was lost but no read path re-applies it, so it prevents nothing, including #8. Memory's "without erasing history" only helps when paired with a re-applying overlay (Survivor 1).
- **Deterministic full re-render with no owner layer.** CUT: determinism reproduces whatever the inputs say; a deterministic re-acquire-and-overwrite pipeline loses corrections deterministically and on schedule. It prevents #4 (same inputs, same outputs) but says nothing about #8.
- **Post-render snapshot diffing (compare rendered pages before and after regen).** CUT: a detector, not a preventer; it reports loss after it happened and alarms on #4 only. It stops nothing, creates no anchor, emits no conflict state, and offers no policy for #8 or #9.
- **Freezing the source (never re-acquire after first observation).** CUT: prevents #8 by abolishing regeneration, but the product requirement is source-refresh merge (memory/2026-09-22.md L1700: "source re-observation without destroying owner intent"). Freezing guarantees stale data (#4's cousin) and lets stale claims persist unchallenged (#5). Fails >=2 honestly and kills the feature it claims to protect.
- **Re-asking the owner about every field after every regen.** CUT: non-scalable and non-deterministic; owner attention is finite, so in practice it degrades to re-asking about nothing or to the owner rubber-stamping. Prevents #8 only when the owner answers; covers no other class; not a mechanism.
- **Approval digest binding alone (baseStateDigest/baseViewDigest on the patch, without the decision store).** CUT: subsumed by Survivor 1; digest binding is a field of the typed patch, and without the dedicated store plus re-apply-on-read it is a signature on a correction that no read path consults.

## (d) Open questions

1. **Stable identity under entity merge and split.** Corrections anchor to object identity, but re-acquisition can merge two objects into one or split one into two, and then the identity is no longer stable. The patch needs a re-anchoring protocol for reorganized entities, or anchored corrections dangle exactly when the source reorganizes, which is #8 arriving from a different direction.
2. **Who the owner is.** The real system ran on demo owner mode with no verified identity; owner-wins-ties is only as trustworthy as the identity behind the correction. A correction from a spoofed owner is #8's evil twin (correction injection). Real auth is required before public deployment (per memory/2026-09-22.md L1702); until then every survivor rests on an unproven identity assumption.
3. **Conflict resolution ownership and clock.** `SOURCE_CHANGED_AGAINST_OWNER_ASSERTION` offers keep mine / accept source / inspect, but who resolves it and on what schedule? An unresolved conflict that sits forever is a silent owner-wins; a conflict auto-resolved by timeout is a silent source-wins. The policy needs a default plus a clock, and neither exists yet.
4. **Correction scope versus object lifecycle.** If the owner corrects a field and the object later disappears from the source (the business stops offering the service), does the correction resurrect it? The hide case (Pergola) must stay hidden; the corrected-phone case must not resurrect a deleted business. Re-application needs object-lifecycle states (active / vanished / deleted-by-owner), not just field overlays; Survivor 1's falsifiable test already probes this boundary.
5. **Multi-actor corrections.** Two people with owner claims correct the same field differently. The decision store currently models owner-versus-source; it has no actor precedence for owner-versus-owner, and no story for which correction the survival suite pins.
6. **Golden-set maintenance.** Who writes the golden corrections and against which fixtures? If the golden set is hand-maintained it rots (new fields get no coverage); if it is generated from real owner actions it needs a privacy story, because real owner corrections would live in a test suite. Survivor 3 is only as durable as its maintenance protocol.
7. **Single composition point.** STEP-06 fixed a presentation boundary hole where one consumer never received the overlay. Is there exactly one composition point that every graph consumer passes through, and is there a test enumerating every consumer to assert the overlay was applied? One un-wired consumer is one leak, and the leak will be a correction-shaped one.
