"""Test harness: drives any Connector implementation through the contract suite.

Each test gets a fresh FakeWidgetCRM (or the adapter under test) and returns
(pass, evidence). The runner aggregates, writes machine-readable results plus
a human summary, and exits nonzero on any failure.

Secret-shape scanning: every observation, checkpoint, and captured log line is
scanned for secret-shaped values. A connector fails the suite if any leak.
"""
from __future__ import annotations

import inspect
import json
import re
import sys
import traceback
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable

from .contract import (
    Confidence,
    Connector,
    CredentialRef,
    ErrorClass,
    FetchOutcome,
    Lifecycle,
    NormalizedObservation,
    to_public_dict,
)
from .fake_connector import FakeWidgetCRM

TESTS: list = []


def test(name: str):
    def deco(fn: Callable):
        TESTS.append((name, fn))
        return fn
    return deco


# Secret-shaped patterns live in contract.py (single source of truth).
from .contract import SECRET_PATTERNS


def scan_for_secrets(*blobs: str) -> list:
    hits = []
    for i, blob in enumerate(blobs):
        for pat in SECRET_PATTERNS:
            for m in pat.finditer(blob):
                hits.append({"blob": i, "pattern": pat.pattern, "match_prefix": m.group(0)[:24] + "..."})
    return hits


@dataclass
class TestResult:
    name: str
    passed: bool
    evidence: dict
    duration_ms: int
    error: str = ""


class Runner:
    def __init__(self, connector_factory: Callable[[], Connector]):
        self.connector_factory = connector_factory
        self.log_lines: list = []
        self.results: list = []

    def log(self, msg: str):
        self.log_lines.append(msg)

    def run(self) -> dict:
        for name, fn in TESTS:
            conn = self.connector_factory()
            self.log_lines = []
            started = datetime.now(timezone.utc)
            try:
                passed, evidence = fn(conn, self)
            except Exception as e:  # harness never crashes the suite
                passed, evidence = False, {"exception": repr(e),
                                           "traceback": traceback.format_exc(limit=8)}
            duration_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
            self.results.append(TestResult(name=name, passed=bool(passed),
                                           evidence=evidence, duration_ms=duration_ms,
                                           error="" if passed else json.dumps(evidence)[:400]))
        return self.report()

    def report(self) -> dict:
        passed = sum(1 for r in self.results if r.passed)
        return {
            "harness": "ping-connector-contract-testkit",
            "harness_version": "0.1.0",
            "ran_at": datetime.now(timezone.utc).isoformat(),
            "total": len(self.results),
            "passed": passed,
            "failed": len(self.results) - passed,
            "tests": [
                {"name": r.name, "passed": r.passed, "duration_ms": r.duration_ms,
                 "evidence": r.evidence, "error": r.error}
                for r in self.results
            ],
        }


def _connect_ok(conn: Connector, r: Runner) -> Connector:
    res = conn.connect(CredentialRef(ref=FakeWidgetCRM.VALID_REF, credential_type="api-key"))
    assert res.ok and res.lifecycle == Lifecycle.AUTHORIZED, f"setup connect failed: {res}"
    r.log(f"connected lifecycle={res.lifecycle.value}")
    return conn


# ---------------------------------------------------------------------------
# Contract surface tests
# ---------------------------------------------------------------------------
@test("declaration.complete")
def t_declaration(conn: Connector, r: Runner):
    d = conn.declaration()
    missing = d.missing_fields()
    r.log(f"declaration source_id={d.identity.source_id} version={d.identity.version}")
    return (not missing, {"missing": missing,
                          "capabilities": [c.capability for c in d.capabilities],
                          "auth_scope": list(d.auth.scopes)})


@test("auth.success")
def t_auth_success(conn: Connector, r: Runner):
    res = conn.connect(CredentialRef(ref=FakeWidgetCRM.VALID_REF, credential_type="api-key"))
    h = conn.health()
    return (res.ok and res.lifecycle == Lifecycle.AUTHORIZED
            and h.lifecycle == Lifecycle.AUTHORIZED,
            {"lifecycle": res.lifecycle.value, "health": h.lifecycle.value})


@test("auth.denial")
def t_auth_denial(conn: Connector, r: Runner):
    res = conn.connect(CredentialRef(ref="credref_bogus", credential_type="api-key"))
    r.log(f"denied: {res.error_class} {res.detail}")
    d = conn.discover()
    return (not res.ok and res.error_class == ErrorClass.AUTH_REQUIRED
            and d.error_class == ErrorClass.AUTH_REQUIRED
            and len(d.objects) == 0,
            {"connect_error": res.error_class.value if res.error_class else None,
             "discover_error": d.error_class.value if d.error_class else None})


@test("auth.expired")
def t_auth_expired(conn: Connector, r: Runner):
    res = conn.connect(CredentialRef(ref=FakeWidgetCRM.EXPIRED_REF, credential_type="api-key"))
    h = conn.health()
    f = conn.read("anything")
    return (not res.ok and res.error_class == ErrorClass.AUTH_EXPIRED
            and h.error_class == ErrorClass.AUTH_EXPIRED
            and f.error_class == ErrorClass.AUTH_EXPIRED
            and f.outcome == FetchOutcome.FAILED,
            {"connect_error": res.error_class.value,
             "read_outcome": f.outcome.value})


@test("discovery.initial")
def t_initial_discovery(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    conn.seed("w1", {"name": "Widget One", "price": 10}, "2026-09-20T00:00:00+00:00")
    conn.seed("w2", {"name": "Widget Two", "price": 20}, "2026-09-21T00:00:00+00:00")
    d = conn.discover()
    obs = []
    for ref in d.objects:
        fr = conn.read(ref, d.checkpoint)
        obs.extend(fr.observations)
        assert fr.outcome == FetchOutcome.SUCCEEDED
    r.log(f"discovered={len(d.objects)} observations={len(obs)}")
    return (len(d.objects) == 2 and len(obs) == 2 and bool(d.checkpoint)
            and all(o.provenance.provider == conn.declaration().identity.source_id for o in obs),
            {"objects": list(d.objects), "checkpoint_set": bool(d.checkpoint)})


@test("refresh.incremental")
def t_incremental(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    conn.seed("w1", {"name": "Widget One", "price": 10}, "2026-09-20T00:00:00+00:00")
    d1 = conn.discover()
    conn.seed("w2", {"name": "Widget Two", "price": 20}, "2026-09-22T00:00:00+00:00")
    d2 = conn.discover(cursor=d1.checkpoint)
    return (list(d2.objects) == ["w2"],
            {"first": list(d1.objects), "incremental": list(d2.objects)})


@test("checkpoint.resume")
def t_checkpoint_resume(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    conn.seed("w1", {"name": "A", "price": 1}, "2026-09-20T00:00:00+00:00")
    conn.seed("w2", {"name": "B", "price": 2}, "2026-09-21T00:00:00+00:00")
    conn.seed("w3", {"name": "C", "price": 3}, "2026-09-22T00:00:00+00:00")
    d = conn.discover()
    saved = conn.checkpoint()
    # Simulate restart: brand-new connector instance, same remote state.
    conn2 = FakeWidgetCRM()
    conn2.remote = conn.remote
    conn2.connect(CredentialRef(ref=FakeWidgetCRM.VALID_REF, credential_type="api-key"))
    d2 = conn2.discover(cursor=saved)
    r.log(f"resumed with cursor, got {list(d2.objects)}")
    return (list(d2.objects) == [],
            {"saved_checkpoint_set": bool(saved), "after_resume": list(d2.objects)})


@test("input.duplicate")
def t_duplicate_input(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    conn.seed("w1", {"name": "Dup", "price": 5}, "2026-09-20T00:00:00+00:00")
    fr1 = conn.read("w1")
    fr2 = conn.read("w1")  # same external object delivered twice
    ids1 = [o.canonical_id for o in fr1.observations]
    ids2 = [o.canonical_id for o in fr2.observations]
    b1 = fr1.observations[0].canonical_bytes()
    b2 = fr2.observations[0].canonical_bytes()
    return (ids1 == ids2 and b1 == b2 and len(set(ids1 + ids2)) == 1,
            {"canonical_id": ids1[0] if ids1 else None,
             "byte_identical": b1 == b2})


@test("input.changed")
def t_changed_input(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    conn.seed("w1", {"name": "Old", "price": 5}, "2026-09-20T00:00:00+00:00")
    fr1 = conn.read("w1")
    conn.seed("w1", {"name": "New", "price": 7}, "2026-09-23T00:00:00+00:00")
    fr2 = conn.read("w1")
    o1, o2 = fr1.observations[0], fr2.observations[0]
    return (o1.canonical_id == o2.canonical_id            # same canonical object
            and o2.version > o1.version                   # version advanced
            and o2.fields["name"] == "New"                # new value present
            and o1.fields["name"] == "Old",               # old observation retained
            {"canonical_id": o1.canonical_id, "v1": o1.version, "v2": o2.version})


@test("input.deletion")
def t_deletion(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    conn.seed("w1", {"name": "Gone", "price": 1}, "2026-09-20T00:00:00+00:00")
    fr1 = conn.read("w1")
    conn.seed("w1", {"name": "Gone", "price": 1}, "2026-09-23T00:00:00+00:00", deleted=True)
    fr2 = conn.read("w1")
    o2 = fr2.observations[0]
    return (fr1.observations[0].deleted is False and o2.deleted is True
            and o2.canonical_id == fr1.observations[0].canonical_id,
            {"deleted_flag": o2.deleted, "fields_after_delete": o2.fields})


@test("ratelimit.exhaustion")
def t_rate_limit(conn: Connector, r: Runner):
    limited = FakeWidgetCRM(calls_per_window=2, window_seconds=3600)
    _connect_ok(limited, r)
    limited.seed("w1", {"name": "A", "price": 1}, "2026-09-20T00:00:00+00:00")
    limited.seed("w2", {"name": "B", "price": 2}, "2026-09-21T00:00:00+00:00")
    limited.discover()   # call 1
    limited.discover()   # call 2
    fr = limited.discover()  # call 3 -> exhausted
    st = limited.rate_limit_state()
    return (fr.error_class == ErrorClass.RATE_LIMITED
            and st.exhausted and st.calls_remaining == 0,
            {"error": fr.error_class.value, "calls_remaining": st.calls_remaining})


@test("timeout.outcome_unknown")
def t_timeout(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    conn.seed("widget_timeout", {"name": "Hang", "price": 9}, "2026-09-20T00:00:00+00:00")
    fr = conn.read("widget_timeout")
    retries = sum(1 for a in conn.attempt_log if a["op"] == "read:widget_timeout")
    r.log(f"outcome={fr.outcome.value} attempts={fr.attempts_made} logged={retries}")
    return (fr.outcome == FetchOutcome.OUTCOME_UNKNOWN
            and fr.error_class == ErrorClass.TIMEOUT
            and fr.attempts_made <= 3 and retries <= 3
            and len(fr.observations) == 0,
            {"outcome": fr.outcome.value, "attempts_made": fr.attempts_made})


@test("payload.malformed")
def t_malformed(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    conn.seed("w1", {"name": "Good", "price": 1}, "2026-09-20T00:00:00+00:00")
    conn.seed("w2", {"name": "Bad", "price": 2}, "2026-09-21T00:00:00+00:00")
    conn.mode = "malformed"
    fr_bad = conn.read("w2")
    conn.mode = "ok"
    fr_good = conn.read("w1")
    return (fr_bad.error_class in (ErrorClass.SCHEMA_CHANGED, ErrorClass.INVALID_PAYLOAD)
            and fr_bad.outcome == FetchOutcome.FAILED
            and fr_good.outcome == FetchOutcome.SUCCEEDED
            and len(fr_good.observations) == 1,
            {"bad_error": fr_bad.error_class.value, "good_outcome": fr_good.outcome.value})


@test("secrets.redaction")
def t_secret_redaction(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    # Poison the provider store with hostile secret-shaped values; they must
    # never appear in normalized outputs, checkpoints, or harness logs.
    conn.seed("w1", {"name": "Acme", "note": "sk_live_4eC39HqLyjWDarjtT1zdp7dc"}, "2026-09-20T00:00:00+00:00")
    conn.seed("w2", {"name": "Beta", "token_hint": "ghp_abcdefghijklmnopqrstuvwx"}, "2026-09-21T00:00:00+00:00")
    blobs = []
    for ref in ("w1", "w2"):
        fr = conn.read(ref)
        for o in fr.observations:
            blobs.append(json.dumps(to_public_dict(o)))
    d = conn.discover()
    blobs.append(d.checkpoint or "")
    blobs.extend(r.log_lines)
    hits = scan_for_secrets(*blobs)
    r.log(f"scanned {len(blobs)} blobs, hits={len(hits)}")
    return (not hits, {"blobs_scanned": len(blobs), "hits": hits})


@test("normalize.determinism")
def t_determinism(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    raw = {"id": "w1", "fields": {"name": "Det", "price": 42, "tags": "x"},
           "updated_at": "2026-09-20T00:00:00+00:00", "version": 1}
    b1 = conn.normalize(raw, "widget", "attempt-a")[0].canonical_bytes()
    b2 = conn.normalize(raw, "widget", "attempt-b")[0].canonical_bytes()
    return (b1 == b2, {"bytes": len(b1), "identical": b1 == b2})


@test("observation.provenance")
def t_provenance(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    conn.seed("w1", {"name": "Prov", "price": 3}, "2026-09-20T00:00:00+00:00")
    fr = conn.read("w1")
    o = fr.observations[0]
    p = o.provenance
    complete = all([p.provider, p.source_record_id, p.fetched_at,
                    p.fetch_attempt_id, p.connector_version])
    return (complete and p.provider == conn.declaration().identity.source_id
            and p.source_record_id == "w1"
            and o.confidence in (Confidence.DIRECT, Confidence.DERIVED,
                                 Confidence.INFERRED, Confidence.UNKNOWN),
            {"provider": p.provider, "confidence": o.confidence.value,
             "connector_version": p.connector_version})


@test("lifecycle.revoke")
def t_revoke(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    conn.seed("w1", {"name": "A", "price": 1}, "2026-09-20T00:00:00+00:00")
    assert conn.read("w1").outcome == FetchOutcome.SUCCEEDED
    conn.disconnect()
    h = conn.health()
    fr = conn.read("w1")
    d = conn.discover()
    return (h.lifecycle == Lifecycle.REVOKED
            and fr.outcome == FetchOutcome.FAILED
            and d.error_class == ErrorClass.AUTH_REQUIRED,
            {"health": h.lifecycle.value, "read_outcome": fr.outcome.value})


@test("sanitize.hostile_html")
def t_sanitize(conn: Connector, r: Runner):
    _connect_ok(conn, r)
    conn.seed("w1", {"name": "<script>alert(1)</script>Clean",
                     "desc": 'x" onmouseover="evil()'},
              "2026-09-20T00:00:00+00:00")
    fr = conn.read("w1")
    o = fr.observations[0]
    dirty = "<script" in o.fields["name"] or "onmouseover" in o.fields["desc"]
    return (fr.outcome == FetchOutcome.SUCCEEDED and not dirty
            and o.fields["name"] == "Clean",
            {"name": o.fields["name"], "desc": o.fields["desc"]})
