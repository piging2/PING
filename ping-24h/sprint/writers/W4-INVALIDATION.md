# W4: U5 Projection Invalidation, Generic Seam (WRITER)

Date: 2026-09-28 ~19:45 MDT. WRITER lane W4. Semantic unit: U5 projection
invalidation, GENERIC SEAM ONLY. U10 decision records untouched. No tenant
authority, HOLD/recovery, ContextPack, identity, or FYD UI touched.

## VERDICT

SPIKE COMPLETE, 23/23 checks pass, hostile tests green, clean-checkout
replay green. The smallest generic contract AUTHORIZED TRANSITION to
AFFECTED OBJECTS to AFFECTED PROJECTIONS to INVALIDATE to DETERMINISTIC
REBUILD to VERIFY to ATOMIC PUBLISH to FRESHNESS PROOF is specified below
and proven on a synthetic transition end to end. Harvest: ADOPT dump.py
(rebuild + atomic publish + freshness meta), ADOPT ping-object-source
serve-time verify, ADAPT DependencyIndex register/merge/invalidate contract,
ADAPT the regen-trigger.ts verify-then-report PATTERN, ADAPT the
FYD_REGEN_CMD post-append hook PATTERN. The spike is 751 added lines in two
new files on an isolated branch; zero existing files modified, zero pushes,
zero Jev calls, no new store, no event bus, no pub-sub.

## 1. BASE PIN

* Sandbox repo: /home/hatch/workspace. HEAD
  310ce509d3ae1c3bf7b6bae250ae2f74bee65777, branch
  security/secret-redaction-2026-09-28, dirty: 1794 porcelain entries
  (pre-existing lane dirt; not touched by this lane).
* Canonical tree /home/nolan/projects/ping is NOT mounted in this sandbox;
  the pin above is the sandbox mirror at lane E's exact HEAD.
* Isolated tree: /home/hatch/workspace/.worktrees/w4-invalidation, branch
  w4/u5-invalidation-seam-spike, cut at 310ce50, clean at cut.
* One local commit: 429f3e8 "w4: U5 generic projection-invalidation seam
  spike + synthetic proof (23/23)". No pushes, no merges.
* fyd-build worktree (/home/hatch/workspace/fyd-build,
  841825c49fb3c41a36e13b21056793e04105bd0c): read-only source for
  dependency-index.ts; untouched.
* ZERO LOST IMPLEMENTATION VALUE: `git diff 310ce50 --stat` shows exactly
  two added files, 751 insertions, zero modifications, zero deletions.

## 2. SEARCH-FIRST (register 03 + lanes E and I)

Semantic unit named: U5 projection invalidation, generic seam. Register
03#18 covers event/journal infrastructure (do not build another event bus).
Lanes E and I swept 73 canonical refs + 49 second-repo refs and found no
complete implementation; five primitives cover six of eight stages.

EXISTING IMPLEMENTATIONS SEARCHED (machine-visible):

{"register":"03#18","task":"W4/U5-SEAM-SPIKE","locations":[
{"path":"~/workspace/lane-d-impl/tools/fyd-site-projection/dump.py","sha256":"c7cc075cadbd849b5f88f87ab75f4a43f001e9c42c3b72dd2397598f003b640c","reverified":"2026-09-28","verdict":"ADOPT (canonicalize + ordered overlays + strict op validation + fail-closed + tmp+rename publish + freshness meta)"},
{"path":"~/workspace/fyd-build/src/fyd/refresh/dependency-index.ts","sha256":"14bb0e7bc23a8984300b0279bf3185b385dfff1f2aa52cf275d16e8ac01bdb23","read":"2026-09-28","verdict":"ADAPT (register/merge/invalidate/invalidateForChanges contract only; proof-site seed and PAGE_SECTIONS discarded)"},
{"path":"~/workspace/lane-d-impl/src/fyd/data/ping-object-source.ts","sha256":"8fb0e502f11b69e5ff3e51dd1d314622819bef836ba452389d9f49afa6a25a05","read":"2026-09-28","verdict":"ADOPT (parseAndVerify: recompute sha256(canonicalize(graph)), fail closed, missing file is a hard throw)"},
{"path":"/home/nolan/projects/ping-fyd-converged/src/fyd/projection/regen-trigger.ts","sha256":"b57b900287225189af03cacb89a2758cc5e9f38d8fa8411515a232a7dedf95ff","source":"lane I Pig observation (not mounted in sandbox)","verdict":"ADAPT the verify-then-report PATTERN only ({ok, verified, latencyMs, error?}, post-rebuild overlayEventIds check, never throws); REJECT the shape (hardcoded 2-site allowlist, approve-embedded shell-out)"},
{"path":"tools/fyd-journal-gateway/server.mjs FYD_REGEN_CMD hook","source":"lane I (confirmed NOT LANDED anywhere)","verdict":"ADAPT the post-append hook PATTERN only (fire after committed append, per-key serialization, bounded, failure never rolls back the append)"},
{"path":"decision-record projections (U10)","verdict":"READ-ONLY per task; nothing exists to adopt; future consumer of the seam"}],
"winner":"no complete implementation; adopt+adapt set above"}

Hostile test before build: the spike was written test-first against the
contract; the hostile run caught one real defect (see section 5, H2).

## 3. CONTRACT SPEC (generic, no FYD vocabulary)

Stage pipeline. Each stage is a pure function of its inputs; data crosses
stages as values, never through a store or bus.

1. AUTHORIZED TRANSITION. Input record:
   {transition_id, event_type, object_ids[], authorized_at}.
   The seam never authorizes. A transition handed to the seam is already
   committed to the journal; the seam validates shape only. Trigger pattern
   (adapted from the FYD_REGEN_CMD hook): a post-append hook calls the seam
   after the append commits; the hook is informational, never authoritative;
   seam failure is reported, never rolls back the append.
2. Journal identity pre-flight (dump.py FYD-037 analog). The overlay source
   must assert the expected identity marker before any rebuild. Mismatch is
   typed WrongJournal: fail closed, zero writes.
3. AFFECTED OBJECTS. transition.object_ids, as committed.
4. AFFECTED PROJECTIONS. DependencyIndex.invalidate_for_changes(object_ids)
   returns {by_object_id, all_projections}: exactly the registered
   projections, never the whole set. Unregistered objects invalidate
   nothing: honest no-op, zero writes. The registry owner seeds via
   merge(); the seam owns the contract, not the registry contents.
5. INVALIDATE. The file path re-reads per request, so there is no shared
   cache to flush (same finding as lane E). Invalidation = each affected
   projection is rebuilt and atomically republished; consumers holding
   in-memory copies invalidate by digest compare (cached graphDigest !=
   published graphDigest means stale). Provided as
   consumer_cache_is_stale().
6. DETERMINISTIC REBUILD. Per projection: base digest =
   sha256(canonicalize(base)); overlays applied in (timestamp, event_id)
   order; every op strictly validated against the supported op set
   (set_field, add_object, deactivate_object); any malformed or unknown op
   aborts the whole rebuild with typed UnknownOp; nothing is published.
7. VERIFY. Post-rebuild: recompute sha256(canonicalize(graph)), compare to
   recorded graphDigest; and the transition's event id must appear in
   meta.overlayEventIds (the regen-trigger.ts check). Returns (ok, reason);
   never throws for content reasons. Serve-time: read the published file on
   every call (no cache), recompute, fail closed on mismatch or unparseable
   bytes ("refusing to serve ..."), missing file is a hard throw
   ("refusing to serve stale data").
8. ATOMIC PUBLISH. tempfile.mkstemp in the output dir + os.replace; readers
   never see a partial file; on any failure the temp file is removed and
   the previous verified projection keeps serving (last-good by
   construction; no separate staging/promotion code, same as dump.py).
9. FRESHNESS PROOF. Every published projection carries meta:
   {projectionId, seamVersion, producedAt, baseDigest, baseSource,
   overlayEventIds[], graphDigest}. freshness_proof() renders the answer to
   WHAT AUTHORITATIVE VERSION PRODUCED ME: "projection P was produced by
   seam V from base S (digest D) applying journal overlays [ids] in order;
   graphDigest G". A consumer holding the bytes can re-derive every digest
   without trusting the seam's word.

Report shape (adapted from regen-trigger.ts, generalized):
  {ok, verified, latencyMs, transition_id, affected_projections[],
   per_projection[{projection_id, verified, verify_reason, graphDigest,
   overlayEventIds[], published_path, error?}], error?}
The seam never throws: every failure is typed into the report. The seam
never claims a projection changed before verification.

Explicitly NOT in this spike: FYD approve wiring of any kind (FYD stays
frozen), decision records (U10 read-only), tenant authority, HOLD/recovery,
ContextPack, identity, FYD UI, any new store, any event bus, any pub-sub
framework, any shell-out (the spike is in-process; exec boundaries belong
to the consumer).

## 4. SPIKE DESCRIPTION

Location (isolated branch only):
[spikes/u5-projection-seam/projection_seam.py](spikes/u5-projection-seam/projection_seam.py)
  (477 lines: the seam)
[spikes/u5-projection-seam/test_proof.py](spikes/u5-projection-seam/test_proof.py)
  (274 lines: synthetic proof + hostile tests)

Full workspace paths:
~/workspace/.worktrees/w4-invalidation/spikes/u5-projection-seam/projection_seam.py
~/workspace/.worktrees/w4-invalidation/spikes/u5-projection-seam/test_proof.py

projection_seam.py contents: typed failures (WrongJournal, UnknownOp,
BadTransition, VerifyFailed, all under SeamError); canonicalize (same rule
as dump.py, floats refused); DependencyIndex (register/merge/
projections_for/invalidate/invalidate_for_changes); apply_overlays
(strict, fail-closed); rebuild; verify; serve; consumer_cache_is_stale;
publish (tmp+rename); freshness_proof; check_transition;
apply_transition (the full 9-stage pipeline, never throws);
make_post_append_hook (trigger adapter). Python stdlib only.

## 5. PROOF EVIDENCE

Synthetic world: base graph (obj-a, obj-b); journal ev-1..ev-3 (set_field,
add_object, set_field); registry obj-a to [proj-site-alpha,
proj-site-beta], obj-b to [proj-site-beta], obj-c to [proj-dashboard];
authorized transition T1 = {transition_id ev-3, object_ids [obj-a]}.

Run: `python3 test_proof.py` in the spike dir. Result: 23/23 checks pass,
exit 0.

* T1 end to end: affected projections exactly [proj-site-alpha,
  proj-site-beta]; both rebuilt, verified, atomically published;
  proj-dashboard untouched (no file written).
* Freshness: published meta answers WHAT AUTHORITATIVE VERSION PRODUCED ME:
  "projection proj-site-alpha was produced by
  projection-seam-spike@0.1.0 from base synthetic-base@1 (digest
  16d64a252cca) applying journal overlays ['ev-1', 'ev-2', 'ev-3'] in
  order; graphDigest a73f8f8ab9ad". Overlays applied correctly in the
  served graph (title "Alpha Prime", phone "555-0199", obj-c present).
* Determinism: T1 run twice gives identical graphDigests and identical
  overlay order [ev-1, ev-2, ev-3].
* Consumer invalidation: digest mismatch reads stale, digest match reads
  fresh.
* H1 (unknown op "teleport_object" in ev-4): rebuild fails typed
  UnknownOp; the previously published file is byte-identical after the
  failure (last-good keeps serving, verified by serve()).
* H2a (appended garbage): serve() refuses with "refusing to serve".
* H2b (surgical in-JSON forgery): serve() refuses on graphDigest
  mismatch. Hostile finding fixed during the spike: serve() originally let
  a raw JSONDecodeError escape; it now raises typed "refusing to serve"
  for unparseable bytes.
* H3 (unregistered object): honest no-op, zero writes, report says
  "no affected projections; nothing rebuilt".
* H4 (wrong expected transition id): verify returns False with reason.
* H6 (impostor journal marker): typed WrongJournal, zero writes.
* Post-append hook: the committed append record is preserved byte-identical
  while the seam failure is reported honestly alongside it.

Clean-checkout replay: the two spike files were copied to an empty
/tmp/replay-u5 (no repo, no dependencies beyond stdlib) and the proof
re-ran 23/23, exit 0. The worktree run above is itself on a clean checkout
of 310ce50 plus the one spike commit.

## 6. VERDICT AND RECOMMENDED NEXT STEP

VERDICT: the generic seam contract is specified and the spike proves the
full pipeline on a synthetic transition. ADOPT/ADAPT map is recorded in
section 2; nothing was reimplemented (no duplicate canonicalize, no new
store, no new bus, no second DependencyIndex).

Open items for the U5 convergence owner (not this lane's scope):

1. Projection authority is still open (lane E candidate 5): the seam is
   written for the file-dump authority. If the live-graph authority wins,
   the seam's rebuild/publish stages are unnecessary and only the
   affected-projection mapping plus serve-time verify survive.
2. Registry ownership: who seeds DependencyIndex.merge() in production.
   The contract comment names the SiteSpec generator lane; that binding
   is unconfirmed.
3. Consumer #1 wiring: the converged regen-trigger.ts (approve/clear paths)
   should emit its already-journaled transition into this seam rather than
   shelling out to dump.py. That wiring is FYD-side work and was
   explicitly out of this task; this lane takes no position beyond
   recording that the seam accepts exactly the transition record
   regen-trigger.ts already holds (siteId maps to affected projections via
   the registry, eventId is the transition_id).
4. The generalized post-append trigger (make_post_append_hook pattern)
   needs a landing decision, since the FYD_REGEN_CMD hook it adapts was
   confirmed unlanded by lane I.
