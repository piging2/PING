# FYD-036 closure — Phase 1: HARVEST AND ASSESS (READ-ONLY)

Date: 2026-09-27 ~11:00 MDT. Agent: FYD-036 REPLAY subagent.
Working repo: `~/workspace/fyd-build`, HEAD `841825c` on `fyd-025-semantic-determinism` (re-verified on arrival).
**GATE DECISION: GATED — Phase 2 not started. Prerequisites do not exist in fyd-build; the delta is not small.**

## 1. Happy Place replay implementation — LOCATED

The 2026-09-21 (backlog says 2026-09-22; REPLAY-01) proof was executed
ENTIRELY on the Pig, with only its lane wrappers and findings doc checked
in locally:

- `~/workspace/fyd-lane/lane-f-replay-adapter.py` — the replay entrypoint.
  Imports the canonical reducer UNCHANGED, redirects OUT_DIR to an EMPTY
  disposable scratch dir (refuses non-empty), journal selectable via
  `FYD_OVERLAY_JOURNAL` (default `demo`).
- `~/workspace/fyd-lane/lane-f-ui-compare.mts` — renders SiteSpec +
  ObjectView surfaces through the production code path from live vs
  replayed projections; compares surface digests.
- `~/workspace/fyd-lane/lane-f-probe.py` — journal probe (demo vs main).
- `~/workspace/fyd-lane/lane-f-findings.md` — the full executable-proof
  record (digests, op set, scorecard, re-run recipe). This is the
  canonical document of the protocol.
- The CANONICAL REDUCER is Pig-side only:
  `/home/nolan/ping/tools/fyd-site-projection/dump.py`
  (`fyd-projection-dump@1.0.0`). No copy exists in fyd-build or anywhere
  else in the local workspace.

### Exact protocol shape

- **Persisted history** = machine-generated fixture TS
  (`src/fyd/proceduralize/__fixtures__/happy-place-graph.ts`, byte-recorded
  + digest-pinned) PLUS `FYD_SITE_OVERLAY` rows from PING Postgres
  `ping_events` (`payload->>'siteId'=<slug>`, `ORDER BY timestamp ASC,
  event_id ASC`). Provenance: demo journal (`FYD_OVERLAY_JOURNAL=demo`);
  main-journal path failed to connect during probing
  (FL-20260921-231, lane-f-failures.md).
- **Reducer** = `dump.py`'s `extract_base_graph` + `query_overlays` +
  `apply_overlays`; canonical bytes = recursive key sort, array order
  preserved, separators `(',', ':')`, `ensure_ascii=False`, floats REFUSED;
  `graphDigest = sha256(canonicalize(graph))`. Op set (fail closed):
  `set_field`, `add_object`, `add_relationship`, `deactivate_object`.
- **Empty disposable projection** = `dump_site(slug)` writing into an
  empty scratch dir; live `/home/nolan/ping/var/fyd-projections/` never
  touched.
- **Two runs** = scratch1, scratch2; graph byte-identical, all digests
  equal; cross-checked against the LIVE projection's `meta.graphDigest`
  (replay 1 digest `8f4737d846b4e75491b2f8092fabd8d792bb4c896e1e331dd2aac58b38be3607`
  == live). Cross-language check: TS canonicalizer recomputed the digest
  through the production read path (`getPingObjectGraphSync`,
  `FYD_PROJECTION_DIR`-configurable) — passed.
- **REPLAY DIGEST MATCH** = `meta.graphDigest` equal across both runs and
  equal to live.
- **REPLAYED UI MATCH** = SiteSpec surface digest
  `0de56aa9040a683b1c911c465f89579b7c7bfcbd56b52f8a3065a0742be86022` and
  ObjectView surface digest
  `aed8f46ec8e0f289002f82f794b66f1ec7b2a173feb0aaea9fbff0bc499c934d`
  identical across live and replayed projections. Wall-clock `dumpedAt`
  excluded by construction.
- Pig-side copies were ephemeral (`/tmp/lane-f/`); re-transfer via
  `transfer-to-pig.py` if needed.

## 2. Coppersmith prerequisite assessment (fyd-build)

| Prerequisite | Happy Place source | Coppersmith in fyd-build |
|---|---|---|
| Base history (fixture TS) | happy-place-graph.ts (Pig website repo) | EXISTS locally: `src/fyd/proceduralize/__fixtures__/coppersmith-plumbing-graph.ts`; plus `evidence/observations-coppersmith-plumbing-2026-09-22.json` + `evidence/acquisition-coppersmith-plumbing-2026-09-22.json` (FYD-002) |
| Overlay delta history (FYD_SITE_OVERLAY rows) | demo journal, 1 event (synthetic-service deactivation) | **MISSING.** No Coppersmith overlay event is recorded anywhere in the local workspace. The only overlay event ever recorded was the Happy Place synthetic-service deactivation (FYD-038 closed 2026-09-27). |
| Reducer (event reducer + canonicalize + graphDigest) | dump.py (Pig only) | **MISSING.** fyd-build has NO event reducer, no canonicalize/graphDigest projection pipeline, no `FYD_PROJECTION_DIR` machinery (grep for `graphDigest`/`FYD_PROJECTION_DIR`/`getPingObjectGraphSync` in src+server+scripts: zero hits). |
| Empty disposable projection | lane-f-replay-adapter.py (Pig only) | **MISSING.** |
| Live projection as comparison target | `/home/nolan/ping/var/fyd-projections/happy-place.json` | **UNKNOWN/unverified.** No local record of a live Coppersmith projection; requires Pig access. |
| UI compare harness | lane-f-ui-compare.mts (Pig website repo render path) | **MISSING locally.** fyd-build's dev-server renders pages, but there is no canonical projection+digest read/render pipeline to compare. |

What FYD-021/regen left behind (`src/fyd/owner/apply.ts replayOwnerIntent`,
`src/fyd/regen/regenerate.ts` replay loop) is a DIFFERENT protocol: it
replays owner decisions from `OwnerIntentStore` onto regenerated V2 specs.
There are zero persisted owner-intent files locally (no `data/` dir), no
event history, no projection digest, no UI digest comparison. It cannot
be renamed into the Happy Place protocol without inventing the missing
pieces.

## 3. Gate decision: GATED

The prerequisites do NOT exist in fyd-build, and the delta is not small:

- The Happy Place proof was proven on the Pig against Pig-side history
  (Postgres journal), a Pig-side reducer, and Pig-side render paths. None
  of that machinery exists in fyd-build, and the task's Phase 2 explicitly
  requires reusing fyd-build's existing history/reducer/projection
  machinery — there is none to reuse for the reducer.
- Building a persisted-history format + event reducer + projection digest
  pipeline + served-bytes UI compare inside fyd-build is a NEW replay
  platform, not a harvestable delta. The task's binding constraints forbid
  it ("no speculative router projects", "smallest reusable delta", "Do NOT
  build a speculative replay platform").
- The Pig-side shortcut (rerun the existing adapter with
  `slug=coppersmith-plumbing`) is not available to this agent: the Pig
  transport was failing at the Tailscale CONNECT tunnel per the 2026-09-27
  incident (UNKNOWN state), a Coppersmith fixture TS in the Pig website
  repo is unverified, and there are no Coppersmith overlay events to
  replay — a base-only rerun would prove fixture determinism, not the
  persisted-history protocol, and would have no live projection to match
  against (REPLAY DIGEST MATCH's live leg undefined).

**Precise missing pieces** (for the authorization decision):

1. Coppersmith overlay-event history: no `FYD_SITE_OVERLAY` rows for
   `siteId=coppersmith-plumbing` exist in any journal this agent can see.
   Without delta history, the protocol degenerates to base-fixture replay.
   (Also entangled with FYD-037: the emit path that would create such
   history POSTs to any `FYD_GATEWAY_URL` blindly — no marker check — so
   minting history first needs the FYD-037 guard lane.)
2. Reducer: no event reducer exists outside the Pig's
   `/home/nolan/ping/tools/fyd-site-projection/dump.py`.
3. Projection+digest read path: no `FYD_PROJECTION_DIR` /
   `getPingObjectGraphSync` / graphDigest machinery in fyd-build.
4. Comparison target: no verified live Coppersmith projection.
5. Transport: Pig route status UNKNOWN (2026-09-27 incident); even the
   Pig-side rerun path needs transport recovery + journal probing.

**Scope estimate:**

- Option A (Pig-side rerun, if authorized): recover Pig transport; adapt
  `lane-f-probe.py` to query for `siteId=coppersmith-plumbing` in both
  journals; verify a Coppersmith fixture TS exists in
  `/home/nolan/projects/ping` (branch `fyd/sitespec-generator`); verify a
  live `var/fyd-projections/coppersmith-plumbing.json`. IF overlay events
  exist and IF the live projection exists, the rerun is a few hours of
  Pig-side work (re-transfer adapter + ui-compare, two scratch runs,
  digest compare). Most-likely outcome per current evidence: zero overlay
  events -> degenerate base-only replay, honest verdict "nothing to
  replay" — which reframes FYD-036 as "mint real Coppersmith history
  first" (gated on FYD-037), not a replay-port task.
- Option B (local fyd-build protocol): new product-scope work — a replay
  platform. Needs an explicit product decision and its own lane; do not
  authorize under the "smallest reusable delta" rule.

## 4. What Phase 2 would need as input

A Nolan/parent decision between: (a) authorize Pig-side probing
(transport + journal query + live-projection check) to see whether the
protocol's inputs even exist for Coppersmith; (b) reframe FYD-036 as
"mint Coppersmith overlay history" (gated on FYD-037's fail-closed guard);
or (c) authorize Option B as new platform work with its own budget and
acceptance. None of these fit inside this task's Phase 2 gate.

**Verdict: GATED. Phase 2 not run. No commits made (read-only Phase 1);
no suite run required (nothing changed).**

---

## Coordinator live-journal probe (2026-09-27 ~11:00 MDT, post-gate)

The worker gated partly on "Pig transport UNKNOWN since the 2026-09-27 incident."
The coordinator re-tested transport directly and then probed the live journals,
read-only, to sharpen the gate from "prerequisites missing" to measured fact.

**Transport:** UP. `pig_ssh 'echo PIG_OK'` via the documented egress-proxy route
(`pig-fb/pig-ssh.sh`, `nc -X connect -x hatch-egress-proxy:3130`) returned PIG_OK
in ~1.5s. (A direct `ssh muse-ssh@100.79.154.43` without the ProxyCommand fails
with "Operation not permitted" — that is the expected no-proxy path, not a Pig
outage.) The incident's UNKNOWN state is resolved.

**Probe method:** adapted `lane-f-probe.py` (siteId parameterized). Two stalenesses
found in the September probe and corrected: (1) it assumed `node` on Windows PATH
(absent; the probe ran from the Pig's WSL where `/usr/local/bin/node` and
`docker` both work); (2) it assumed `/app/node_modules/pg` in ping-gateway
(the module now lives at `/app/gateway/node_modules/pg`); (3) it assumed the
container's env supplied PH/PP/PU/PW/PD (the container now carries
POSTGRES_HOST=brain-postgres, POSTGRES_PORT=5432, POSTGRES_DB=ping_runtime,
POSTGRES_USER=postgres; password read from the container's own env at runtime,
never exfiltrated). Probe files were removed from the Pig afterwards; two tiny
query scripts remain in the container's /tmp (no secrets, harmless).

**Results (main journal, `ping_events` on brain-postgres/ping_runtime):**
- `to_regclass('ping_events')` = present; TOTAL_EVENTS = 2536
- `FYD_SITE_OVERLAY` with `payload->>'siteId' = 'coppersmith-plumbing'`: **0**
- `FYD_SITE_OVERLAY` with `payload->>'siteId' = 'happy-place'`: **0**
- `FYD_SITE_OVERLAY` grouped by site across ALL sites: **[] (zero rows)**

**Demo journal (`ping-test-pg`, where the September Happy Place overlay lived):**
container state `Exited (255) 26 hours ago`. Not started by this read-only probe.

**Sharpened verdict:** there is nothing to replay for Coppersmith — not "the
reducer is far away" but "the history does not exist." The only overlay event
ever recorded anywhere was the Happy Place synthetic-service deactivation in the
demo journal. FYD-036 is therefore not a replay port; it is "mint Coppersmith
overlay history first" (emit path + a real Coppersmith site lifecycle), which is
a product-scope decision for Nolan, not a small-delta authorization. No replay
platform was built, per the task's own gate. If Nolan later wants the demo
journal checked before it is restarted for other reasons, the query is the
`lane-f-probe.py` shape against `ping_events` with `siteId='coppersmith-plumbing'`.
