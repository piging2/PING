#!/usr/bin/env python3
"""GBP connector spike runner: fetch -> sanitize -> normalize -> observation,
with provenance, against recorded fixtures. FIXTURE MODE ONLY.

Scenarios:
  A. locations full refresh (paginated) -> observations with provenance
  B. reviews read -> sanitization proof, truncation marker, secret-canary scan
  C. reviews leg 403 SERVICE_DISABLED -> degrade to UNKNOWN, connector DEGRADED
  D. 429 with Retry-After -> bounded backoff, no retry storm
  E. idempotency: replay B twice -> identical idempotency keys, no duplicates
  F. 304 Not Modified -> no change events, freshness clock refreshed
  G. determinism: normalize the same raw payload twice -> identical bytes
  H. failure injection (lane-R lane-K): provider down -> SOURCE_UNAVAILABLE,
     bounded 3 attempts, no storm; auth expired (401) -> AUTH_EXPIRED,
     SUSPENDED lifecycle, subsequent fetches stop at the gate; malformed
     records (bad enum, missing name) -> quarantined observations, good
     records still emit

Writes an evidence JSONL to spike/evidence/run-<ts>.jsonl and prints a proof
report. Exit 0 iff every scenario passes.
"""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.expanduser(
    "~/workspace/ping-build-program/lane-bcq/testkit"))

from contract import (  # noqa: E402
    Confidence, CredentialRef, FetchOutcome, Lifecycle, to_public_dict,
)
from fixture_transport import FixtureTransport  # noqa: E402
from gbp_connector import FIXTURE_CREDENTIAL_REF, GbpConnector  # noqa: E402

FIX = os.path.join(HERE, "fixtures")
EVIDENCE = os.path.join(HERE, "evidence")
CANARY = "SECRET-CANARY-gbp-7f3a9c"

results = []
evidence_lines = []


def record(kind: str, payload: dict):
    evidence_lines.append({"ts": datetime.now(timezone.utc).isoformat(),
                           "kind": kind, **payload})


def check(name: str, ok: bool, detail: str = ""):
    results.append({"scenario": name, "passed": bool(ok), "detail": detail})
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" -- {detail}" if detail else ""))
    record("scenario_result", {"scenario": name, "passed": bool(ok),
                               "detail": detail})


def fresh_connector(recording: str):
    t = FixtureTransport(os.path.join(FIX, recording))
    c = GbpConnector(transport=t)
    r = c.connect(CredentialRef(ref=FIXTURE_CREDENTIAL_REF, credential_type="none"))
    assert r.ok and r.lifecycle == Lifecycle.AUTHORIZED, f"connect failed: {r}"
    return c, t


def canary_scan(obj) -> bool:
    """True if the canary string appears anywhere in the JSON-serialized form."""
    return CANARY in json.dumps(to_public_dict(obj), default=str)


# Fetch-scoped metadata that is SUPPOSED to differ across replays (per the
# BCQ contract, canonical_bytes excludes provenance.fetched_at and
# fetch_attempt_id). The connector-local _graded_link embeds linked_at =
# fetch time, which is likewise volatile. Replay determinism is defined as:
# identical canonical identity (canonical_id + _idempotency_key) and
# identical provider content fields; volatile fetch metadata must be
# excluded from the comparison. INTEGRATION-REQUEST candidate for lane-bcq:
# canonical_bytes should document this volatile-field exclusion as an
# explicit contract invariant rather than leaving it to test folklore.
VOLATILE_FIELD_PATHS = (
    ("fields", "_graded_link", "linked_at"),
    ("provenance", "fetched_at"),
    ("provenance", "fetch_attempt_id"),
)


def stable_canonical_bytes(obs) -> bytes:
    """canonical_bytes with volatile fetch-scoped metadata zeroed."""
    d = to_public_dict(obs)
    for path in VOLATILE_FIELD_PATHS:
        node = d
        for key in path[:-1]:
            node = node.get(key) if isinstance(node, dict) else None
            if node is None:
                break
        if isinstance(node, dict) and path[-1] in node:
            node[path[-1]] = "VOLATILE"
    return json.dumps(d, sort_keys=True, separators=(",", ":")).encode()


# -- A: locations full refresh -------------------------------------------------
c, t = fresh_connector("rec-a-locations.jsonl")
res = c.read("locations")
obs = list(res.observations)
check("A.locations-read-succeeded",
      res.outcome == FetchOutcome.SUCCEEDED and len(obs) == 2,
      f"outcome={res.outcome.value}, observations={len(obs)}, attempts={res.attempts_made}")
prov_ok = all(o.provenance.provider == "google-business-profile"
              and o.provenance.fetch_attempt_id == res.attempt_id
              and o.provenance.connector_version == "0.1.0"
              for o in obs)
check("A.provenance-on-every-observation", prov_ok,
      "provider, fetch_attempt_id, connector_version present on all")
conf_ok = all(o.confidence == Confidence.DIRECT for o in obs)
check("A.location-facts-graded-DIRECT", conf_ok,
      "GBP asserts these facts about its own listing")
link_ok = all(o.fields["_graded_link"]["provider_business_id"].startswith("accounts/")
              and o.fields["_graded_link"]["link_confidence"] == "INFERRED"
              and o.fields["_graded_link"]["ping_business_id"] is None
              for o in obs)
check("A.provider-ids-are-graded-links-not-identity", link_ok,
      "link records with INFERRED confidence; canonical id untouched")
check("A.checkpoint-opaque-and-stored",
      bool(res.checkpoint) and c.checkpoint() == res.checkpoint,
      f"checkpoint={res.checkpoint[:40]}...")
check("A.no-canary-leak", not any(canary_scan(o) for o in obs),
      "fixture has no canary; scan still clean")
check("A.rate-budget-declared",
      c.declaration().rate_budget.calls_per_window == 18000
      and c.declaration().rate_budget.max_attempts == 3,
      "18000/hr (300 QPM post-approval), max 3 attempts")
record("observations", {"scenario": "A",
                        "observations": [to_public_dict(o) for o in obs]})

# -- B: reviews + sanitization --------------------------------------------------
c, t = fresh_connector("rec-b-reviews.jsonl")
loc_name = "accounts/107000000000000000001/locations/900001"
res = c.read(f"reviews:{loc_name}")
obs = list(res.observations)
check("B.reviews-read-succeeded",
      res.outcome == FetchOutcome.SUCCEEDED and len(obs) == 3,
      f"observations={len(obs)}")
rev2 = [o for o in obs if o.source_record_id.endswith("rev-002")][0]
rev3 = [o for o in obs if o.source_record_id.endswith("rev-003")][0]
clean = rev2.fields["comment"]
check("B.script-and-event-handlers-stripped",
      "<script" not in clean and "onerror" not in clean and "evil.example" not in clean
      and "Terrible." in clean and "Never again" in clean,
      f"sanitized comment: {clean[:90]!r}")
check("B.review-text-graded-INFERRED",
      all(o.confidence == Confidence.INFERRED for o in obs),
      "reviews are untrusted third-party claims")
check("B.long-review-truncated-with-marker",
      rev3.fields.get("_truncated") is True and len(rev3.fields["comment"]) == 10000,
      f"len={len(rev3.fields['comment'])}, marker present")
check("B.secret-canary-never-emitted",
      not any(canary_scan(o) for o in obs),
      "canary planted in fixture review 2; absent from all observations")
check("B.idempotency-keys-unique-per-record",
      len({o.fields['_idempotency_key'] for o in obs}) == 3,
      "sha256(connector|stream|object|version)")
record("observations", {"scenario": "B",
                        "observations": [to_public_dict(o) for o in obs]})

# -- C: reviews leg 403 -> degrade ----------------------------------------------
c, t = fresh_connector("rec-c-reviews-403.jsonl")
res = c.read(f"reviews:{loc_name}")
check("C.reviews-degrade-not-fail",
      res.outcome == FetchOutcome.SUCCEEDED and len(res.observations) == 0
      and "SERVICE_DISABLED" in res.detail,
      f"detail={res.detail[:70]}...")
check("C.lifecycle-DEGRADED", c.health().lifecycle == Lifecycle.DEGRADED,
      f"lifecycle={c.health().lifecycle.value}")
loc_res = c.read("locations")
check("C.locations-leg-unaffected",
      loc_res.outcome == FetchOutcome.SUCCEEDED and len(loc_res.observations) == 1,
      "locations keep working while reviews degrade")
res2 = c.read(f"reviews:{loc_name}")
check("C.second-reviews-read-stays-degraded-quiet",
      res2.outcome == FetchOutcome.SUCCEEDED and len(res2.observations) == 0,
      "no retry storm against a known-disabled surface")

# -- D: 429 bounded backoff ------------------------------------------------------
c, t = fresh_connector("rec-d-429.jsonl")
started = time.monotonic()
res = c.read("locations")
elapsed = time.monotonic() - started
check("D.429-eventually-succeeds",
      res.outcome == FetchOutcome.SUCCEEDED and len(res.observations) == 1,
      f"attempts={res.attempts_made}, elapsed={elapsed:.1f}s")
check("D.attempts-bounded",
      res.attempts_made <= 3 and len(t.attempt_log) <= 3,
      f"provider calls={len(t.attempt_log)} (never a storm)")
check("D.retry-after-honored",
      elapsed >= 1.0,
      "waited on Retry-After: 2 with jitter before retry")

# -- E: idempotency across replay -------------------------------------------------
c1, _ = fresh_connector("rec-b-reviews.jsonl")
r1 = c1.read(f"reviews:{loc_name}")
c2, _ = fresh_connector("rec-b-reviews.jsonl")
r2 = c2.read(f"reviews:{loc_name}")
keys1 = sorted(o.fields["_idempotency_key"] for o in r1.observations)
keys2 = sorted(o.fields["_idempotency_key"] for o in r2.observations)
check("E.replay-produces-identical-idempotency-keys", keys1 == keys2,
      f"{len(keys1)} keys, byte-identical across replays")
bytes1 = sorted(stable_canonical_bytes(o) for o in r1.observations)
bytes2 = sorted(stable_canonical_bytes(o) for o in r2.observations)
check("E.replay-produces-identical-canonical-observations", bytes1 == bytes2,
      "same canonical identity + content; volatile fetch metadata excluded")
# resume from checkpoint emits nothing new
c3, _ = fresh_connector("rec-b-reviews.jsonl")
r3 = c3.read(f"reviews:{loc_name}", checkpoint=r1.checkpoint)
check("E.checkpoint-resume-emits-nothing-new",
      r3.outcome == FetchOutcome.SUCCEEDED and len(r3.observations) == 0,
      f"watermark={(r1.checkpoint or '')[:40]}...")

# -- F: 304 ----------------------------------------------------------------------
c, t = fresh_connector("rec-f-304.jsonl")
single = f"location:{loc_name}"
r1 = c.read(single)
r2 = c.read(single)
check("F.first-read-emits-observation",
      r1.outcome == FetchOutcome.SUCCEEDED and len(r1.observations) == 1,
      "etag stored verbatim")
check("F.304-emits-no-change-events",
      r2.outcome == FetchOutcome.SUCCEEDED and len(r2.observations) == 0
      and "304" in r2.detail,
      f"detail={r2.detail[:60]}...")
check("F.if-none-match-echoed-verbatim",
      any(a["headers"].get("if-none-match") == 'W/"loc900001-v3"'
          for a in t.attempt_log),
      "validator echoed exactly as received (M10)")
check("F.freshness-clock-refreshed",
      loc_name in c._freshness_clock,
      "freshness clock updated on 304")

# -- G: determinism ----------------------------------------------------------------
raw = {"name": "accounts/107000000000000000001/locations/900001",
       "locationName": "Copperline Plumbing LLC",
       "primaryPhone": "+1 970-555-0147",
       "primaryCategory": {"displayName": "Plumber"},
       "profile": {"description": "x"}}
c, _ = fresh_connector("rec-a-locations.jsonl")
fixed_ts = "2026-09-23T00:00:00+00:00"
n1 = c.normalize(raw, "location", "attempt-fixed", fixed_ts)[0][0].canonical_bytes()
n2 = c.normalize(raw, "location", "attempt-fixed", fixed_ts)[0][0].canonical_bytes()
check("G.normalize-deterministic", n1 == n2,
      "same input bytes + same attempt context -> same normalized bytes "
      "(fetched_at is an explicit caller input, never wall-clock by default)")

# -- H: failure injection (provider down / auth expired / malformed) --------------
from contract import ErrorClass  # noqa: E402

# H1: provider down (503 x 3) -> SOURCE_UNAVAILABLE, FAILED, bounded attempts
c, t = fresh_connector("rec-h-down.jsonl")
res = c.read("locations")
check("H1.provider-down-SOURCE_UNAVAILABLE",
      res.outcome == FetchOutcome.FAILED
      and res.error_class == ErrorClass.SOURCE_UNAVAILABLE
      and len(res.observations) == 0,
      f"outcome={res.outcome.value}, error_class={res.error_class.value}")
check("H1.attempts-bounded-no-storm",
      res.attempts_made == 3 and len(t.attempt_log) == 3,
      f"attempts={res.attempts_made}, provider calls={len(t.attempt_log)} "
      "(never a storm)")

# H2: auth expired (401) -> AUTH_EXPIRED, FAILED, lifecycle SUSPENDED,
# subsequent fetches stop at the authorization gate (no new provider calls)
c, t = fresh_connector("rec-h-auth-expired.jsonl")
res = c.read("locations")
check("H2.auth-expired-typed",
      res.outcome == FetchOutcome.FAILED
      and res.error_class == ErrorClass.AUTH_EXPIRED
      and len(res.observations) == 0,
      f"outcome={res.outcome.value}, error_class={res.error_class.value}")
check("H2.lifecycle-suspended",
      c.health().lifecycle == Lifecycle.SUSPENDED,
      f"lifecycle={c.health().lifecycle.value}")
res2 = c.read("locations")
check("H2.fetches-stop-at-gate",
      res2.outcome == FetchOutcome.FAILED
      and res2.error_class == ErrorClass.AUTH_EXPIRED
      and len(res2.observations) == 0 and len(t.attempt_log) == 1,
      f"second read outcome={res2.outcome.value}, provider calls={len(t.attempt_log)} "
      "(no new calls after suspension)")

# H3: malformed records -> quarantine observations, good records still emit
c, t = fresh_connector("rec-h-malformed.jsonl")
res = c.read(f"reviews:{loc_name}")
obs = list(res.observations)
quar = [o for o in obs if o.fields.get("_quarantined") is True]
good = [o for o in obs if not o.fields.get("_quarantined")]
check("H3.malformed-quarantined-not-dropped",
      res.outcome == FetchOutcome.SUCCEEDED and len(quar) == 2
      and all(q.confidence == Confidence.UNKNOWN for q in quar)
      and all("_quarantine_reason" in q.fields for q in quar),
      f"quarantined={len(quar)}, reasons={[q.fields['_quarantine_reason'][:40] for q in quar]}")
check("H3.good-records-still-emit",
      len(good) == 1 and good[0].source_record_id.endswith("rev-101")
      and good[0].fields["starRating"] == 5,
      f"good observations={len(good)}")
check("H3.quarantine-reason-names-cause",
      any("SIX" in q.fields["_quarantine_reason"] for q in quar)
      and any("provider record name" in q.fields["_quarantine_reason"] for q in quar),
      "reasons name the failing field (enum, missing name)")
record("observations", {"scenario": "H3",
                        "observations": [to_public_dict(o) for o in obs]})

# -- summary ----------------------------------------------------------------------
passed = sum(1 for r in results if r["passed"])
total = len(results)
record("summary", {"passed": passed, "total": total,
                   "mode": "fixture", "live_path": "explicit NEXT (see BUSINESS-CONNECTOR.md)"})
ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
with open(os.path.join(EVIDENCE, f"run-{ts}.jsonl"), "w") as f:
    for line in evidence_lines:
        f.write(json.dumps(line, default=str) + "\n")
print(f"\n{passed}/{total} scenarios passed. Evidence: business/evidence/run-{ts}.jsonl")
sys.exit(0 if passed == total else 1)
