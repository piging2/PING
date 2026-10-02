# PING substrate frontier harvest survey (recon, 2026-09-27 ~11:15 MDT)

READ-ONLY survey. No code changed, no commits, no pushes, no Pig writes,
no credential access, no HPP original contact. Transport to the Pig was
attempted twice and failed at the egress proxy (see UNKNOWNs); everything
below is from on-VM reads.

Surfaces surveyed: `~/workspace/fyd-lane/` (lanes, probes, adapters),
`~/workspace/skills/` (incl. typesafe, github, x-api, vercel,
competitive-signal-pass), `~/workspace/ping-content/`,
`~/workspace/fyd-build/scripts/` + `~/workspace/fyd-build/src/fyd/`,
`~/workspace/fyd-autonomy/` (grill-20 escalation machinery). The Pig
ping-gateway container layout could not be listed (transport down).

## Harvestable implementation inventory

| # | What it does | Where it lives | Constitutional owner (single) | Consumers |
|---|---|---|---|---|
| 1 | Canonical projection replay into disposable scratch dir; canonical reducer reused unchanged; overlay journal selectable via env | `fyd-lane/lane-f-replay-adapter.py` | FYD projection subsystem (PING tooling side) | lane-f proof runs, replay verifiers |
| 2 | Canonical PING-backed projection dump: FYD-037 wrong-journal guard (pre-flight identity GET, exit 2 WRONG_JOURNAL), float-refusing canonical bytes, (timestamp,event_id) overlay order, forced provenance, atomic write | `fyd-lane/dump.py` (mirrors `/home/nolan/ping/tools/fyd-site-projection/dump.py` on the Pig) | PING tooling / FYD projection | Next.js read seam (digest re-verification), lane-e proofs |
| 3 | Acquisition-chain trace: fixture TS to dump.py to projection to page; catalog of ~55 hardcoded facts; data-flow design | `fyd-lane/h0-hardcoded-audit.md` | Lane H0-1 (doc, not code) | lanes implementing the chain |
| 4 | Binding-coverage lint: every factual `.fields` read in renderers must go through the presentation-binding verifier; occurrence identity sha256(path+function+line); allowlist with justifications; fail-closed | `fyd-build/scripts/fyd012-binding-coverage.py` + `.allowlist.json` | FYD-012 (fyd-build scripts) | FYD renderer lint |
| 5 | Journal probe: lists FYD_SITE_OVERLAY events in main + demo journals (ids + timestamps only) | `fyd-lane/lane-f-probe.py` | Lane F | proof runs deciding which journal the live projection came from |
| 6 | Multi-surface factual digest proof: ground-truth digest from projection vs page / circle / objectview / ask surfaces | `fyd-lane/lane-e/proof.py` | Lane E | proof runs |
| 7 | Fail-honesty probe: backup projection, test MISSING/CORRUPT states; honest = 4xx/5xx or explicit failure payload with no plausible demo content; always restores + md5-verifies | `fyd-lane/lane-e/failproof.py` | Lane E | proof runs |
| 8 | Canonical network boundary: safe-fetch.ts (ONE SSRF gate), budgets.ts, rate-limit.ts (TokenBucket, GenerationQuota, AnonymousGate); media pipeline re-exports as shim | `fyd-lane/net/` (`index.ts` declares the canonical home) | FYD net subsystem | media pipeline, onboarding |
| 9 | Claim state machine: OBSERVED to CLAIMED to VERIFIED-CONTROLLED + release(); immutable transitions, audit events, DEMO_CONTEXT_IDS guard | `fyd-lane/claim/` | Onboarding order J | onboarding flow |
| 10 | Deterministic terminal-state machinery: evidence in, hard gates, exactly one of PASS/NO_VALUE/BLOCKED/FAILURE; pattern compiler; gap_ledger.json (KEEP_REASONING/AUTOMATABLE/ALREADY_AUTOMATED/BLOCKED/NOT_WORTH_AUTOMATING); cycle diff; self-audit | `~/workspace/skills/competitive-signal-pass/` | skill | competitive-intel passes |
| 11 | grill-20 escalation classifier: 10 checks, one evidence line each, typed JSONL records, weekly audit (first due 2026-10-04) | `fyd-autonomy/escalation-record-template.md`, `escalation-log.jsonl` (14 records) | SI-03 | all agents before escalating to Nolan |
| 12 | Surrogate-credential API CLIs with proven request shapes (Typesafe shapes verified 2026-09-27) | `skills/{github,typesafe,vercel,x-api}/bin/` | each skill | agents |
| 13 | Synthetic labeling: `provenance: "real"\|"synthetic"`, `ClaimGrade` incl. `synthetic_fixture` ("never presented as real"); conflict.ts renders synthetic conflicts as labeled test data | `fyd-build/src/fyd/refresh/types.ts`, `conflict.ts`, `facebook-source.ts` | refresh lane | conflict machinery, ask evidence grading |
| 14 | Attestation gate: social actions attest named evidence preconditions first; missing evidence to ATTESTATION_REJECTED, never success | `fyd-lane/h2-build/attestation-gate.ts` | h2 social backend | social actions |
| 15 | Dump byte-stability probe: two dumps byte-identical after normalizing dumpedAt | `fyd-lane/check-stable.py` | lane ops | stability checks |
| 16 | CRX doctrine + ladder (DOC_ONLY != RUNTIME ... != SAFE), UNKNOWN > FICTION | `fyd-lane/builder/CRX-DOCTRINE.md` | builder lanes | all lanes |

Deliberately NOT gaps (checked, single owner confirmed):
claim/ vs PING identity authority are different capabilities (resource
claims vs event/actor identity). ask/refresh share one Claim type
(`refresh/types.ts`); ask reuses it, no duplication.

## RANKED GAPS

Ordered by leverage. Every gap names the existing implementation it
harvests or the concrete failure it fixes. No speculative frameworks.

### Gap 1. Canonical bytes has no substrate home; 6+ live implementations, zero cross-language conformance pin

Harvest source: PING `hash-authority.ts` (constitutional owner; ingested
copy at `fyd-lane/harvest-wave1/code-evidence/hash-authority.ts`) is the
reference. Live ports: `fyd-lane/absorb/src/canonical.ts` (harvested TS),
`fyd-lane/dump.py::canonicalize` (Python, float-refusing),
`fyd-lane/lane-e/proof.py::canon` (Python `json.dumps(sort_keys=True)`,
NO float refusal, different edge semantics),
`fyd-lane/check-stable.py` (inline json.dumps),
`harvest-wave1/code-evidence/canonical_authority.js`
(CanonicalBytes.serialize, PING side), and the flagged legacy
`unified_event_runtime.js` top-level-keys-only `JSON.stringify` (the C1
key-order bug).

Concrete failure: every digest comparison in the stack (projection
graphDigest, lane-e D_FACT, read-seam re-verification) assumes
byte-equality across Python and TS. Today that is held by prose plus
dump.py's float refusal. If any factual value ever carries a float,
dump.py refuses while proof.py silently hashes something the TS side
would throw on: lane-e's ground truth and the projection digest diverge
with no alarm.

Smallest delta: a substrate-owned cross-language conformance fixture
(edge cases: floats, non-finite, unicode, nested key order, empty
containers) plus a runner that hashes it with each implementation and
asserts identical sha256, with hash-authority.ts as reference.

Falsification test: conformance runner exit code; the fixture's float
case must make dump.py refuse AND the TS implementations throw (matching
absorb/canonical.ts's non-finite rule); any implementation producing a
different digest fails.

### Gap 2. Three competing provenance vocabularies; no shared ProvenanceRef type

Harvest sources: `fyd-build/src/fyd/refresh/types.ts`
(`provenance: "real"|"synthetic"` + ClaimGrade vocabulary),
`fyd-build/src/fyd/regen/regenerate.ts`
(`ProvenanceCause = "source"|"owner"|"generated"|"unknown"` +
ValueProvenance), `fyd-lane/dump.py`
(`{kind:"canonical-journal"|"owner-presentation-intent",
ref:"ping-event:<id>"}` + `"website-ingestion:<url>"` free-form strings
forced in apply_overlays).

Concrete failure: the acquisition chain (h0 audit, FYD contract) cannot
be machine-verified across lanes. An owner-presentation-intent directive
and a refresh observation answer "where did this fact come from" in
mutually unintelligible vocabularies; the website read seam re-verifies
digests but treats provenance as opaque strings. No consumer (social,
ask, future lanes) can programmatically answer "is this fact
journal-backed?" across lanes.

Smallest delta: a substrate `provenance-ref` module: typed `{kind, ref}`
with parse/validate/canonical-string form plus a mapping table from
lane-local vocabularies; dump.py and refresh types adopt it first.

Falsification test: round-trip property test (parse(canonical(x)) == x
for every kind) plus a lint rejecting unknown provenance kinds in
projection JSON; exit code.

### Gap 3. FYD-037 wrong-journal guard is embedded in dump.py; lane-f-probe.py bypasses it; no single gateway-address authority

Harvest source: `fyd-lane/dump.py::_preflight_journal` +
`_journal_marker_ok` (exit 2, typed WRONG_JOURNAL).

Concrete failure: the probe whose entire purpose is "which journal did
the live projection come from" (`lane-f-probe.py`) queries both journals
with no identity pre-flight. Gateway addresses are per-tool defaults
with no single authority: `h2-build/config.ts` defaults to
`http://127.0.0.1:18199`, dump.py defaults to `:18199` for the journal
gateway AND `:8080` for main. FYD-036's reframed "mint overlay history"
work will create new journals, multiplying the ambiguity the guard
exists to kill.

Smallest delta: extract `journal_identity.py` (pre-flight GET + marker
check + typed WRONG_JOURNAL exit 2) as a substrate module; dump.py and
lane-f-probe.py both call it; record the gateway-address defaults in one
place.

Falsification test: stub-journal unit test, marker mismatch to exit 2
with WRONG_JOURNAL on stderr; probe exit code unchanged on healthy path.

### Gap 4. Binding-coverage lint is FYD-repo-specific; no reusable presentation-binding lint

Harvest source: `fyd-build/scripts/fyd012-binding-coverage.py`
(occurrence identity = sha256(path+function+normalized line), allowlist
with justifications, fail-closed on new reads).

Concrete failure: the binding verifier is a named FYD contract, and this
lint is what makes it enforceable, but it is single-use: READ_RE
hardcodes `.fields`, REPO_ROOT derives from the script's own location.
New renderer families (social, media, ask surfaces) get no equivalent
guard; the next bypass will be found by audit, not by lint.

Smallest delta: parameterize accessor regex + repo root + allowlist path
via CLI/env (no behavior change for the FYD run); document the
occurrence-identity scheme as the substrate contract.

Falsification test: parameterized run against fyd-build renderers
produces the identical PASS/FAIL as today; run against a synthetic
renderer family with a different accessor catches planted bypasses; lint
exit code.

### Gap 5. Probe staleness: lane-f-probe.py's demo half targets a dead container; probes emit no typed health state

Harvest source: `fyd-lane/lane-f-probe.py`; staleness evidence:
memory 2026-09-27 11:05 records ping-test-pg Exited 255 ~26h ago, while
the probe's demo query still targets ping-test-pg:55433 via
`docker inspect`; dump.py documents the demo journal now lives in TWO
stores (JSONL :18199 + demo PG). Separately, this survey's two SSH
attempts failed at the egress proxy (PROXY_FAILED, ~8s each, ~11:10-11:15
MDT) while the ledger's last PIG_OK was ~11:05: transport health claims
go stale within the hour.

Concrete failure: a probe returning rc=0 with an empty event list when
the journal is DOWN is the banned "absence of evidence as evidence of
absence". The next worker deciding "which journal the projection came
from" on that output concludes wrong. Per the 2026-09-27 UNKNOWN rule,
probes must emit HEALTHY/UNHEALTHY/UNKNOWN + typed reason + timestamp;
lane-f-probe.py emits `{"rc":2,"error":...}` with no health semantics and
no timestamp.

Smallest delta: (a) point the probe's demo half at the live JSONL gateway
(or both stores, mirroring dump.py's merge); (b) wrap probe output in a
health envelope `{state, reason, checked_at}` per the UNKNOWN-state
convention; never emit `[]` for an unreachable journal.

Falsification test: probe exit code + health envelope present in JSON;
run against the down container yields state=UNHEALTHY
reason=CONTAINER_DOWN (not an empty event list).

### Gap 6. grill-20 records have no deterministic validator; the 2026-10-04 audit has no tooling

Harvest source: `fyd-autonomy/escalation-record-template.md` (schema:
every check needs a non-empty evidence string; escalate requires
failed_checks non-empty + cost_of_being_wrong) + `escalation-log.jsonl`
(14 records).

Concrete failure: SI-03 is Nolan's binding order and the first
independent weekly audit is due 2026-10-04 (cross-check Nolan-directed
messages against the log). Nothing validates records today; a bare
`true` with no evidence is a process violation that only a human reader
would catch.

Smallest delta: `grill20-lint.py` validating each log record against the
schema.

Falsification test: lint exit code; must pass on the current 14 records;
a synthetic bad record (bare true, empty evidence) fails naming the
record and check.

### Gap 7. Skill bin CLIs duplicate surrogate-credential + JSON-response boilerplate

Harvest source: `skills/{github,typesafe,vercel,x-api}/bin/*.py`
(gh-api.py, ts-smoke.py, vercel-api.py, xapi.py, follow-batch.py) share
the skill-creator `dynamic_credentials.py` helper but each re-implements
the request envelope (host allowlist, 401/403 interpretation per the
skill docs' "a 401 is a question about the request" rule).

Smallest delta: a shared `api_call.py` in skill-creator/bin (host
allowlist, surrogate attach, JSON read, typed errors); each CLI
delegates to it.

Falsification test: existing smoke shapes (Typesafe `GET /v1/models`,
`POST /v1/systemone`, verified 2026-09-27) pass through the harness with
unchanged exit codes.

### Gap 8. Determinism probes are per-lane one-offs with no shared contract

Harvest sources: `fyd-lane/check-stable.py` (projection byte-stability,
Pig-side hardcoded paths) vs `fyd-lane/repo/determinism-probe.ts`
(semantic render model, two-process byte-compare). Same pattern
(normalize volatiles, run twice, byte-compare, exit code), no shared
contract.

Smallest delta: document the probe contract (volatile-field normalization
+ two-run byte-compare + exit code) as a substrate pattern;
parameterize check-stable.py by projection path + volatile fields.

Falsification test: probe exit code on a known-stable projection.

### Gap 9. The burn's gap records are prose; the signal-pass gap_ledger pattern is not applied to the burn

Harvest source: `skills/competitive-signal-pass/gap_ledger.json`
(classifications KEEP_REASONING/AUTOMATABLE/ALREADY_AUTOMATED/BLOCKED/
NOT_WORTH_AUTOMATING) + `signal_pass.py cycle` diff.

Concrete failure: this recon file is prose; the next harvester re-reads
prose instead of diffing structured records.

Smallest delta: emit a machine-readable gap ledger (JSONL, one record per
gap: id, harvest source, smallest delta, falsification test) alongside
the prose recon.

Falsification test: schema lint on the ledger file.

## UNKNOWNs (fail-closed)

- Pig ping-gateway container layout: UNKNOWN (reason PROXY_FAILED).
  Two consecutive `ssh -F /home/hatch/.ssh/pig-config pigwsl` attempts
  failed at the egress proxy (`nc: proxy read: Broken pipe`, connection
  closed, ~8s each) at ~11:10-11:15 MDT 2026-09-27. The ledger's last
  PIG_OK was ~11:05. Per the UNKNOWN rule: no inference about container
  state was made; no Pig writes were attempted (the planned read-only
  `ls` never ran; transport failed first). The flapping itself is Gap 5
  evidence.
- PING-side current state of `hash-authority.ts` / `CanonicalBytes`:
  UNKNOWN beyond the 2026-09-21 ingested copies in
  `harvest-wave1/code-evidence/` (Pig unreachable for re-verification).
- Website-repo current canonicalize copies (`src/lib/ping/ask-composer.ts`,
  `src/fyd/data/canonical.ts`): not verified from this VM
  (`/home/nolan` absent here); cited from dump.py's docstring and the h0
  audit. Treat the website-side count as reported, not observed.

## GitHub/ecosystem ingestion decision

Not warranted. No ranked gap requires code not already on this machine:
the constitutional reference (`hash-authority.ts`) is already ingested in
`harvest-wave1/code-evidence/`. The GitHub API pipeline remains blocked
per the 2026-09-21 harvest report (egress-proxy fault; Nolan's standing
order: do not regenerate the credential); it was not touched.

## Method note

Read-only: `muse.read`/`muse.exec` (ls, grep, wc, head) only. One
`mkdir -p` for this ledger file's directory. No file contents modified,
no processes started on the Pig, no credentials read.
