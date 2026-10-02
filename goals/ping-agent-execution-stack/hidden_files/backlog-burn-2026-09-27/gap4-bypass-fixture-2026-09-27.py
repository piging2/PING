#!/usr/bin/env python3
"""Gap-4 regression fixture: bypass detector false positives.

Builds a scratch journal containing:
  (a) realistic engagement-pass MC_PASS_* lifecycle events (legacy
      engagement pipeline: pass_id in event_data, NO tenant), and
  (b) ONE genuine front-door execution of the migrated class
      spine-observe-dry-run (real mi.submit, FakeExecutor; terminal
      chains to a preceding MC_WORK_ORDER_ISSUED).

Then runs detect_bypass() and reports.

EXPECTED on the CURRENT (defective) detector:
  - unscoped: every engagement-pass event is a violation (false
    positives); the genuine execution is covered.
  - tenant='happy-place': 0 violations, but VACUOUSLY (every execution
    is filtered out before comparison because legacy events carry no
    tenant).

The FIXED detector (owner work: journal-visible execution marker
carrying mission_class + tenant + bind key/value, scanned instead of
the MC_PASS_ prefix) must return ZERO violations on this fixture:
engagement passes are not adapter executions, and the genuine
execution is covered.

Usage: python3 gap4-bypass-fixture-2026-09-27.py [--save PATH]
Without --save, uses a temp dir and prints the journal path.
"""
import json
import os
import sys
import tempfile

_HERE = os.path.dirname(os.path.abspath(__file__))
_MC = os.path.expanduser("~/workspace/mission-control")
for p in (_MC,):
    if p not in sys.path:
        sys.path.insert(0, p)
import emit as _emit
import mission_intent as mi
from frontdoor_adapters import detect_bypass

TENANT = "happy-place"
CONSTRAINTS = {"read_only": True, "no_writes": True, "no_network": True,
               "no_canonical_events": True, "no_mission_state_writes": True}


class FakeExecutor(mi.Executor):
    name = "fixture-fake"

    def execute(self, intent, work_order):
        return {"status": "completed", "summary": "fixture ok",
                "artifacts": []}


def ctx(tenant=TENANT):
    return mi.AuthenticatedContext(
        agent_id="hermes", tenant=tenant,
        entitled_tenants=frozenset([tenant]))


def build_journal(journal):
    # (a) three engagement passes, realistic lifecycle, no tenant.
    for n, plat in ((101, "x"), (102, "facebook"), (103, "instagram")):
        pid = "eng-%d" % n
        for etype, data in (
                ("MC_PASS_STARTED", {"actions_planned": 10}),
                ("MC_PASS_DISCOVERY_DONE", {"candidates": 40}),
                ("MC_PASS_CANDIDATES", {"candidates": 40, "eligible": 12}),
                ("MC_PASS_CLOSED", {"actions_landed": 10, "violations": 0})):
            _emit.emit_pass_event(etype, pid, plat, data, journal_file=journal)
    # (b) one genuine front-door execution of the migrated class.
    inputs = {"pass_id": "obs-1", "dry_run": True}
    intent = {
        "mission_class": "spine-observe-dry-run",
        "actor": "hermes",
        "tenant": TENANT,
        "capability": "fixture.read",
        "inputs_hash": mi.canonical_inputs_hash(inputs),
        "idempotency_key": "FIXTURE-OBS-1",
        "inputs": inputs,
        "event_bind": {"pass_id": "obs-1"},
    }
    r = mi.submit(intent, "hermes", CONSTRAINTS, FakeExecutor(),
                  journal_file=journal, auth_ctx=ctx())
    assert r["outcome"] == "dispatched", r
    return journal


def main():
    save = None
    if "--save" in sys.argv:
        save = sys.argv[sys.argv.index("--save") + 1]
    tmp = tempfile.mkdtemp(prefix="gap4-fixture-")
    journal = save or os.path.join(tmp, "events.jsonl")
    build_journal(journal)
    n_events = sum(1 for _ in open(journal))

    print("journal: %s (%d events)" % (journal, n_events))
    unscoped = detect_bypass(journal, "spine-observe-dry-run")
    scoped = detect_bypass(journal, "spine-observe-dry-run", tenant=TENANT)
    print("unscoped: covered=%s violations=%d" % (
        unscoped["covered"], len(unscoped["violations"])))
    for v in unscoped["violations"][:5]:
        print("  FALSE-POSITIVE %s %s pass_id=%s" % (
            v["event_type"], v["event_id"][:16], v["pass_id"]))
    if len(unscoped["violations"]) > 5:
        print("  ... +%d more" % (len(unscoped["violations"]) - 5))
    genuine_covered = "obs-1" in unscoped["covered"]
    print("genuine adapter execution covered: %s" % genuine_covered)
    print("tenant-scoped ('%s'): violations=%d (vacuous: legacy events "
          "carry no tenant)" % (TENANT, len(scoped["violations"])))
    fps = [v for v in unscoped["violations"]
           if str(v["pass_id"]).startswith("eng-")]
    print("RESULT: %d engagement-pass false positives, genuine covered=%s"
          % (len(fps), genuine_covered))


if __name__ == "__main__":
    main()
