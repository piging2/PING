#!/usr/bin/env python3
"""Deterministic tests for the audit/PII separation lane.

Covers mission-control/payload_lifecycle.py:
  - envelope split: immutable metadata + revocable payload_ref
  - inline payload allowed only for NON_SENSITIVE
  - secret-shape guard fails metadata carrying secret-shaped material
  - payload store put/get, subject never stored raw
  - lifecycle transitions forward only (or to ERASED)
  - superseding event links to superseded; old payload -> SUPERSEDED
  - erasure: metadata intact, payload gone, DATA_ERASURE_COMPLETED present
    with subject_digest and never the raw subject
  - redaction: content gone behind the reference, PAYLOAD_REDACTED present
  - retention policy: durations configurable, never hardcoded; sweep moves
    only where a dwell is configured; erasure never automatic

Hermetic: temp journal + temp payload store. All fixtures are synthetic
markers; no real secrets or PII anywhere.
Exit 0 = all green, 1 = any divergence.
"""

import json
import os
import sys
import tempfile
import time

FAILURES = []


def check(name, cond, detail=""):
    print(("PASS" if cond else "FAIL"), name, detail)
    if not cond:
        FAILURES.append(name)


THIS = os.path.dirname(os.path.abspath(__file__))
MC = os.path.normpath(os.path.join(THIS, ".."))
if MC not in sys.path:
    sys.path.insert(0, MC)

import payload_lifecycle as PL  # noqa: E402
import emit as EMIT  # noqa: E402

tmp = tempfile.mkdtemp(prefix="audit-payload-test-")
JOURNAL = os.path.join(tmp, "events.jsonl")
STORE = os.path.join(tmp, "store")
open(JOURNAL, "w").close()

SUBJECT = "synthetic-visitor-001"  # synthetic fixture, not a real person
SYNTH_TOKEN = "sk-SYNTHETIC-TEST-KEY-0123456789abcdef"  # shape only, not real


def read_journal():
    events = []
    with open(JOURNAL, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                events.append(json.loads(line))
    return events


def journal_blob():
    with open(JOURNAL, encoding="utf-8") as f:
        return f.read()


# ---- 1. envelope split -------------------------------------------------
store = PL.PayloadStore(STORE)
ref = store.put({"message": "synthetic visitor question",
                 "contact": "synthetic"},
                SUBJECT, payload_class=PL.PAYLOAD_CLASS_SENSITIVE,
                ref="pl_synth001")
md = PL.audit_metadata("visitor_message_received", "ask-fyd",
                       "conversation.ingest",
                       "mc:payload:pl_synth001",
                       PL.sha256_hex("evidence-synthetic"), "received",
                       timestamp="2026-09-26T19:00:00Z")
event, how = PL.emit_audit_event("MC_CHECKPOINT", md, payload_ref=ref,
                                 payload_class=PL.PAYLOAD_CLASS_SENSITIVE,
                                 event_id="mc-audit-synth001",
                                 journal_file=JOURNAL)
check("envelope appended", how == "appended")
check("envelope keeps journal contract",
      set(event) == {"event_id", "timestamp", "event_type", "aggregate_id",
                     "aggregate_type", "event_data"})
ed = event["event_data"]
check("envelope carries immutable metadata + ref, no inline secret",
      set(ed["metadata"]) == set(PL.METADATA_FIELDS)
      and ed["payload_ref"] == ref
      and ed["inline_payload"] is None
      and "metadata_digest" in ed)
check("metadata digest verifies",
      ed["metadata_digest"] == PL.metadata_digest(ed["metadata"]))
check("raw subject absent from journal", SUBJECT not in journal_blob())

# ---- 2. inline SENSITIVE is refused ------------------------------------
try:
    PL.build_audit_event("MC_CHECKPOINT", md,
                         inline_payload={"k": "v"},
                         payload_class=PL.PAYLOAD_CLASS_SENSITIVE)
    check("inline sensitive refused", False)
except PL.InlineSensitivePayloadError:
    check("inline sensitive refused", True)

# ---- 3. secret-shaped material in metadata fails the guard -------------
bad_md = dict(md)
bad_md["result"] = "api_key: " + SYNTH_TOKEN
try:
    PL.build_audit_event("MC_CHECKPOINT", bad_md)
    check("secret-shaped metadata fails guard", False)
except PL.SecretShapedMaterialError as e:
    check("secret-shaped metadata fails guard", True)
    check("guard error withholds the secret value",
          SYNTH_TOKEN not in str(e) and "withheld" in str(e))

# ---- 4. unknown event type is refused -----------------------------------
try:
    PL.build_audit_event("NOT_A_TYPE", md)
    check("unknown event type refused", False)
except ValueError:
    check("unknown event type refused", True)

# ---- 5. store roundtrip, subject never raw ------------------------------
got = store.get(ref)
check("payload roundtrip", got["message"] == "synthetic visitor question")
entry = store.entry(ref)
check("manifest holds digest, never raw subject",
      entry["subject_digest"] == PL.subject_digest(SUBJECT)
      and SUBJECT not in json.dumps(entry))
check("manifest initial state ACTIVE", entry["state"] == "ACTIVE")

# ---- 6. lifecycle forward only ------------------------------------------
store.transition(ref, "STALE", reason="aging")
check("forward transition ACTIVE->STALE ok",
      store.entry(ref)["state"] == "STALE")
try:
    store.transition(ref, "ACTIVE", reason="rewind")
    check("backward transition refused", False)
except PL.IllegalTransitionError:
    check("backward transition refused", True)
try:
    store.transition(ref, "NOPE", reason="bad")
    check("unknown state refused", False)
except PL.PayloadLifecycleError:
    check("unknown state refused", True)

# ---- 7. superseding ------------------------------------------------------
ref2 = store.put({"message": "synthetic visitor question (corrected)"},
                 SUBJECT, payload_class=PL.PAYLOAD_CLASS_SENSITIVE,
                 ref="pl_synth002")
store.transition(ref, "SUPERSEDED", reason="superseded by pl_synth002")
md2 = PL.audit_metadata("visitor_message_corrected", "ask-fyd",
                        "conversation.ingest",
                        "mc:payload:pl_synth002",
                        PL.sha256_hex("evidence-synthetic-2"), "received",
                        timestamp="2026-09-26T19:05:00Z")
ev2, how2 = PL.emit_audit_event(
    "MC_CHECKPOINT", md2, payload_ref=ref2,
    payload_class=PL.PAYLOAD_CLASS_SENSITIVE,
    supersedes="mc-audit-synth001", event_id="mc-audit-synth002",
    journal_file=JOURNAL)
check("superseding event appended", how2 == "appended")
check("superseding event links to superseded",
      ev2["event_data"]["supersedes"] == "mc-audit-synth001")
check("old payload marked SUPERSEDED",
      store.entry(ref)["state"] == "SUPERSEDED")
check("old payload content still retrievable while superseded",
      store.get(ref)["message"] == "synthetic visitor question")

# ---- 8. erasure ----------------------------------------------------------
event_e, how_e, erased = store.request_erasure(
    SUBJECT, "visitor-deletion-request", journal_file=JOURNAL,
    actor="privacy-officer", at="2026-09-26T19:10:00Z")
check("erasure emitted DATA_ERASURE_COMPLETED",
      event_e["event_type"] == "DATA_ERASURE_COMPLETED" and how_e == "appended")
ed_e = event_e["event_data"]
check("erasure event carries subject_digest, policy, refs",
      ed_e["inline_payload"]["subject_digest"] == PL.subject_digest(SUBJECT)
      and ed_e["inline_payload"]["policy"] == "visitor-deletion-request"
      and sorted(ed_e["inline_payload"]["erased_refs"]) == ["pl_synth001",
                                                             "pl_synth002"])
check("erasure metadata intact in journal",
      ed_e["metadata"]["action"] == "data_erasure_completed"
      and ed_e["metadata"]["result"] == "erased"
      and ed_e["metadata_digest"] == PL.metadata_digest(ed_e["metadata"]))
check("raw subject absent from journal after erasure",
      SUBJECT not in journal_blob())
for r in ("pl_synth001", "pl_synth002"):
    check("payload %s state ERASED" % r, store.entry(r)["state"] == "ERASED")
    try:
        store.get(r)
        check("payload %s content gone" % r, False)
    except PL.PayloadGoneError:
        check("payload %s content gone" % r, True)
try:
    store.transition("pl_synth001", "ACTIVE", reason="resurrect")
    check("ERASED is terminal", False)
except PL.IllegalTransitionError:
    check("ERASED is terminal", True)

# erasure event idempotency: same inputs -> duplicate-skipped
_, how_e2, erased2 = store.request_erasure(
    SUBJECT, "visitor-deletion-request", journal_file=JOURNAL,
    actor="privacy-officer", at="2026-09-26T19:10:00Z")
check("repeat erasure is duplicate-skipped",
      how_e2 == "duplicate-skipped" and erased2 == [])

# ---- 9. redaction ---------------------------------------------------------
ref3 = store.put({"note": "operator pasted " + SYNTH_TOKEN + " by mistake"},
                 "synthetic-operator-002",
                 payload_class=PL.PAYLOAD_CLASS_SENSITIVE,
                 ref="pl_synth003")
event_r, how_r = store.redact(ref3, "accidental secret in payload",
                              journal_file=JOURNAL,
                              actor="privacy-officer",
                              at="2026-09-26T19:15:00Z")
check("redaction emitted PAYLOAD_REDACTED",
      event_r["event_type"] == "PAYLOAD_REDACTED" and how_r == "appended")
check("redacted payload state SUPPRESSED",
      store.entry(ref3)["state"] == "SUPPRESSED")
try:
    store.get(ref3)
    check("redacted content gone", False)
except PL.PayloadGoneError:
    check("redacted content gone", True)
check("redaction event metadata intact",
      event_r["event_data"]["metadata"]["action"] == "payload_redacted"
      and event_r["event_data"]["payload_ref"] == ref3)
check("redaction tombstone recorded",
      store.entry(ref3)["tombstone"]["kind"] == "redaction")

# ---- 10. retention policy: durations configurable, never automatic erase -
pol = PL.RetentionPolicy({"ACTIVE": 0}, name="test-zero-dwell")
check("policy exposes configured dwell", pol.dwell("ACTIVE") == 0)
check("policy returns None for unconfigured state",
      pol.dwell("STALE") is None)
ref4 = store.put({"note": "aging payload"}, "synthetic-subject-004",
                 payload_class=PL.PAYLOAD_CLASS_NON_SENSITIVE,
                 ref="pl_synth004", at="2020-01-01T00:00:00Z")
applied = store.sweep(pol)
check("sweep transitions ACTIVE->STALE when dwell configured",
      (ref4, "ACTIVE", "STALE") in applied
      and store.entry(ref4)["state"] == "STALE")
applied2 = store.sweep(pol)
check("sweep is a no-op where no dwell configured", applied2 == [])

pol2 = PL.RetentionPolicy({"SUPPRESSED": 0}, name="test-no-auto-erase")
store.transition(ref4, "SUPPRESSED", reason="suppress",
                 at="2020-01-01T00:00:00Z")
applied3 = store.sweep(pol2)
check("sweep never auto-transitions into ERASURE_REQUESTED",
      applied3 == [] and store.entry(ref4)["state"] == "SUPPRESSED")

os.environ["MC_RETENTION_STALE_S"] = "3600"
pol3 = PL.RetentionPolicy.from_env()
check("policy reads dwell from env",
      pol3.dwell("STALE") == 3600 and pol3.dwell("ACTIVE") is None)
del os.environ["MC_RETENTION_STALE_S"]

with open(os.path.join(tmp, "policy.json"), "w") as f:
    json.dump({"name": "json-test",
               "dwell_seconds": {"ACTIVE": 60}}, f)
pol4 = PL.RetentionPolicy.from_json_file(os.path.join(tmp, "policy.json"))
check("policy reads dwell from json file",
      pol4.dwell("ACTIVE") == 60 and pol4.name == "json-test")

# ---- 11. new types registered on the existing emit path ------------------
check("DATA_ERASURE_COMPLETED registered",
      "DATA_ERASURE_COMPLETED" in EMIT.MC_EVENT_TYPES)
check("PAYLOAD_REDACTED registered", "PAYLOAD_REDACTED" in EMIT.MC_EVENT_TYPES)

# ---- 12. regression: falsifier defects fixed ------------------------------
# Defect 1: provider-prefix secret shapes are rejected by audit_metadata().
SMUGGLED_SHAPES = {
    # all synthetic fixtures; AKIAIOSFODNN7EXAMPLE is the AWS doc example key
    "aws_access_key_id": "deployed with key id AKIAIOSFODNN7EXAMPLE today",
    "stripe_live_secret_key": "charged sk_live_SYNTHETIC1234567890 ok",
    "github_fine_grained_pat":
        "used github_pat_SYNTHETIC_abcdefghijklmnop1234567890 here",
}
for shape_name, shaped_value in SMUGGLED_SHAPES.items():
    try:
        PL.audit_metadata("act", "actor", "cap", "ref",
                          PL.sha256_hex("evidence"), "result " + shaped_value)
        check("smuggled shape rejected: " + shape_name, False)
    except PL.SecretShapedMaterialError as e:
        check("smuggled shape rejected: " + shape_name, True)
        check("guard withholds smuggled value: " + shape_name,
              shaped_value not in str(e) and "withheld" in str(e))
    try:
        PL.build_audit_event("MC_CHECKPOINT", dict(md, result=shaped_value))
        check("smuggled shape blocked at envelope: " + shape_name, False)
    except PL.SecretShapedMaterialError:
        check("smuggled shape blocked at envelope: " + shape_name, True)

# Defect 2: direct transition to ERASED is refused; the erasure flow still
# works.
ref5 = store.put({"note": "must not be orphaned"}, "synthetic-subject-005",
                 payload_class=PL.PAYLOAD_CLASS_NON_SENSITIVE,
                 ref="pl_synth005")
try:
    store.transition(ref5, "ERASED", reason="bypass attempt")
    check("direct transition to ERASED refused", False)
except PL.IllegalTransitionError:
    check("direct transition to ERASED refused", True)
check("refused ERASED leaves state ACTIVE",
      store.entry(ref5)["state"] == "ACTIVE")
check("refused ERASED leaves content intact",
      store.get(ref5)["note"] == "must not be orphaned"
      and os.path.exists(
          os.path.join(STORE, "payloads", "pl_synth005.json")))
event_e5, how_e5, erased5 = store.request_erasure(
    "synthetic-subject-005", "regression-erasure", journal_file=JOURNAL,
    actor="privacy-officer", at="2026-09-26T19:20:00Z")
check("erasure flow still reaches ERASED",
      erased5 == ["pl_synth005"]
      and store.entry(ref5)["state"] == "ERASED"
      and not os.path.exists(
          os.path.join(STORE, "payloads", "pl_synth005.json"))
      and how_e5 == "appended"
      and event_e5["event_type"] == "DATA_ERASURE_COMPLETED")
try:
    store.transition(ref5, "STALE", reason="resurrect")
    check("post-erasure transition refused", False)
except PL.IllegalTransitionError:
    check("post-erasure transition refused", True)

# Defect 3: sweep dwell math is timezone-independent.
orig_tz = os.environ.get("TZ")
tz_store = PL.PayloadStore(os.path.join(tmp, "tz-store"))
tz_pol = PL.RetentionPolicy({"ACTIVE": 3600}, name="tz-regression")
for i, zone in enumerate(("America/Denver", "UTC", "Pacific/Kiritimati")):
    os.environ["TZ"] = zone
    time.tzset()
    tz_ref = "pl_tz%d" % i
    tz_at = time.strftime("%Y-%m-%dT%H:%M:%SZ",
                          time.gmtime(time.time() - 3600))
    tz_store.put({"k": "v"}, "tz-subject", ref=tz_ref, at=tz_at,
                 payload_class=PL.PAYLOAD_CLASS_NON_SENSITIVE)
    tz_applied = tz_store.sweep(tz_pol)
    check("sweep transitions 3600s-aged payload under TZ=" + zone,
          (tz_ref, "ACTIVE", "STALE") in tz_applied
          and tz_store.entry(tz_ref)["state"] == "STALE")
if orig_tz is None:
    del os.environ["TZ"]
else:
    os.environ["TZ"] = orig_tz
time.tzset()

# ---- 13. regression: follow-up scanner gaps (re-falsifier G1/G2) --------
# Defect 4 (G1): OpenAI project keys sk-proj-<tail> are rejected by
# audit_metadata() and blocked at the envelope. The plain sk- pattern
# never saw the proj- infix, so project keys smuggled past.
# Defect 5 (G2): the label aws_secret_access_key is caught by the
# secret_assignment label alternation even though underscores defeat the
# \b boundary around "secret" alone.
FOLLOWUP_SHAPES = {
    # all synthetic fixtures; nothing here is a real credential
    "openai_project_key":
        "deployed sk-proj-SYNTHETIC4fK9sD2mQ8vXzN1pL7wRtY6uH3jG0bN5cV8xA2sD9fK4mQ",
    "aws_secret_access_key_label":
        "rotated aws_secret_access_key="
        "wJalrXUtnFEMIKSYNTHETICbPxRfiCYEXAMPLEKEY",
}
for shape_name, shaped_value in FOLLOWUP_SHAPES.items():
    try:
        PL.audit_metadata("act", "actor", "cap", "ref",
                          PL.sha256_hex("evidence"),
                          "result " + shaped_value)
        check("followup shape rejected by audit_metadata: " + shape_name,
              False)
    except PL.SecretShapedMaterialError as e:
        check("followup shape rejected by audit_metadata: " + shape_name,
              True)
        check("followup guard withholds value: " + shape_name,
              shaped_value not in str(e) and "withheld" in str(e))
    try:
        PL.build_audit_event("MC_CHECKPOINT", dict(md, result=shaped_value))
        check("followup shape blocked at envelope: " + shape_name, False)
    except PL.SecretShapedMaterialError:
        check("followup shape blocked at envelope: " + shape_name, True)

print()
if FAILURES:
    print("FAILURES:", len(FAILURES), FAILURES)
    sys.exit(1)
print("ALL GREEN")
