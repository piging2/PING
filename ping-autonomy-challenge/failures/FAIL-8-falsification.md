# FAIL-8 FALSIFICATION: adversarial attacks on the 4 survivors

**Mode:** research only. No implementation code.
**Date:** 2026-09-23. **Stance:** falsification, not confirmation.
**Target:** the 4 survivors in ~/workspace/ping-autonomy-challenge/failures/FAIL-8-correction-loss.md, section (b).

The survivors earned their place by preventing at least 2 of the 9 failure classes each. This document tries to take each one apart: the strongest concrete attack per survivor, whether the survivor's own falsifiable test catches the attack, a strengthened test, and a verdict. The lane's 7 open questions are used as attack surface, not background reading: open questions 1, 2, 3, 5, and 6 all become weapons below.

Verdict scale: WITHSTANDS (attack fails, claims hold) / WEAKENED (survives in a narrower form; named classes degraded) / FALLS (a claimed prevention class no longer holds as stated).

---

## Survivor 1: Typed correction patches anchored to stable identity, decision store, re-applied on every read

**Claimed prevention:** #8 correction-loss, #6 visibility-error, #9 conflict-collapse, #5 claim-binding.
**Load-bearing assumption:** object identity (object id + field path) is stable enough to anchor to, and the decision store is addressed by nothing except the read seam.

### Attack A: entity merge (identity continuity without identity stability)

The lane's own falsifiable test probes the *vanish* case: the hidden service `website-service-51de038c1defe8bd` is deleted from the source fixture, and the expected outcome is a disjunction: "the dangling hide patch either stays honored or raises a named 'correction target missing' state, never silently dropped and never resurrecting the object." The test never probes the *merge* case, and the disjunction is the hole.

Concrete case: the source re-dump re-emits Pergola work merged into a renamed object, "Pergola & Patio Design Services", with a new id, absorbing the old `website-service-51de038c1defe8bd`. The old id is gone. The hide patch on the old id is now an orphan: it "stays honored" (the disjunction's first branch is satisfied), it is not dropped, it resurrects nothing. And the new object, carrying essentially the same service the owner hid, renders fully visible with no owner decision attached. The test as written PASSES while the owner's intent (this service hidden) is defeated. The patch machinery cannot tell "the thing I hid no longer exists" from "the thing I hid was re-identified," because anchoring is by id string, and the lane's open question 1 admits there is no re-anchoring protocol.

The same attack defeats the phone-correction half: the extractor splits the single phone field into "office phone" and "mobile phone" (a field split, not a value change). The correction anchors to the old field path. Which successor inherits it? None, both, or a named conflict: the mechanism has no answer, so whichever the composition happens to do is untested and unspecified.

### Attack B: two owners, one field (conflict-collapse arrives inside the owner layer)

The decision store models owner-versus-source. Open question 5 notes it has no actor precedence for owner-versus-owner. Concrete case: two people with owner claims (the shop's two owners, or an owner and a delegated manager) record conflicting corrections on the same phone field through the real endpoint. The read seam re-applies "the" correction, but there are two. Possible behaviors: last-write-wins silently (a write-order race with no named precedence rule, which is the cut "last-writer-wins" candidate arriving through the back door), both stored with one shadowing the other in composition (the shadowed correction is #8-shaped loss within the decision store itself), or nondeterministic effective value across serves. The survivor's claimed #9 prevention covers source-vs-owner collapse only; the owner-vs-owner axis is a collapse with no typed conflict, no named event, and no test.

### Attack C: jurisdiction overreach and unverified actor (#5's foundation is assumed, not built)

The mechanism's #5 claim rests on patches carrying actor, timestamp, and digest-bound approval. Two gaps:

1. **Jurisdiction.** Typed-ness is structural, not authoritative. Nothing in the patch schema distinguishes "correct the phone" (a business fact the owner legitimately asserts) from "add a service we now offer: roofing" (inventing an object the owner should not be able to materialize into the graph as a corrected fact), or from overwriting a license number the source verified. The falsifiable test records corrections "through the real override endpoint" and checks they survive; it never records an *out-of-jurisdiction* patch and checks that it is rejected or flagged. A mechanism that accepts any typed patch accepts fabricated claims with full provenance dressing, which is #5 failing while wearing #5's uniform.

2. **Actor identity.** Step 6 is explicit: "No real owner identity was verified. Demo only." Open question 2 states every survivor rests on an unproven identity assumption until real auth exists. The #5 claim says a rendered claim "carries its evidence (who asserted it, when, against what base)." The "when" and "against what base" are evidence-backed (the Step-6 `approval_not_bound` failure proves digest binding is real). The "who" is a demo label. Correction injection by a spoofed owner is #8's evil twin, and the current actor field cannot tell them apart.

### Attack D: store mutation through a "legitimate" writer

The falsifiable test checks the owner store file is byte-identical across a hostile *re-dump*, which is strong against source-layer writers. But "losing a correction would require deleting the decision store itself, which is a named destructive action" overstates the case. A schema migration, a normalization pass, or a "cleanup" tool that rewrites the store and drops patches it does not recognize is not deletion of the store; it is a partial mutation by a writer the architecture trusts. The test never exercises a store-migration path, so "no code path can erase a correction except deletion" is asserted, not tested.

### Does the written test catch these?

- Attack A: NO. The test's vanish-case disjunction is satisfied by honoring the orphan while the successor escapes. The merge/split case is never run. This is the test's largest hole: it mistakes "patch not dropped" for "correction effective."
- Attack B: NO. Only one actor ever records corrections in the test fixture.
- Attack C: NO. No out-of-jurisdiction patch is attempted; the actor field is written by the same demo endpoint being tested.
- Attack D: PARTIALLY. Byte-identical check across a re-dump is good evidence against source-layer writers; it says nothing about store-layer writers.

### Strengthened tests

1. **Merge/split re-anchor test.** Base fixture: service s1 with an owner hide; business phone field P with an owner correction. New fixture: s1 merged with s2 into s3 (new id, overlapping content), P split into office/mobile. Run regen and serve. Expected: a named "re-anchor required" event listing candidate successor ids; the merged service must NOT render visible with no owner decision; the orphaned hide must not count as honored. **Failure:** s3 renders visible while the hide sits "honored" on the dead id, or the phone correction silently attaches to one successor with no named decision. (This closes the disjunction hole: honoring an orphaned patch while its successor escapes now counts as falsification.)
2. **Multi-actor conflict test.** Two distinct actor identities record conflicting corrections on the same field. Expected: a named actor-precedence event with an explicit resolution rule (e.g., both preserved, resolution required), deterministic effective value across serves. **Failure:** silent last-write-wins, shadowing, or serve-to-serve nondeterminism.
3. **Jurisdiction and actor test.** Attempt to record an invented service object as a "corrected-fact." Expected: typed rejection or an "unverifiable assertion" flag; the patch is not silently accepted. Separately, render the claim-binding provenance for a demo-mode correction: the surface must label the identity "unverified demo owner," not "owner." **Failure:** invention accepted as a correction, or the provenance display presents a demo actor as a verified owner.

### Verdict: WEAKENED

- #8: weakened. The anchor the whole mechanism is built on fails under merge/split re-identification (open question 1), and multi-actor shadowing is correction loss inside the decision store itself. Survives in the tested vanish and value-change paths.
- #6: withstands in tested form (hide survives re-dump; Step 7 proves it).
- #9: withstands on the source-vs-owner axis; the owner-vs-owner axis is an unhandled exposure, not a falsification of the claimed axis.
- #5: weakened. Digest binding is evidence-backed (the `approval_not_bound` failure is real); actor identity is demo-grade and jurisdiction is unscoped, so the provenance claim overreaches.

---

## Survivor 2: Three-way merge on regeneration (base / new / overlay; owner wins ties; typed conflict)

**Claimed prevention:** #8 correction-loss, #9 conflict-collapse, #4 fixture-drift.
**Load-bearing assumption:** "owner wins ties" is distinguishable from the cut "owner-wins-always," and the typed conflict is a state, not a moment.

### Attack A: the conflict has a lifetime, and the lifetime is the cut mechanism

The three falsification modes in the lane's test all probe the *moment* of the merge: effective value C, event exists naming A and B, three resolutions functional. None probes what the conflict looks like one hundred regens later when the owner never resolves it. Open question 3 is explicit: "An unresolved conflict that sits forever is a silent owner-wins; a conflict auto-resolved by timeout is a silent source-wins. The policy needs a default plus a clock, and neither exists yet."

Concrete case: merge emits `SOURCE_CHANGED_AGAINST_OWNER_ASSERTION` naming phone A and B, effective C. The owner never responds (the common case: owners do not triage event logs). A year later, a new staff member asks why the phone is C. The surface shows C with a stale event buried in a log nobody reads. The losing value B has no living presence on the owner-facing surface. Functionally, this is the cut version: the contradiction collapsed into the owner value, and the "record that B ever existed" degraded from a first-class state into an archived log line. Mode (3) of the falsification test ("Effective is C with no record that B ever existed") is satisfied at merge time and silently violated over time, and the test never re-checks.

This is where the lane's cut of owner-wins-always haunts the survivor. The cut was rejected because it "collapses the source contradiction into the owner value with no record of the source's new claim." The survivor's defense is the record. But a record with no lifetime policy, no surfacing obligation, and no default-plus-clock is a record that decays into the cut. **The line between "owner wins ties" and the cut version is three conditions, and the survivor as written satisfies only two:** (1) the tie must be on an owner-decided field (present), (2) the losing value must survive as a named visible record at merge time (present), (3) the conflict must have a lifetime policy with a default and a clock that keeps the contradiction live until resolved (missing). Without (3), "owner wins ties" is owner-wins-always with a paper trail that fades.

### Attack B: confirm-facts quietly widen "ties" back into "always"

The merge rule: "fields with an owner decision keep the owner value by policy." An `owner.confirmed-fact` (Step 6's email confirmation) is an owner decision. Concrete case: owner confirmed email E against base; the new source changes the email to E2 (the business genuinely changed its contact address). By the written rule, the confirmed email is an owner-decided field, the new source disagrees with the recorded snapshot, and the merge emits the conflict with the owner guaranteed to win the tie. But the owner never corrected anything here; they only confirmed the old value. Auto-winning a dispute the owner never weighed in on is the cut's shape: the owner wins not a tie but a disagreement they did not participate in. "Owner wins ties" needs "ties" narrowed to fields the owner *asserted a value for* (corrected-fact), with confirm-facts getting a different policy (e.g., confirmations expire on source change, or confirm-facts emit the conflict but do not auto-win). The lane's test uses only a corrected-fact in its A/B/C fixture, so this widening is never probed.

### Attack C: resolutions that destroy the audit trail

The test requires "all three resolutions functional" but never inspects what a resolution does to the decision store. Concrete cases: (a) "accept source" deletes the owner patch and the phone becomes B. The patch is gone; if B was source churn (a stale re-observation), the owner has no record they ever asserted C and cannot restore it without re-recording, which is #8 arriving through the resolution path the mechanism itself offered. (b) "keep mine" leaves the patch bound to baseStateDigest/baseViewDigest of a base that no longer exists, so the approval is now stale-bound and the next merge cannot tell whether C is still deliberate. Expected behavior in both cases: supersession is recorded, not deleted (accept-source marks the patch superseded with actor and timestamp; keep-mine re-binds the approval to the new base digests or marks the binding stale). The test checks the resolution *buttons work*; it does not check the resolution *accounting*.

### Does the written test catch these?

- Attack A: NO. The three modes are evaluated at merge time. There is no re-check after N regens with no resolution, and no requirement that the event stay surfaced.
- Attack B: NO. The fixture uses a corrected-fact only; confirm-fact disagreement is never merged.
- Attack C: NO. "Functional" is tested as "the three options exist and can be clicked"; post-resolution store state is never inspected.

### Strengthened tests

1. **Conflict-lifetime test.** Run the A/B/C merge, emit the event, then run N further regens with new sources that keep saying B, with no owner resolution. Expected: the conflict remains surfaced on the owner-facing surface (not aged into a log), and the policy document names the default and the clock (e.g., "unresolved after 90 days resolves to keep-mine, the expiry is itself a named event, never silent"). **Failure:** after the clock the surface shows only C with no discoverable trace that B was contested, or the event is no longer findable without knowing where to look. (This is the direct test of the line between the survivor and the cut.)
2. **Post-resolution audit test.** Resolve as "accept source." Expected: the patch is marked superseded (actor, timestamp, reason) and retained, not deleted; a later "keep mine" can restore C from the supersession record. Resolve as "keep mine." Expected: the approval is re-bound to the new base digests, or explicitly flagged stale-bound. **Failure:** accept-source deletes the patch; keep-mine leaves digests bound to a dead base.
3. **Confirm-fact tie test.** Owner confirms email E against base; new source says E2. Run the merge. Expected: either the conflict is emitted without auto-owner-win (the confirmation does not extend to a value the owner never saw), or the policy explicitly narrows "owner wins ties" to corrected-facts with a separate stated policy for confirm-facts. **Failure:** the confirmed email auto-wins the tie with no policy distinction from a correction.

### Verdict: WEAKENED

- #8: withstands at merge time (the new source cannot silently overwrite an owner-decided field; modes (1) and (2) are real tests).
- #9: weakened. The merge-time conflict emission is real, but the conflict has no lifetime policy, so an unresolvable-by-neglect conflict decays into exactly the polarity-flipped collapse the cut was rejected for. Confirm-facts widen "ties" beyond corrections, which is the cut bleeding back in through the rule's wording. The survivor needs condition (3) of the line and the corrected-vs-confirmed narrowing to hold its #9 claim.
- #4: withstands (base-vs-new diff names A and B side by side; the drift record is real).

---

## Survivor 3: Correction survival tests (golden set asserted against rendered effective output as a regen gate)

**Claimed prevention:** #8 correction-loss, #3 graph-blindness, #4 fixture-drift.
**Load-bearing assumption:** the golden set is maintained in correspondence with the real owner decisions and the live schema, and the suite is actually wired as a gate.

### Attack A: golden-set rot in the retraction direction

The golden set is "recorded once against fixtures." Open question 6 asks who maintains it, and the lane offers no answer. Concrete case: the owner retracts the Pergola hide (the shop offers pergola consultations again and records a visible:true decision, or deletes the hide patch). The next regen renders Pergola visible, which is now *correct*. The golden suite, still pinning "hidden service absent," FAILS. The regen is blocked on a page that is right. Now the maintainer faces a red gate with a stale pin, under time pressure, and the available fix is to edit the expected value. The failure message says "assertion mismatch"; it does not name the retraction, link the store record, or distinguish "owner changed their mind" from "the mechanism broke." A guard that cries wolf on legitimate change trains its maintainers to silence it, and a silenced guard is #8 with extra steps. The lane's own falsifiable test demands the suite fail loudly on sabotage, but it never tests what a loud failure *looks like* when the cause is a legitimate owner action, which is the case that determines whether the gate stays trustworthy.

### Attack B: golden-set rot in the coverage direction (the worse one)

New fields are added to fixtures over time; nobody writes golden corrections for them. A real owner records a correction on a new field; a regen's corrupted read path drops the overlay for that field; the rendered page loses a real correction. The suite passes green: it never knew the correction. The suite pins what it knows, and its silence about everything else is mistaken for "no loss." The falsifiable test's sabotage mode (b) corrupts the read path and expects failure, but the corruption is applied to a *golden-covered* field. The same corruption on an uncovered field is invisible by construction, and the suite's green output actively certifies a page that lost a correction. This is a coverage-bounded guard presenting as a universal one.

### Attack C: the #4 claim overstates the test surface

The lane claims the suite prevents #4 because it "asserts rendered effective values after every regen, so any unannounced output change, corrected field or not, fails loudly instead of landing silently on the page." But the suite as described checks: the corrected value is effective, the confirmed value is unchanged, the hidden object is absent, the three-layer display names the right values. Every check is golden-scoped. Concrete falsification: change one non-golden rendered field in the new source (a business description, a non-corrected service name), run regen, run the suite. The suite passes. An unannounced output change landed silently on the page, exactly what the #4 claim says cannot happen. The claim confuses "asserts rendered output" (true, and an improvement over asserting the store) with "asserts all rendered output" (false). The suite is a set of pinned points, not a page census.

### Attack D: the gate may be a ritual

The falsifiable test says to "verify the suite is actually wired as a regen gate rather than a manual script," but names no procedure. Grounding matters here: Step 7's simulated re-dump was a human-run sandbox harness (rewrite the projection, recompute the digest, no code changes). That is a production-shaped regen path that ran with no suite involved. If the real regen path can be run by hand, by an ops script, or by a migration tool without the suite, then the gate exists only for the pipeline-shaped regens and the mechanism is a ritual for the paths that matter. The test demands verification but does not specify the attempt: the natural procedure is adversarial (try to bypass it), not documentary (read the docs that say it is a gate).

### Does the written test catch these?

- Attack A: NO. The test never retracts a golden correction and never inspects the failure message's diagnostic quality.
- Attack B: NO. Sabotage is applied to golden-covered fields only; there is no roster check binding the suite to the real decision store.
- Attack C: NO, and this one is directly falsifying: the test never changes a non-golden rendered field, so the #4 overclaim is never exercised. Running it would falsify the claim as written.
- Attack D: PARTIALLY. The test names the requirement ("verify wired as a gate") but provides no bypass-attempt procedure, so a paper gate passes.

### Strengthened tests

1. **Retraction test.** Record a real retraction of a golden correction in the decision store (e.g., un-hide Pergola), then run regen and the suite. Expected: the suite fails with a message that NAMES the retraction and links the store record ("golden pin 'pergola hidden' contradicted by owner decision <id> at <time>"), and the maintenance protocol states the resolution path (re-ratify the golden set from the store, not hand-edit the expectation). **Failure:** bare "assertion mismatch" with no retraction diagnosis, or the documented fix is to edit the expectation by hand.
2. **Coverage-roster test.** Record a real owner correction on a field with no golden twin; corrupt the read path for that field only; run regen and the suite. Expected: the suite FAILS, because the suite begins with a roster check ("every correction in the decision store has a golden twin; uncovered corrections fail the gate"). **Failure:** green suite while a real correction is observably lost on the rendered page. (This turns open question 6 into a test: the golden set is either generated from the store or the gate refuses uncovered corrections.)
3. **#4 scope test (falsifies the claim as written).** Change one non-golden rendered field in the new source; run regen; run the suite. Per the lane's current #4 claim the suite must fail. **Observed: it passes.** This test is included to force the claim down to its honest form: the suite pins golden-covered fields only, and #4 prevention for the rest of the page must come from another mechanism (or be admitted as uncovered).
4. **Gate-bypass test.** Remove or rename the suite, then run the production regen path end to end and attempt to serve. Expected: the pipeline refuses to ship; serving is blocked. **Failure:** serve succeeds with no suite present. (Adversarial, not documentary.)

### Verdict: WEAKENED, and it no longer prevents #4 as claimed

- #8: weakened. Prevention holds only for golden-covered corrections; coverage rot (Attack B) lets real losses through under a green gate. The roster check in strengthened test 2 is the minimum repair.
- #3: withstands in tested form (a dropped entity dangles a golden anchor and the suite fails; that path is real).
- #4: FALLS as stated. The suite pins a subset of rendered output; a changed non-golden field passes silently, which is precisely the failure the claim says is impossible. The honest claim is "pins golden-covered fields against drift," which is a #8 instrument, not a #4 one.

---

## Survivor 4: Source-change diffing as a first-class regen artifact (base-to-new diff; changed-fields-only re-verification; vanished objects named)

**Claimed prevention:** #8 correction-loss, #4 fixture-drift, #3 graph-blindness.
**Load-bearing assumption:** every write to the source layer goes through the diff-producing regen pipeline, and string equality implies meaning equality.

### Attack A: the out-of-band writer (the lane's own evidence is the counterexample)

The mechanism's strongest sentence is a universal: "the regen has no code path that rewrites a value the diff did not mark changed, so the correction's survival does not depend on the merge policy getting every case right." But the grounding evidence for the whole lane includes an out-of-band writer: Step 7's simulated re-dump was performed by rewriting `happy-place.json` directly and recomputing the digest, bypassing any pipeline. The document is candid about this ("simulated by rewriting the source projection... No code or owner-store writes"). In production, the same shape recurs: ops hotfixes, migration scripts, manual corrections to a bad projection, any agent with file access doing what the Step-7 harness did. None of these produce a diff artifact. The falsifiable test runs "regen" through the pipeline with clean base/new fixtures, so the universal claim is tested only inside the universe where it is true by construction.

Concrete case: an ops script fixes a bad source phone by editing the projection directly (exactly the Step-7 method). The diff artifact on disk still describes the last pipeline regen. The next pipeline regen computes its diff against its recorded base, which no longer matches the live store, and trusts the resulting diff. If the direct edit touched a field carrying an owner correction, the diff cannot scope correctly because its base is stale, and the "untouched by construction" guarantee is void. The mechanism has no digest binding between the diff artifact and the base it was computed from, so a base that changed without a diff is undetectable.

### Attack B: same string, changed meaning

The diff's fidelity assumption is that string equality means the field is unchanged. Concrete case: the source re-emits the identical phone string `+15412865190`, but it is now the number of a different branch (the business moved; the extractor kept the field, the digits happen to match a recycled number), or an identical service description is re-emitted attached to a renamed offering. The diff marks the field unchanged; re-verification is not scoped to it; the owner's correction stands over a source value whose meaning has changed without any byte changing. The mechanism certifies "unchanged" while the meaning changed, with no flag, because it has no channel for semantic continuity, only byte continuity. The falsifiable test's "exactly one field changed (phone)" fixture assumes change is always visible at the byte level.

### Attack C: vanished-then-resurrected objects

The diff names vanished objects, which is real #3 prevention. But consider the two-regen sequence: object O vanishes in regen N (named event; lifecycle policy keeps or drops the effective object per Survivor 1's open question 4), then O reappears in regen N+1 with different field values. The diff marks O "added" (it is not in the base). An "added" object has no old values, so field-level old-vs-new comparison is impossible, and any change made to O's fields while it was absent is invisible to the diff. If the lifecycle policy kept the owner's effective values during the absence (hide stayed honored, corrections stayed applied), the resurrection now needs a three-way comparison (pre-vanish values / owner values / resurrected source values) that the diff, seeing only "added," cannot provide. The falsifiable test has one vanish and never resurrects.

### Does the written test catch these?

- Attack A: NO. Every write in the test goes through the pipeline; the diff's base is never invalidated from outside.
- Attack B: NO. The fixture's changes are all byte-visible; semantic continuity is never probed.
- Attack C: NO. Vanish is tested; resurrection is not.

### Strengthened tests

1. **Out-of-band-write test.** Edit the projection directly (the Step-7 method: rewrite the file, recompute the digest, no pipeline), touching a field with an owner correction. Then run the pipeline regen. Expected: regen verifies the live store against the digest the last diff was computed from; on mismatch it raises a named "base changed outside the pipeline" event before trusting any diff, and re-baselines explicitly. **Failure:** regen proceeds on a diff whose base no longer matches the store, or the direct edit's effect on a corrected field is silently absorbed. (This binds the diff artifact to its base digest; without that binding the "by construction" claim is pipeline-local, not system-wide.)
2. **Semantic-same-string test.** New fixture emits byte-identical strings with changed meaning (fixture carries a context annotation: same digits, different branch; identical description, renamed offering). Expected: either the diff artifact carries an "unverifiable semantic continuity" flag for fields whose identity-context changed, or the claim is explicitly scoped to byte-level change with the blind spot documented. **Failure:** the diff certifies the field "unchanged" with no flag while the meaning changed.
3. **Resurrection test.** Regen N: object O vanishes (named event). Regen N+1: O reappears with changed fields. Expected: the diff marks O "resurrected," not merely "added," and field-level comparison uses the last-seen pre-vanish values. **Failure:** O is marked "added" with no old values, so changes made during the absence are invisible.

### Verdict: WEAKENED

- #8: weakened. "Corrections on unchanged fields are untouched by construction" holds inside the pipeline; the lane's own grounding evidence (Step 7's hand-written re-dump) demonstrates a writer outside the pipeline, and the mechanism has no defense against it until the diff is digest-bound to its base.
- #4: weakened. The diff names byte-visible changes faithfully, but semantic-same-string changes are invisible and out-of-band writes are silent, so "regeneration cannot change output without the diff naming the change" is true only for in-band, byte-level change.
- #3: weakened, narrowly. Vanish-naming works as tested; the resurrection case creates a blind spot where field history during absence is unrecoverable by the diff. The #3 claim survives for the vanish direction and needs the "resurrected" state to cover the return direction.

---

## Cross-survivor observations

1. **The open questions were the attack surface all along.** Open question 1 (merge/split) falsifies S1's anchor universality; open question 2 (demo identity) weakens S1's #5 claim; open question 3 (conflict clock) is the exact mechanism by which S2 decays into the cut version; open question 5 (multi-actor) opens an unhandled collapse axis inside S1's store; open question 6 (golden maintenance) is S3's rot vector. The lane already knew where the bodies were buried; this document just dug.

2. **Time is the adversary the tests forgot.** S1's test, S2's three modes, and S4's diff are all evaluated at a single instant. The attacks that land (conflict staleness in S2, golden rot in S3, base invalidation in S4) are all functions of time: what the mechanism looks like after N regens, one retraction, or one out-of-band edit. Every falsifiable test in the lane should gain a temporal dimension: re-run after N no-op regens, after one owner retraction, after one out-of-band write.

3. **The cut list haunts S2 specifically.** The lane cut owner-wins-always for fixing #8 by guaranteeing #9. S2's "owner wins ties" survives the cut only under three conditions (tie on an owner-asserted field; losing value survives as a named visible record; conflict has a lifetime policy with a default and a clock). As written, S2 satisfies the first two and is missing the third, and its rule wording ("fields with an owner decision") quietly widens the first to include confirm-facts. S2 is one missing clock and one wording fix away from being the cut version with better documentation.

4. **S3's #4 claim should be struck, not patched.** The suite is a set of pinned points, not a page census; no maintenance protocol turns pinned points into full-page drift detection. The honest claim is "pins golden-covered fields against drift," which is a #8 instrument. Keeping the #4 claim invites exactly the false confidence the falsification game is meant to kill.

5. **S1's disjunction ("stays honored or raises a named state") needs a third branch.** The merge attack shows a patch can be "honored" on a dead identity while its successor escapes, satisfying the letter of the test while defeating the owner's intent. The strengthened test 1 replaces the disjunction with: honored on a live identity, or named re-anchor event with candidate successors, or named target-missing state; honoring an orphaned patch while a successor object renders is explicit falsification.

## Verdict summary

| Survivor | Verdict | #8 | #9 | Other claimed classes |
|---|---|---|---|---|
| 1. Typed patches, decision store, re-apply on read | WEAKENED | weakened (merge/split defeats anchoring; multi-actor shadowing) | withstands on source-vs-owner axis; owner-vs-owner axis unhandled | #6 withstands; #5 weakened (digest binding real, actor demo-grade, jurisdiction unscoped) |
| 2. Three-way merge, owner wins ties, typed conflict | WEAKENED | withstands at merge time | weakened (no conflict lifetime policy; confirm-facts widen "ties" toward the cut version) | #4 withstands |
| 3. Golden-set survival tests as regen gate | WEAKENED | weakened (coverage-bounded; rot in both directions) | n/a (not claimed) | #3 withstands; #4 FALLS as stated (suite pins a subset of rendered output, not the page) |
| 4. Source-change diffing as first-class artifact | WEAKENED | weakened (in-band only; out-of-band writers bypass the artifact) | n/a (not claimed) | #4 weakened (byte-level, in-band only); #3 weakened narrowly (resurrection blind spot) |

No survivor falls entirely; all four survive in narrowed form. The pattern across all four: each mechanism is exactly as strong as its test's imagination, and each test imagines a single instant, a single actor, and a cooperative pipeline. The attacks that land come from time (staleness, rot, invalidation), from a second actor, and from writers outside the pipeline.
