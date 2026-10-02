# Measurement spec: cost-verification-cache duplicate verification load

Date: 2026-09-30 (night shift, design doc)
Backlog item: `cost-verification-cache` (BACKLOG_PING.md PING.F, P2 OPEN)
Claim grounded: "Meta AI duplicate verification load measured 63-72% in audited rounds: intelligence spend re-verifying the already-known. Fix: content-addressed verification cache on the tandem verification path; duplicate rate measured per round and trending down." (BACKLOG_PING.md line 640)

## Status and scope

SPEC ONLY. No implementation. No edits to ~/workspace/tandem/ or any standing file. The tandem verification path is not modified and outreach behavior is unchanged. This document defines how to instrument the path, what to log, how to compute the per-round duplicate rate, and how to trend it.

## 1. The tandem verification path (as it exists today)

The Meta AI intel pipeline in ~/workspace/tandem/ moves through these stages:

1. Pack build: `build-context-pack.py` emits a context pack for a research brief (briefs live in `tandem/prompts/`).
2. Capture: Meta AI answers captured as `<run_id>.md` + `<run_id>.provenance.json` in `goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/`, where `<run_id>` = `YYYYMMDD-HHMMSS-<brief-slug>`.
3. Answer validation: `validate-meta-answer.py` is the false-success boundary (contract entry parser, presence rules). It validates the CAPTURE, not the claims.
4. Reconciliation: `reconcile.py` / `reconcile-run-report.sh` check that claims match filesystem + ledger.
5. Independent verification (the stage this spec instruments): every captured answer lists 10-12 businesses. Each business is independently web-searched; nothing from the answer is taken at face value. Collision guard (`check-prospect-collision.py`) runs per name. Results are written per run as `<run_id>.verification.md` with sections such as VERIFIED-NEW (staged), Duplicates re-served (already pipeline-tracked, existing records stand), and Excluded/Refuted.
6. Distill sweep: `distill-sweep.py` marks runs distilled and stages NEW/WATCH rows to pipeline.md.

The 63-72% claim refers to stage 5. Example from production evidence (2026-09-30 d-segment-deep-dive fence audit): 11 of 12 names already pipeline-tracked, yet each claim still got independently re-verified. The "Absolute Heat & Air" 2026-09-23 case is the archetype of duplicate verification spend: a claim refuted on 2026-09-22 (Kansas City wixsite, not the Montrose business) was re-served and had to be re-verified again the next round.

## 2. Hash point: what gets hashed and where

### Where

The hash point sits INSIDE stage 5, at the moment one individual claim's independent verification completes. Ordering:

```
independent source check -> verdict recorded -> canonical claim string built -> sha256 -> append log line
```

It is downstream of the evidence (only verified claims are hashed; never hash raw answer text) and upstream of the `.verification.md` write. The hash is a side-channel observation; it gates nothing today.

### What gets hashed

One hash per VERIFIED CLAIM. A claim is a single (business, claim field, verified value) triple confirmed by an independent source. Claim fields:

- `identity` : this name refers to this distinct business (disambiguation against same-name businesses)
- `address` : street address / town claim
- `website_url` : own-site presence or absence
- `phone` : phone number claim
- `existence` : the business exists at all
- `weakness` : the brief-specific weakness claim (e.g. "no own website") as confirmed or refuted

Which verifications log a line:
- Every VERIFIED-NEW staging row's verified fields: logged, is_duplicate=false on first sight.
- Every "Duplicates re-served" business's re-verified fields: logged, is_duplicate=true when the identical (business, field, value) was verified before.
- Every Excluded/Refuted claim check: logged; refutations are valuable cache entries (they prevent the same false claim being re-verified later).
- Not logged: capture validation (stage 3) and reconciliation tallies (stage 4). Those measure different things.

### Canonical string format (v1)

```
verif-v1 | subject=<norm_name> | field=<claim_field> | value=<norm_value>
```

Hash: SHA-256 of the UTF-8 bytes of that string, hex digest.

### Normalization rules (norm_name, norm_value)

Hash dedupe must survive the rewording Meta AI and directories apply to the same fact. Rules:

- name: lowercase, collapse whitespace, strip punctuation, map `&` to `and` (lesson from the FB pass guard: bare substring/name checks miss `&` vs `and` variants), strip legal-entity suffixes (llc, inc, co, ltd, pllc, corp) when they are trailing tokens. Log the raw name separately for human reading.
- address: lowercase, expand common abbreviations (st->street, rd->road, ave->avenue, blvd->boulevard, ct->court, ln->lane, dr->drive, hwy->highway, ste->suite), strip punctuation, collapse whitespace.
- website_url: lowercase host, strip scheme, strip leading `www.`, strip trailing slash, drop query strings and fragments.
- phone: digits only, strip leading country `1` when the remaining length is 10.
- existence/identity/weakness values: normalized to a small controlled vocabulary (e.g. `confirmed`, `refuted`, `no_own_site`, `unverifiable`) rather than free text, so verdict-equivalent checks collide.

Non-goal: perfect entity resolution. Two normalizations that wrongly collide are a false duplicate and under-count nothing (fail direction is conservative: only exact canonical-string equality counts). Identity caveats already recorded in `.verification.md` files (e.g. Steve Huck vs Huck's Heating) keep distinct subjects distinct as long as their normalized names differ; when two distinct businesses normalize identically, the spec requires disambiguation tokens (town + phone) in the subject, logged as `subject_disambig`.

## 3. Log schema: verification-log.jsonl

One line per claim verification. Append-only JSONL, atomic append (single `open('a')` write per line, matching the tandem ledger convention). Location: `goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/verification-log.jsonl` (sibling to `distill.jsonl`; no tandem/ script changes required to define the location).

| Field | Type | Meaning |
|---|---|---|
| `schema` | string | `"verif-v1"` |
| `ts` | string | ISO-8601 UTC of the log write |
| `round_id` | string | Audit round id, `YYYYMMDD-HHMM` cycle stamp (e.g. `"20260930-2104"`) |
| `run_id` | string | Captured answer run id (`YYYYMMDD-HHMMSS-<brief>`) |
| `brief` | string | Brief slug (e.g. `"d-segment-deep-dive"`) |
| `claim_hash` | string | sha256 hex of the canonical string |
| `subject_raw` | string | Business name as verified (human-readable) |
| `subject_disambig` | string or null | Town + phone disambiguation token when needed |
| `claim_field` | string | One of `identity`, `address`, `website_url`, `phone`, `existence`, `weakness` |
| `verified_value` | string | The value confirmed by the independent source (normalized) |
| `evidence_source` | string | Independent source TYPE: `live_site`, `gbp`, `directory`, `sos`, `domain_check`, `phone_lookup`, `pipeline_record`, `other` |
| `evidence_detail` | string or null | Short source pointer (e.g. domain name, place id). NEVER a credential or bearer token. |
| `verdict` | string | `VERIFIED_NEW`, `COLLISION`, `REFUTED`, `EXCLUDED`, `WEAK` |
| `is_duplicate` | boolean | True when `claim_hash` was seen before this line |
| `dup_scope` | string | `none`, `within_round` (first seen earlier this round), `cross_round` (first seen in an earlier round) |
| `first_seen_round` | string or null | round_id of the first log line with this hash; null when first sight |

Decisions recorded:
- `evidence_source` is a log field, NOT part of the hash. The same claim re-verified through a different source is still duplicate verification of the same claim; the waste is in the claim, not the source. Source stays logged for auditability.
- First-seen-wins. The earliest logged line owns the hash; every later line with the same hash is a duplicate. This makes the metric deterministic under log rebuild: recompute `is_duplicate`/`dup_scope`/`first_seen_round` by streaming the log in `ts` order.
- `.verification.md` files remain the human-readable record; the JSONL is the machine-readable measurement channel. One does not replace the other.

## 4. Per-round metric definition

Let round `r` be the set of log lines with `round_id == r`.

- `V(r)` = count of lines in `r` (total claim verifications performed).
- `D(r)` = count of lines in `r` with `is_duplicate == true`.
- `Dc(r)` = count with `dup_scope == cross_round`.
- `Dw(r)` = count with `dup_scope == within_round`.

Metrics:

- **duplicate_rate(r) = D(r) / V(r)** (the headline metric; this is the number that reproduces and then supersedes the 63-72% claim).
- **cross_round_rate(r) = Dc(r) / V(r)** (already-known from prior rounds: the pure cache addressable waste).
- **within_round_rate(r) = Dw(r) / V(r)** (same claim verified twice inside one round, e.g. the same business appearing in both the a-pass and d-pass of one cycle).

Guard rules:
- V(r) = 0 rounds are reported as `null`, never 0%. An empty round is no measurement, not a zero rate.
- Round membership is by `round_id`, not by wall clock; late-logged lines for round r still belong to r.
- The metric is a count ratio, not a time ratio. Each logged verification is one unit of verification effort. An optional cost-weighted variant may weight lines by probe count (number of independent source checks behind the line), but the base metric stays unweighted for reproducibility.

Reproducing the historical 63-72%: the figure comes from pre-log audited rounds and cannot be recomputed exactly. Forward, duplicate_rate(r) IS the reproduction. A best-effort backfill may be derived from existing `<run_id>.verification.md` files by the mapping: VERIFIED-NEW sections -> `is_duplicate=false`; "Duplicates re-served" entries -> `is_duplicate=true, dup_scope=cross_round`; Refuted/Excluded claim checks -> logged with their verdicts. Backfilled lines carry `ts` of the backfill run and a `backfilled:true` field; they are marked so they never mix silently with live measurement.

## 5. Trending query

Given `verification-log.jsonl`, the trend is computed by a single streaming pass. Reference implementation sketch (python, stdlib only):

```python
import json
from collections import defaultdict

seen = {}          # claim_hash -> first round_id
rounds = defaultdict(lambda: {"V":0, "D":0, "Dc":0, "Dw":0})

for raw in open("verification-log.jsonl"):
    e = json.loads(raw)
    r = e["round_id"]
    rounds[r]["V"] += 1
    h = e["claim_hash"]
    if h in seen:
        rounds[r]["D"] += 1
        scope = "within_round" if seen[h] == r else "cross_round"
        if scope == "within_round": rounds[r]["Dw"] += 1
        else: rounds[r]["Dc"] += 1
    else:
        seen[h] = r

for r in sorted(rounds):
    m = rounds[r]; V = m["V"]
    dup = m["D"]/V if V else None
    print(r, V, dup, m["Dc"]/V if V else None, m["Dw"]/V if V else None)
```

Trend read:
- Per-round `duplicate_rate`, plus a 3-round moving average to smooth pass-to-pass noise (segment briefs swing; fence-saturated passes run near 75-92% dupe names).
- Target from the backlog item: duplicate rate measured per round and TRENDING DOWN once the content-addressed verification cache (the future fix, not this spec) starts serving hits. The cache-hit rate is the complement the fix will move: `cache_hit(r) ~= cross_round_rate(r)` when every cross-round duplicate becomes a cache hit instead of a re-verification.
- Report shape per round: `round_id, V, duplicate_rate, cross_round_rate, within_round_rate, 3-round MA`. No invented numbers; every cell traces to log lines.

## 6. What the future fix consumes (boundary, not design of the fix)

This spec stops at measurement. When the cache is later built, it keys on `claim_hash` and stores `(verified_value, evidence_source, verified_at, round_id)`. Cache-hit policy, TTL/expiry, and invalidation are separate decisions for that lane; this spec only guarantees the key is stable and the log can prove the hit rate. No behavior change ships with this document.

## 7. Guardrails

- No tandem/ script is modified by this spec. The log is written by the verification agent/lane at the hash point; instrumentation is additive observation, not a pipeline change.
- `.verification.md` files stay the human record of record. The JSONL never carries secrets; `evidence_detail` is source pointers only.
- `VERIFIED_NEW` claims are the cache's seed corpus; `REFUTED` claims are equally valuable (a refuted claim re-served is pure duplicate load, as the Absolute Heat & Air case shows).
- Do not let this drift into identity-authority or event-spine territory: the hash is a measurement key over verified claim content, not an identity primitive and not an event. The identity ruling stays frozen.
