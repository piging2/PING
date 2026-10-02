import json
from jsonschema import Draft7Validator

schema = json.load(open("src/tenanos/memory/MemoryCandidate.schema.json"))
print("JSON well-formed: OK")
Draft7Validator.check_schema(schema)
print("Draft-07 meta-schema valid: OK")

v = Draft7Validator(schema)

def valid(i):
    return list(v.iter_errors(i)) == []

pos = {
    "candidate_id": "cand:" + "a" * 16,
    "schema_version": "1.0.0",
    "tenant": "core::tenants",
    "actor": "worker-1",
    "created_at": "2026-09-24T01:00:00Z",
    "kind": "fact",
    "content": "The site serves decaf.",
    "confidence": 0.9,
}
assert valid(pos), "positive should validate"
print("positive candidate: ACCEPTED")

neg = [
    ("missing tenant", {k: x for k, x in pos.items() if k != "tenant"}),
    ("missing actor", {k: x for k, x in pos.items() if k != "actor"}),
    ("missing confidence", {k: x for k, x in pos.items() if k != "confidence"}),
    ("oversized content", dict(pos, content="x" * 8193)),
    ("unknown kind", dict(pos, kind="vibe")),
    ("bad candidate_id", dict(pos, candidate_id="bad")),
    ("bad schema_version", dict(pos, schema_version="2.0.0")),
    ("bad tenant pattern", dict(pos, tenant="no-separator")),
    ("confidence out of range", dict(pos, confidence=2.0)),
    ("extra property (status)", dict(pos, status="promoted")),
    ("empty actor", dict(pos, actor="")),
    ("too many evidence_refs", dict(pos, evidence_refs=["e%d" % i for i in range(33)])),
]
for name, inst in neg:
    errs = list(v.iter_errors(inst))
    assert errs, name + " should be REJECTED"
    print("negative", name, ": REJECTED")
# explicit-null confidence is valid per schema
assert valid(dict(pos, confidence=None))
print("explicit-null confidence: ACCEPTED (expected)")
print("ALL GATES PASS")
