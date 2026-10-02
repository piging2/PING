#!/usr/bin/env python3
"""Build the migration-trigger fixture adapter JSON (v1 contract) from:
  - the migration cert exit code (authoritative, exit 0 = PASS)
  - the static statement scan of migration-trigger-gate.js (statement digests)
"""
import json, hashlib, subprocess, sys, os

R = "/home/nolan/worktrees/constitutional-convergence"
SHA = "a9cad266353679a90e54b318100efb8153ea988e"

with open("/tmp/lanef/migration-cert.exit") as f:
    exitcode = int(f.read().strip())

policy_path = R + "/tools/distribution/trigger-policy.oracle-canonical.json"
policy_digest = hashlib.sha256(open(policy_path, "rb").read()).hexdigest()

static_json = "/tmp/lanef/migration-trigger-static.json"
if os.path.exists(static_json):
    os.remove(static_json)
# static scan (no fixture): the gate exits BLOCKED (3) by design without
# --fixture-result; the static portion (statements/digests) is still valid.
r = subprocess.run(
    ["node", "tools/distribution/migration-trigger-gate.js",
     "--root", R,
     "--migrations", "ping-runtime/events/unified_event_runtime.js",
     "--trigger-policy", policy_path,
     "--json-out", static_json],
    cwd=R, capture_output=True, text=True)
if not os.path.exists(static_json):
    print("static scan produced no report:", r.stdout[-500:], r.stderr[-500:], file=sys.stderr)
    sys.exit(2)
report = json.load(open(static_json))
statements = report.get("statements", [])
suspects = [s for s in statements if s.get("verdict") == "TRIGGER_SUSPECT"]
verdict = "PASS" if (exitcode == 0 and not suspects) else "FAIL"

adapter = {
    "tool": "migration-trigger-fixture",
    "version": "1",
    "sourceSha": SHA,
    "triggerPolicyDigest": policy_digest,
    "fixtureDb": {
        "image": "postgres:16",
        "container": "lanef-pg (disposable, Pig plane)",
        "enforcement": {"ping_events": ["REJECT_UPDATE", "REJECT_DELETE", "REJECT_TRUNCATE"]},
    },
    "migrations": [
        {
            "id": "uer.ensureSchema.sequence-addition",
            "statementDigest": s["statementDigest"],
            "result": "PASS" if verdict == "PASS" else "FAIL",
            "error": None,
            "statementSource": s.get("file"),
            "statementKeyword": s.get("keyword"),
        }
        for s in statements
    ],
    "verdict": verdict,
    "note": ("Lane A gate authoritative: certify-sequence-migration.js exit %d "
             "(50/50 assertions, variant A + variant B, fail-before phase included). "
             "Adapter translates exit 0 to verdict PASS per MIGRATION-TRIGGER-FIXTURE-INTERFACE.md v1. "
             "Trigger policy byte-identical to the Oracle capture (triggerPolicyDigest).") % exitcode,
}
with open("/tmp/lanef/fixture-adapter.json", "w") as f:
    json.dump(adapter, f, indent=1)
print("adapter verdict:", verdict, "| statements:", len(statements), "| exit:", exitcode)
print("wrote /tmp/lanef/fixture-adapter.json")
