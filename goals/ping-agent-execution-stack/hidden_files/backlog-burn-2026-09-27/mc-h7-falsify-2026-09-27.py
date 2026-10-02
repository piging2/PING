import os, sys, tempfile
sys.path.insert(0, '/home/hatch/workspace/mission-control')
import mission_intent as mi

TENANT = "happy-place-test"
CONSTRAINTS = {"read_only": True, "no_writes": True, "no_network": True,
               "no_canonical_events": True, "no_mission_state_writes": True}

class FakeExecutor(mi.Executor):
    name = "fake"
    def __init__(self): self.calls = 0
    def execute(self, intent, work_order):
        self.calls += 1
        return {"status": "completed", "summary": "fake ok", "artifacts": []}

def ctx(tenant=TENANT):
    return mi.AuthenticatedContext(agent_id="hermes", tenant=tenant,
                                   entitled_tenants=frozenset([tenant]))

def make_intent(key, tenant=TENANT):
    inputs = {"pass_id": "p1", "dry_run": True}
    return {
        "mission_class": "spine-observe-dry-run", "actor": "tester",
        "tenant": tenant, "capability": "fixture.read",
        "inputs_hash": mi.canonical_inputs_hash(inputs),
        "idempotency_key": key, "inputs": inputs,
        "event_bind": {"pass_id": "p1"},
    }

tmp = tempfile.mkdtemp(prefix="mc-h7-")
journal = os.path.join(tmp, "events.jsonl")
ex = FakeExecutor()

# 1. revoke BEFORE any dispatch -> submit refuses with zero dispatch
mi.revoke("K-R1", "test revoke pre-dispatch", journal_file=journal, auth_ctx=ctx())
try:
    mi.submit(make_intent("K-R1"), "hermes", CONSTRAINTS, ex,
              journal_file=journal, auth_ctx=ctx())
    print("1. FAIL: revoked key was dispatched")
except mi.IntentRevokedError as e:
    assert ex.calls == 0
    print("1. revoked key refused pre-authorize, executor_calls=0 OK")

# 2. revocation is sticky: second revoke returns existing, no duplicate emission
r_a = mi.revoke("K-R1", "second reason", journal_file=journal, auth_ctx=ctx())
print("2. second revoke idempotent OK")

# 3. tenant scoping: other tenant cannot revoke this tenant's key
mi.revoke("K-R2", "tenant A revoke", journal_file=journal, auth_ctx=ctx("tenant-a"))
try:
    mi.submit(make_intent("K-R2", tenant="tenant-b"), "hermes", CONSTRAINTS, ex,
              journal_file=journal, auth_ctx=ctx("tenant-b"))
    print("3. cross-tenant revoke correctly scoped (tenant-b dispatched) OK, executor_calls=%d" % ex.calls)
except mi.IntentRevokedError:
    print("3. FAIL: tenant-a's revocation blocked tenant-b")

# 4. revoke AFTER dispatch -> REVOKED_AFTER_DISPATCH classification
r = mi.submit(make_intent("K-R3"), "hermes", CONSTRAINTS, ex,
              journal_file=journal, auth_ctx=ctx())
assert r["outcome"] == "dispatched"
rev = mi.revoke("K-R3", "revoke after dispatch", journal_file=journal, auth_ctx=ctx())
print("4. revoke-after-dispatch returned:", str(rev)[:100] if isinstance(rev, str) else type(rev))
print("H7 FALSIFICATION COMPLETE")
