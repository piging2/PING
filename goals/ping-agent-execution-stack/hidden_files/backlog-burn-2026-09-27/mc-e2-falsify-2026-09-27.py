import json, os, sys, tempfile
sys.path.insert(0, '/home/hatch/workspace/mission-control')
import mission_intent as mi

TENANT = "happy-place-test"
ACTOR = "tester"

class FakeExecutor(mi.Executor):
    name = "fake"
    def __init__(self): self.calls = 0
    def execute(self, intent, work_order):
        self.calls += 1
        return {"status": "completed", "summary": "fake ok", "artifacts": []}

def ctx():
    return mi.AuthenticatedContext(agent_id="hermes", tenant=TENANT,
                                   entitled_tenants=frozenset([TENANT]))

def make_intent(key, pass_id="p1", extra_inputs=None):
    inputs = {"pass_id": pass_id, "dry_run": True}
    if extra_inputs: inputs.update(extra_inputs)
    return {
        "mission_class": "spine-observe-dry-run",
        "actor": ACTOR, "tenant": TENANT,
        "capability": "fixture.read",
        "inputs_hash": mi.canonical_inputs_hash(inputs),
        "idempotency_key": key,
        "inputs": inputs,
        "event_bind": {"pass_id": pass_id},
    }

tmp = tempfile.mkdtemp(prefix="mc-e2-")
journal = os.path.join(tmp, "events.jsonl")
ex = FakeExecutor()

# 1. first submit -> dispatched, executor called once
r1 = mi.submit(make_intent("K-1"), "hermes", {"read_only": True, "no_writes": True, "no_network": True, "no_canonical_events": True, "no_mission_state_writes": True}, ex,
               journal_file=journal, auth_ctx=ctx())
assert r1["outcome"] == "dispatched" and ex.calls == 1, r1
print("1. first submit dispatched, executor_calls=1 OK")

# 2. identical resubmit -> duplicate-suppressed, executor NOT called again
r2 = mi.submit(make_intent("K-1"), "hermes", {"read_only": True, "no_writes": True, "no_network": True, "no_canonical_events": True, "no_mission_state_writes": True}, ex,
               journal_file=journal, auth_ctx=ctx())
assert r2["outcome"] == "duplicate-suppressed" and r2["duplicate"] and ex.calls == 1, r2
print("2. identical resubmit duplicate-suppressed, executor_calls still 1 OK")

# 3. same key, DIFFERENT bytes -> E2 fail-closed refuse
try:
    mi.submit(make_intent("K-1", extra_inputs={"tampered": True}), "hermes",
              {"read_only": True, "no_writes": True, "no_network": True, "no_canonical_events": True, "no_mission_state_writes": True}, ex, journal_file=journal, auth_ctx=ctx())
    print("3. FAIL: E2 collision NOT refused")
except mi.IntentDispatchError as e:
    assert "E2" in str(e) or "different canonical intent" in str(e), str(e)
    print("3. E2 collision refused OK:", str(e)[:80])

# 4. different key, same bytes -> fresh dispatch (no false dedupe)
r4 = mi.submit(make_intent("K-2"), "hermes", {"read_only": True, "no_writes": True, "no_network": True, "no_canonical_events": True, "no_mission_state_writes": True}, ex,
               journal_file=journal, auth_ctx=ctx())
assert r4["outcome"] == "dispatched" and ex.calls == 2, r4
print("4. different key dispatched fresh, executor_calls=2 OK")
print("E2 FALSIFICATION: front door dedupes + E2-refuses correctly")
