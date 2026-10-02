# FYD Incremental Compilation: Measured Proof

Lane: LANE-INCREMENTAL, 500-SITE FACTORY STRESS PROGRAM
Date: 2026-09-23
Companion: INCREMENTAL-SPEC.md (the design this proves)

## Method

Fixture: `~/workspace/fyd-factory/corpus/fixtures/clearwater-plumbing-demo.json`
(25 objects, 24 relationships; synthetic redacted demo business).

Harness: `proof/inc_proof.py` builds the full 10-stage compilation DAG
(SOURCE -> OBSERVATION -> NORMALIZED -> EVIDENCE -> OBJECT -> SECTION ->
PAGE -> SITESPEC -> RENDER_MODEL -> PROJECTION; 58 nodes), applies exactly
one fact change as a new ingestion occurrence, rebuilds, and measures
per-stage digest changes with assertions on every boundary.

Digest grounding: the harness's digest function is a port of the
production `canonicalizeSpec`/`semanticDigestOf` in
`src/fyd/builder/canonical.ts` (sorted keys, `*At` volatile stamps
stripped, array order preserved, SHA-256 hex). It was differentially
verified against the real TS functions executed on the Pig (branch
`fyd-factory`, read-only, via tsx):

- Input sample with nested keys, `generatedAt`/`updatedAt` stamps, and
  arrays.
- Real `canonicalizeSpec` output:
  `{"kind":"fyd.sitespec@1","nested":{"aKey":1,...},"pages":[...]}`
  (volatile stamps stripped, keys sorted, array order preserved).
- Real `semanticDigestOf`: `0da8444b2df07f31194b9935228635280f9f04e731bef47bbe41481682c0c7a9`.
- Python port output: byte-identical canonical JSON, identical digest.
  The harness self-test asserts both on every run and passes.

The section plan mirrors planner binding semantics (`BindingManifest`
bindingId form `pageSlug:component:index`; `objectField` forms `owner` /
`related:<role>:<predicates>`): 10 sections across 3 pages (home,
services, contact). Hero/contact/footer/hours/areas sections bind the
owner object `cw-biz-01`; services sections bind the 12 `provides`-related
services; team binds 3 `employs` persons; FAQ binds 5 `publishes` FAQs.
Sections whose copy derives from owner fields (hero, contact, footer)
render the phone number.

Change applied: `cw-biz-01.fields.phone` from `(970) 555-0142` to
`(970) 555-0143`, ingested as a new acquisition occurrence (`acq002`).
Baseline build: 58 nodes in ~25 ms. Change rebuild: ~5 ms.

## Probe 1: invalidation measurement (the core result)

Exactly one fact changed. Measured per-stage rebuild vs cache-hit:

| Stage | Nodes | Rebuilt | Cache hit | Rebuilt nodes |
|---|---|---|---|---|
| SOURCE | 4 | 4 | 0 | 4 new acquisition occurrences (new ingestion) |
| OBSERVATION | 4 | 4 | 0 | 4 new observation occurrences |
| NORMALIZED | 4 | 4 | 0 | 4 new normalized occurrences |
| EVIDENCE | 4 | 4 | 0 | 4 new evidence occurrences |
| OBJECT | 25 | 1 | 24 | `cw-biz-01` only |
| SECTION | 10 | 6 | 4 | `home:hero:0`, `home:contact:3`, `home:hours:4`, `home:areas:5`, `home:footer:7`, `contact:contact:0` |
| PAGE | 3 | 2 | 1 | `home`, `contact` rebuilt; `services` cache hit |
| SITESPEC | 1 | 1 | 0 | spec digest changed |
| RENDER_MODEL | 1 | 1 | 0 | model digest changed (see section-level diff below) |
| PROJECTION | 2 | 2 | 0 | `public`, `owner` (both bind renderModelDigest) |
| TOTAL | 58 | 29 | 29 | |

Boundary assertions (all pass):

- `cw-biz-01` digest changed; the other 24 object digests are
  byte-identical to baseline (24/25 objects untouched by a phone change).
- Exactly the 6 sections binding `cw-biz-01` rebuilt; the 4 sections
  binding only other objects (services grid, team, FAQ, services page
  grid) are cache hits.
- `services` page is a cache hit: its section binds 12 service objects,
  none changed, so the page digest is unchanged.
- Reverse walk (`reverseWalk` semantics from `manifest.ts`: object id ->
  bindings whose `objectField` references it) returns exactly the 6
  rebuilt sections. Forward prediction and measured invalidation agree.

Upstream stages (SOURCE through EVIDENCE) show 4/4 rebuilt because a new
ingestion creates new occurrence ids by design (section 5 of the spec):
they are new occurrences, not invalidated old ones. The old `acq001`
nodes remain as immutable history. Stability across ingestions lives at
OBJECT and below, where occurrence ids (`cw-biz-01`) are ingestion
independent: 24 of 25 objects did not move.

## Probe 2: dependency-level vs output-level granularity

The SECTION stage binds parent object digests, so it invalidates
conservatively: 6 sections rebuilt. The RENDER_MODEL records rendered
output per section (`id`, `component`, `objectIds`, `copy`). Section-level
diff of the two render models:

- Changed (4): `home:hero:0`, `home:contact:3`, `home:footer:7`,
  `contact:contact:0` (their rendered copy contains the phone).
- Unchanged (6): `home:hours:4`, `home:areas:5` (bind the changed object
  but their copy is hours/area text with no phone), `home:services:1`,
  `home:team:2`, `home:faq:6`, `services:services:0`.

The output diff is a strict subset of the dependency invalidation (4 < 6),
asserted in the harness. A scheduler may skip re-render of the 2
dependency-invalidated but output-identical sections while still
re-verifying their bindings. Both granularities are reported because they
answer different questions: "what could be affected" vs "what visibly
changed."

## Probe 3: adversarial digest-collision probe (LANE-CLAIM H8)

LANE-CLAIM finding H8 (`~/workspace/fyd-factory/claim/CLAIM-VERDICT.md`)
proved a 32-bit digest is not a semantic identity: digest `faebba73`
mapped two different fact sets (`555-61245`, `555-83635`), found in
~4.3 seconds. This probe reproduces the attack class against the
constructions:

- 32-bit digest (low 32 bits of SHA-256, hex): collision found between
  `555-44244` and `555-47018` -> digest `c0bac641`, after 47,018 hashes
  in 0.40 seconds. The H8 attack class reproduces trivially.
- Mandated 256-bit construction (SHA-256 over canonical JSON of the
  fact): `1ffab208de8b449b...` vs `62fa5a34e918801d...`. The digests
  differ. The mandated construction resists the attack.

Measured output: `proof/collision-result.json`. The probe is permanent in
the suite: any future digest construction must pass it. Per H8's
residual-risk note, sub-256-bit digests are banned as change-detection,
dedup, cache, or work identities anywhere in the layer (spec section 1.2).

## Probe 4: deterministic work identity (lease/join)

Harness: `proof/lease_proof.py`. File-lease coordinator; atomic `mkdir`
acquire; atomic (tmp + rename) lease and result publication; TTL +
fencing-token crash recovery; side-effect journal gated on fencing token.

Scenario A, 10-worker race (barrier-synchronized start, same acquisition
request): 1 worker performed the work, 9 joined the published result.
`work_executions == 1`, journal lines == 1, all 10 workers returned the
identical payload digest under one fencing token. Wall time 0.36 s.
No duplicate canonical side effects.

Scenario B, crash recovery: holder A acquired the lease (fencing=1) and
died without publishing. After TTL expiry, worker B stole the lease
(fencing=2) and completed the work. A's ghost append with the stale
fencing token was rejected by the journal gate. Final state:
`work_executions == 1`, journal lines == 1, journal entry carries
fencing=2. Exactly one canonical side effect despite holder death.

Scenario C, distinct requests: different URLs hash to different workIds,
executed independently (2 executions), no false join.

Implementation note: the first race run surfaced a torn-write bug (a
joiner read a partially written `lease.json`: 9 of 10 workers reported).
The fix, atomic tmp+rename publication for the lease file, is part of the
spec's protocol (section 3.3). The proof caught it; the spec records the
requirement.

## Probe 5: hard rule (occurrence-based identity)

The harness constructs byte-identical twins and asserts they do not
collapse:

- Two OBSERVATION nodes with identical bytes but different occurrence
  ids (`acq009/obs-00` vs `acq010/obs-00`): distinct node ids, distinct
  digests. Pass.
- Two OBJECT nodes with identical field bytes but different ids
  (`cw-twin-01` vs `cw-twin-02`): distinct digests, because the occurrence
  id is bound into every node digest. Pass.

Incident during development: evidence occurrence ids truncated to 40
characters collided for two distinct claim refs
(`website-ingestion:https://clearwater-plumbing.example.com/` and
`.../contact/`), silently merging two evidence nodes into one. The twin
test caught it. Occurrence ids must be collision-free by construction;
truncation is forbidden (spec section 5). This is the exact failure class
the hard rule exists to prevent, found by the rule's own detector.

## Reproduction

```bash
cd ~/workspace/fyd-factory/incremental/proof
python3 inc_proof.py       # probes 1, 2, 5 + canonical.ts self-test
python3 lease_proof.py     # probe 4
python3 collision_proof.py # probe 3
```

No Pig repo modifications were made. The only Pig execution was read-only:
`canonical.ts` imported by an ephemeral tsx harness outside the repo
(cleaned up afterward) for the differential self-test. All measured
outputs are committed next to the harnesses: `invalidation-result.json`,
`baseline-digests.json`, `collision-result.json`.

## What this proves, and what it does not

Proves: the digest construction matches production `canonical.ts`
byte-for-byte; a single-fact change invalidates exactly the dependent
chain (1/25 objects, 6/10 sections, 2/3 pages, services page untouched);
dependency vs output granularity is measurable and the output diff is a
strict subset; ten concurrent identical acquisitions produce one execution
and one journal line, including under holder crash; 32-bit digests fall
to the H8 attack in under a second while the mandated 256-bit
construction distinguishes the pair; byte-identical occurrences never
collapse.

Does not prove: production planner integration (the section plan mirrors
planner binding semantics but is not `planSite` output; running the full
planner needs TenantContext/archetype vector and is a separate lane's
wiring task), cross-site work-identity dedup at 500-site volume (proven
mechanically, not at scale), or claim truthfulness (explicitly out of
scope: this layer tracks what changed, not whether it is true).
