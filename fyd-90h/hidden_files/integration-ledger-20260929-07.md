# Integration Ledger — PING/FYD convergence, execution interval 07
Date: 2026-09-29 (MDT). Coordinator: convergence coordinator, interval 07.
Repo state: local commits only. NOTHING PUSHED.

## VERDICT

Interval 07 GREEN. The P0 correction-survival arrow is now proven on the rebuilt
served runtime: no broken step found. P1 turn-origin tagging is implemented,
tested, and committed. The PING acquisition rebuild produced zero semantic change
and a reviewed pin swap. The ONE boring portability proof passed every check and
stopped. Security-lane investigation is complete (read-only): credential
containment remains an open incident — material is still live on a public
branch. Five lanes ran, five delivered, zero stranded valuable implementations.

## PRODUCT ARROWS

Arrow 1 (ASK/LEGIBILITY, Ledger 02): GREEN (carried).
Arrow 2 (EVIDENCE->CLAIM, Ledger 03): GREEN (carried).
Arrow 3 (CORRECTION SURVIVAL, the P0 of this interval): GREEN, NEW.

WHY THIS -> OWNER CORRECTION -> DURABLE OWNER INTENT -> REGENERATION ->
OWNER INTENT SURVIVES. Proven live on served :3100 against the PING tenant:

(a) Owner corrects a fact: PASS. Served owner projection: contact.phone =
+1 555 010 1234 (owner Y). Correction record retains sourceValue =
(970) 589-3309 (source X), actorLabel "Demo Owner (seeded, unverified)".
(b) Owner hides a fact: PASS. addressVisibility -> hidden, phone correction intact.
(c) Owner explicitly publishes an address: PASS. addressVisibility -> public,
history "Hid the street address." -> "Show the full address."
(d) Owner changes section priority: PASS. Intent pi-e9431c39d99ec49a,
journal event fyd-ovl-mumzkn87-a211ccecf0aa, reorder_section
home:Services:2 -> index 0, durable through the Ask seam.
(e) Regeneration occurs: PASS. Projections recompute on every read, no cache.
The legacy static regenerateSiteProjection refuses ping-fyd with a typed
error ("unknown site for regeneration: ping-fyd") and the approve path
reports it honestly in regenStatus rather than claiming success.
(f) Source is re-observed: PASS. refreshSource: ownerLayerIntact: true with no
conflicts while source stays X; when source moved under the correction,
ownerLayerIntact: true + explicit owner-override-collision ("owner value
+1 555 010 1234 still wins: drift recorded, owner layer untouched").
Disk projection never rewritten (mtime 2026-09-21).
(g) Owner intent survives: PASS. Final served state: phone Y, address public,
all three history lines, owner store and journal event intact.

Why This distinguishes source X from owner Y on the served runtime: citation 1
"business: PING Social", source "Site record", lastChecked 2026-09-21;
citation 13 "Phone: owner correction (recorded 2026-09-29)", source
"Owner correction", basis "Owner-set value".

FIRST BROKEN STEP: none.

Adjacent fail-closed boundaries (standing product boundaries, not defects):
- The Why This route whitelists only happy-place/coppersmith-plumbing and
  refuses ping-fyd explicitly. No silent wrong answer.
- The legacy static regen excludes ping-fyd with a typed refusal.
Opening either is a code change for a different lane, not part of this arrow.

Build identity (independently verified by the coordinator, not taken on the
writer's word): :3100 serving build 4uPB5t8-5sf1Cx8x9yoG2, commit
a62fd1da90551ff4635f2e9ca3ca784b9dcc0274, built 2026-09-29T18:00:32.770Z.
NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 verified in the running process environment
(/proc/31434/environ), /api/readyz returns buildId 4uPB5t8-5sf1Cx8x9yoG2 and
commitSha a62fd1da90551ff4635f2e9ca3ca784b9dcc0274, and the live Ask seam
returns the owner-corrected phone with the X-vs-Y citation split.

Interval-05's green claim on this arrow is now SUPERSEDED by this fresh,
served, independently verified replay.

## PROOF RESULTS PER LANE

### Lane 1 — P0 served rebuild + arrow proof (Writer A)
Commit: none required (rebuild + behavioral proof only). Git clean except
pre-existing mc-approval/__pycache__/.
Proof script saved: ~/workspace/fyd-90h/hidden_files/proof-survival-ping-fyd-20260929-07.ts.
Replay: on the Pig, FYD_JOURNAL_GATEWAY_URL=http://127.0.0.1:18200 npx tsx
the proof script; curl :3100/api/fyd/objects/ping-fyd/overrides; curl POST
:3100/api/fyd/ask/ping-fyd {"siteId":"ping-fyd","question":"What is your phone
number?","mode":"visitor"}; curl 127.0.0.1:18200/events/FYD_SITE_OVERLAY?tenant=ping-fyd.
Result: all steps PASS.

### Lane 2 — P1 turn-origin tagging (Writer B, POLYROB harvest #1, ADAPT)
Branch: fyd/i07-turn-origin. Commit: c0dbcd1d8d3f11102facf1e3d32f2a5be45057ce
(base a62fd1da). Local only, nothing pushed.
12 files, +457/-19. One `origin` field (genuine_owner | delegated | wake |
reentry | unknown) on the authorized-transition record; origin predicate runs
inside answerAuthorization BEFORE any capability rule and BEFORE the bound
authority, so a replacement authority cannot bypass it. Server-side stamping
only (customize route + owner-context); origin bound into the content-hash
event ID; unstamped drafts normalize to "unknown" (fail-closed).
Proofs (src/fyd/owner-mode/__tests__/turn-origin.test.ts): (1) every forged
origin x every owner capability -> denied before the demo rule, surviving
authority replacement; (2) genuine_owner + owner.correct-fact -> allowed,
origin alone grants nothing; (3) unstamped -> "unknown" -> denied the owner
path. Targeted suites 72/72 pass; turn-origin suite independently replayed by
the coordinator: 15/15 pass.
Broader suites: 590 pass, 6 fail (by-id, view, circle-projection). The
coordinator re-ran src/fyd on the untouched base tree: the same failures
exist on base (along with 4 other pre-existing suites). Pre-existing claim
CONFIRMED. tsc: zero errors in the 12 changed files.
Harvest decision: ADOPT. FYD CURRENT: no turn-origin stamping; authorization
answered on capability/relationship rules. PING EXISTING: same. HARVESTABLE:
POLYROB origin-stamping semantics (adapted, no PolyrobWorker concept).
DUPLICATION RISK: none observed. SMALLEST DELTA: the one field + gate +
server stamping. SECURITY-PRIVILEGE RISK: origin alone grants nothing; the
predicate narrows, never widens, authority.

### Lane 3 — PING acquisition rebuild (Writer C)
Branch: fyd/i07-acquisition. Commit: 556fefd23045dc324c275e027bda14b65046348f
(base a62fd1da). Local only, nothing pushed.
Source manifest (src/fyd/acquisition/ping-sources.json): S1
src/config/tenant.ping.v1.json (owner-authored tenant authority); S2
src/config/products.ping.v1.json (owner-authored product authority); S3 PING
public Facebook Page, observed only via anonymous-preview, never merged; S4
/home/nolan/ping/var/fyd-projections/ping-fyd.json as diffTwin baseline and
explicit carry basis only. No Nolan-curated list needed; no sources invented.
Vocabulary mapping (existing primitives, no new ontology): DIRECT_OBSERVATION
-> website-derived / website_statement / DIRECT_EVIDENCE; OWNER_ASSERTION ->
owner-asserted / USER_OVERRIDE / OWNER_ASSERTED; VERIFIED_EXTERNAL_CLAIM ->
canonical-journal / DIRECT_FACT; DERIVED -> Ask DERIVED /
DETERMINISTIC_DERIVATION; INFERRED -> Ask INFERRED / renderer fail-closes to
UNKNOWN; GENERATED_PRESENTATION -> generator mark + evidence ref /
Ask GENERATED_COPY.
Honest outcome: ZERO SEMANTIC CHANGE. diffTwin verdict no-op: 0 object
changes, 0 relationship changes, 0 conflicts. All 7 object IDs and 6
relationship IDs byte-stable. Only digest input that moved:
provenance.derivedAt (re-stamped to the 2026-09-29 re-observation; excluded
from the twin diff). The thin substrate (four service objects with empty
fields) stays visible by design. Pin: bd56fbed... -> 728757b0d73...
Review artifacts (produced BEFORE the pin swap):
src/fyd/acquisition/review/ping-base-20260921.json,
ping-candidate-20260929.json, ping-run-record-20260929.json,
ping-difftwin-20260929.json, ping-refresh-proof-20260929.json.
Survival proof PASS: refreshSource with the production path,
ownerLayerIntact: true, owner-layer digest 1ca91df0... byte-identical
before/after. Contract tests 33/33 pass (ask-ping-fyd-contract,
graph-read-route, source-refresh, semantic-diff).
Caveat: untracked node_modules symlink in the worktree (points at the served
tree, needed to run tests), deliberately left unstaged.

### Lane 4 — TenantOS portability proof (Writer D, the ONE boring proof)
Branch: fyd/i07-portability-proof. Commit: 68861542 (base a62fd1da). Local
only, nothing pushed. PROOF IS COMPLETE; the lane STOPPED per the order.
EXISTING CODE HARVESTED: src/lib/ping/digest.ts, src/lib/blob-storage.ts,
src/lib/media-kv-store.ts, src/types/media.ts, src/config/media.v1.json,
src/fyd/media/authority-binding.ts, src/lib/secrets/secret-broker.ts,
tools/fyd-site-projection/dump.py. No existing infra reconciler found;
smallest-delta reconciler written.
CAPABILITY: DURABLE_PUBLIC_MEDIA. LOGICAL ASSET:
fyd-media:2d8d7c11188b3b9ea30d382a274ada0aa0db3621ecf3fc6390adfb241b2bf942:thumbnail-200w,
digest 7ca496fec071b67ab4fa03d1584f745e947d641f3201534a199003927d3eb3c2,
image/webp, 4218 bytes, public, disposable exploratory-tenant fixture.
PLACEMENT A: fs-a (fs-content-addressed; killed in drill). PLACEMENT B:
sqlite-b (sqlite-content-addressed).
SAME CONTRACT: PASS. SAME DIGEST: PASS. FYD BEFORE: PASS. FYD AFTER: PASS
(markup and SiteSpec fragment byte-identical after placement switch; no
provider coordinates leak into the renderer/SiteSpec surface).
PROVIDER FAILURE DETECTED: PASS (fs-a root removed -> health FAILED;
sqlite-b HEALTHY). RECOVERY: PASS (ACTIVE_PLACEMENT_UNHEALTHY diff; writes
to fs-a HELD and enforced; deterministic recovery target sqlite-b selected,
independently verified, activated). INDEPENDENT VERIFICATION: PASS (copy
receipt re-hashed via a path bypassing the store's own verifier; tamper drill
with a flipped byte yields INTEGRITY_FAILURE, proving the verifier is not
vacuous). SECRETS EXPOSED: 0. MISSION CONTROL EXPLANATION: PASS.
HAND-WRITTEN FYD/TENANTOS CODE: tools/tenant-media-portability/ (capability,
stores_fs, stores_sqlite, stores_vercel, policy, reconciler, fyd_view,
mission_control, run_proof, README) + run artifacts runs/20260929-181236/.
FIRST BROKEN STEP: none (30/30 checks, exit 0). NEXT: STOP.
Honest constraints: MinIO/R2/Storj considered; no accounts created per the
order; MinIO image not pullable on the Pig (registry unreachable). Vercel
Blob (the best existing authorized object store in code) deterministically
ruled INELIGIBLE (no credential in the execution environment, fail-closed,
reason recorded). Python harness (TS app could not run: no node_modules, no
network for npm install; FYD has Python tooling precedent in tools/). Run-log
event names (PLACEMENT_SELECTED, HEALTH_DEGRADED, etc.) are proof-run
observation records, not journaled PING canonical events (no existing
placement event vocabulary in the repo).
Media evidence/projection split: ACCEPTED, DEFERRED per Nolan ("circle back
when we finish everything else"). Not built.

### Lane 5 — Security lane (read-only investigator)
Findings file: ~/workspace/fyd-90h/hidden_files/security-lane-20260929-07.md
(uncommitted; coordinator commits ledger, file travels with it).
1. CREDENTIAL CONTAINMENT: VERDICT NOT CONTAINED. token.json (741 bytes,
Google OAuth pair) and .env.base (4,086 bytes, Qdrant/HF/Google-Drive/
GitHub-App/Postgres material) are STILL LIVE on the public branch
constitutional-trunk of github.com/ngesk2/crx-runtime at the live upstream
tip 74fbb74 (verified ~12:00 MDT via read-only GitHub API; local
remote-tracking ref stale at ffc2b4d). No removal, no history purge, no
rotation confirmation in any ledger 01-06. Local main checkout clean.
Containment to date is procedural only (bank-commit exclusion + hold on CRX
harvest writes). Assume compromised until proven otherwise.
2. f21ba933: VERDICT exists, local-only, nothing pushed.
/home/nolan/projects/happy-place-platform, branch devin/hpp-ping-boundary,
HEAD f21ba933 from the 2026-09-29 wave-4 sweep. No upstream configured; no
remote branch contains it. Content additive-only (10 files, 3,561
insertions). Reflog preserved; nothing touched.
3. CORRUPT REF fyd/builder-rebuild-v1: VERDICT confirmed, single-repo scope.
/home/nolan/workspace loose ref points at missing object 49e821bf...; NO
reflog entry (out-of-band filesystem overwrite). Both last reflog tips
(85faad17, 8cc82913) exist, so a future authorized repair can repoint
cleanly. Blocked: git for-each-ref (fatals), checkout/log/rev-parse of that
branch; fsck reports invalid sha1 pointer. Working: branch listing, status,
worktree list. No worktree or remote-tracking ref affected. Sibling branch
fyd/builder-rebuild-v1-cherrypick is healthy. Repair nothing until Nolan
decides: delete ref vs repoint-to-85faad17.
Caveats: rotation state unknowable from a read-only lane; gc behavior with
the corrupt ref untested (gc writes); Pig-side API checks were GETs only.
Zero secret values in the findings file.

## FALSIFICATION PROBES

1. Precedence candidate LEGAL/SAFETY > EXPLICIT OWNER DECISION >
VERIFIED FIRST-PARTY CLAIM > DIRECT SOURCE EVIDENCE > DERIVED FACT >
MODEL INFERENCE: TESTED, NOT CONSTITUTIONALIZED. LEGAL/SAFETY > OWNER
DECISION enforced (consequence_refused at propose for pricing change).
OWNER DECISION > DIRECT SOURCE EVIDENCE enforced at composition (citation
13 governs; source record unchanged), but NOT a strict rank:
context-compiler.ts ties USER_OVERRIDE and DIRECT_FACT at rank 5.
VERIFIED FIRST-PARTY CLAIM > DIRECT SOURCE EVIDENCE: NOT IMPLEMENTED AS
STATED (owner-asserted maps to USER_OVERRIDE rank 5, peer of DIRECT_FACT).
DIRECT SOURCE EVIDENCE > DERIVED FACT enforced (5 > 4). DERIVED FACT >
MODEL INFERENCE enforced (4 > 2; served Ask on website design returns
UNSUPPORTED/DENIAL, "I cannot answer that... I will not guess").
The candidate's strict ordering does not exist in the ranker. No
constitutionalization.
2. Writer A noted the tree's runner is jest, not vitest; a vitest attempt
fails at collection. Test commands must use jest in this repo.
3. Writer D's MinIO-unreachable observation falsifies any assumption that
the Pig can pull arbitrary container images for storage proofs.
4. Writer B's 6-failure pre-existing claim: CONFIRMED by coordinator replay
on the untouched base tree (failures exist at a62fd1da, import none of the
changed modules).

## CONVERGENCE AND STRANDING

- STRANDED VALUABLE IMPLEMENTATION REMAINING: 0. No unfinished valuable
owned work this interval; every lane finished and committed honestly.
- Lane branches (fyd/i07-turn-origin c0dbcd1d, fyd/i07-acquisition 556fefd2,
fyd/i07-portability-proof 68861542) are intentional side branches holding
single semantic units. They are NOT stranded; convergence into the served
line is a merge decision for Nolan (see owner decisions).
- P2 (outcome ledger with fixed-step confidence decay) was gated on P1
committing. P1 is now committed. P2 is unblocked for interval 08.
- Served line fyd/convergence-2026-09-28 remains at a62fd1da; :3100 serves
it with the fresh build. No lane dirtied the served tree.
- Pre-existing dirt mc-approval/__pycache__/ remains untouched (ownership
unknown; not ours to sweep).

## OWNER DECISIONS NEEDED

1. CREDENTIAL CONTAINMENT (incident, open): revoke/rotate all exposed
material; authorize or decline public-history purge of token.json +
.env.base on constitutional-trunk; add ignore rules + pre-commit scan;
decide when CRX-side harvest writes may resume (currently blocked by the
standing hold).
2. f21ba933 resolution: keep as local WIP / relocate to the forensic clone /
other. No reset/clean/rewrite/push of the original Happy Place repo or site.
3. Corrupt ref fyd/builder-rebuild-v1 (/home/nolan/workspace): delete the ref
vs repoint-to-85faad17 (both reflog tips exist; repair is safe and scoped).
4. Merge decisions for the three lane branches (turn-origin, acquisition,
portability-proof) into the convergence line, and their sequencing against
the P2 outcome-ledger lane.
5. Whether to open the Why This route whitelist and the legacy
regenerateSiteProjection KNOWN_SITES exclusion for ping-fyd (standing
fail-closed boundaries; opening either is a code change).
6. P2 outcome-ledger lane: authorized to proceed in interval 08 (P1
precondition now satisfied).

## UNRESOLVED FROM PRIOR INTERVALS

- The X engagement rerun ordered 2026-09-29 ~11:22 MDT: no completion report
has landed in this context. Result counts and anomaly report are still owed
to Nolan. The X authority files may still need a local commit. Kept separate
from interval 07 per standing separation.
- Media evidence/projection split: accepted by Nolan, deferred to "circle
back when we finish everything else." Recorded only.

## COMMITS THIS INTERVAL

- fyd/i07-turn-origin: c0dbcd1d8d3f11102facf1e3d32f2a5be45057ce (12 files,
  +457/-19). Local only.
- fyd/i07-acquisition: 556fefd23045dc324c275e027bda14b65046348f (source
  manifest + rebuild driver + review artifacts + pin swap). Local only.
- fyd/i07-portability-proof: 68861542 (tools/tenant-media-portability/ +
  run artifacts). Local only.
- Program ledger: this file (commit follows). NOTHING PUSHED anywhere.
