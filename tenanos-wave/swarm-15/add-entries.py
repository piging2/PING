import json
from datetime import datetime, timezone

now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
with open("/home/hatch/workspace/tenanos-wave/STATE.json") as f:
    s = json.load(f)

ids = [p["id"] for p in s["proposals"]]
assert "P-20260923-103" not in ids and "P-20260923-104" not in ids, "ID collision"

e103 = {
  "id": "P-20260923-103",
  "title": "P0: Kit webhook requires HMAC signature + replay protection (fail-closed)",
  "swarm": "15",
  "writer": None,
  "status": "proposed",
  "files_touched": [
    "src/app/api/kit/webhook/route.ts",
    "src/lib/events.ts",
    "scripts/security-regression/d1-kit-webhook-regression.ts"
  ],
  "claimed_areas": [
    "src/app/api/kit/webhook/route.ts",
    "src/lib/events.ts",
    "scripts/security-regression/d1-kit-webhook-regression.ts"
  ],
  "diff_ref": "diffs/P-20260923-103.diff",
  "branch": None,
  "worktree": None,
  "base_commit": None,
  "commit": None,
  "integration_commit": None,
  "oracle_touch": False,
  "test_results": {
    "regression": {
      "command": "npx tsx scripts/security-regression/d1-kit-webhook-regression.ts",
      "checks": 4,
      "pass": True,
      "note": "4/4 FAIL pre-fix (unsigned->200, bad-sig->200, replay->2 events, no-secret->200); 4/4 PASS post-fix; tsc --noEmit clean on changed files"
    }
  },
  "failure_ledger": [],
  "decided_by": None,
  "notes": ("Target repo /home/nolan/projects/ping (website repo, NOT src/tenanos substrate). "
    "D1 from DEPENDENCIES-FOR-CONVERGENCE-WAVE.md. Live proof: route.ts has no verify/hmac/signature/timingSafeEqual refs, "
    "never calls kitAdapter.handleWebhook; logEvent called without provenance so replays duplicate. "
    "Fix: x-kit-signature HMAC-SHA256 over raw body vs KIT_WEBHOOK_SECRET (scheme matches kit-adapter.ts verifyKitSignature), "
    "timingSafeEqual, 503 fail-closed when secret unset, provenance-based replay dedupe via new optional logEvent 5th param. "
    "CAVEAT for coordinator/Nolan: Kit public docs do not document a webhook signature header; if Kit cannot sign, "
    "configure a signing proxy or accept removal of the route instead (route has no in-repo callers)."),
  "created_at": now,
  "updated_at": now
}

e104 = {
  "id": "P-20260923-104",
  "title": "P0: resource-download route gains auth token, URL allowlist, email validation",
  "swarm": "15",
  "writer": None,
  "status": "proposed",
  "files_touched": [
    "src/app/api/resources/download/route.ts",
    "scripts/security-regression/d2-resource-download-regression.ts"
  ],
  "claimed_areas": [
    "src/app/api/resources/download/route.ts",
    "scripts/security-regression/d2-resource-download-regression.ts"
  ],
  "diff_ref": "diffs/P-20260923-104.diff",
  "branch": None,
  "worktree": None,
  "base_commit": None,
  "commit": None,
  "integration_commit": None,
  "oracle_touch": False,
  "test_results": {
    "regression": {
      "command": "npx tsx scripts/security-regression/d2-resource-download-regression.ts",
      "checks": 6,
      "pass": True,
      "note": "5/6 attack cases SUCCEED pre-fix (only legit-flow check passes); 6/6 PASS post-fix; tsc --noEmit clean"
    }
  },
  "failure_ledger": [],
  "decided_by": None,
  "notes": ("Target repo /home/nolan/projects/ping (website repo, NOT src/tenanos substrate). "
    "D2 from DEPENDENCIES-FOR-CONVERGENCE-WAVE.md. Live proof: route.ts has zero in-repo callers (dead), no auth, "
    "no email validation, reflects resourceUrl as downloadUrl. Fix: Bearer RESOURCE_DOWNLOAD_TOKEN (timingSafeEqual, "
    "503 fail-closed), resourceUrl allowlist (RESOURCE_DOWNLOAD_ALLOWED_HOSTS or own-host default, https-only), "
    "email format validation before any Kit call. NOTE: route is dead code with no callers/UI/docs; coordinator may "
    "prefer outright removal over hardening."),
  "created_at": now,
  "updated_at": now
}

s["proposals"].extend([e103, e104])
s["updated_at"] = now
s["updated_by"] = "swarm-15"
with open("/home/hatch/workspace/tenanos-wave/STATE.json", "w") as f:
    json.dump(s, f, indent=2)
print("appended 103, 104; total:", len(s["proposals"]))
