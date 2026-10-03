# Live runbook: first bounded POST to the PING gateway

## Proven so far (2026-10-03, no credential)

- Dry-run: `build_packet` on allowlisted `ping-workspace`
  (`refs/heads/ingestion/github-2026-10-02`, 25 commits) produces
  26 observations (1 `GIT_REF_OBSERVED` + 25 `GIT_COMMIT_OBSERVED`),
  status `OK`, 0 quarantines. `post_packet(dry_run=True)` builds all
  26 `/ingest` wire bodies; every body validates
  (`source`/`eventType`/`payload`, `sourceIdentity`, `rawPayloadHash`
  present; bearer key never in body).
- Gateway liveness + auth: Pig-side POST to
  `http://127.0.0.1:8080/ingest` with an invalid bearer key returns
  `401 {"status":"denied","reason":"Invalid or expired credential",
  "code":"INVALID_CREDENTIAL"}`. The gateway is up, the route is
  correct, auth is enforced, and a rejected credential writes nothing.

## Live POST (requires a valid exterior-agent bearer key)

Preconditions: allowlist entry `active`; gauntlet 28/28 green on the
exact engine commit being run; gateway reachable (401 probe above).

The bearer key is read **Pig-side at runtime only** and is **never
persisted in files, logs, or reports**. It arrives via the
`PING_INGEST_BEARER_KEY` environment variable (see
`ingest_client._resolve_bearer_key`), set in the invoking shell only.

```bash
# ON THE PIG (or any host with gateway route + key in env):
# 1. re-run the gauntlet green on this commit (proof/)
# 2. dry-run first:
PING_INGEST_BEARER_KEY='<key>' \
PYTHONPATH=/home/hatch/workspace/git-ingestion/src \
  /home/hatch/workspace/git-ingestion/.venv/bin/python - <<'EOF'
from git_ingest import clone, packet, ingest_client
repo = clone.open_repo_readonly("/home/hatch/workspace")
pkt = packet.build_packet(repo_id="ping-workspace", repo=repo,
    ref_allowlist=["refs/heads/ingestion/github-2026-10-02"],
    max_commits=25)
assert pkt.status == "OK", pkt.status
res = ingest_client.post_packet(pkt, gateway_url="http://127.0.0.1:8080",
                                dry_run=True)
print("would post:", res["count"])
EOF
# 3. bounded live post: SAME script, dry_run=False, max_commits=3 first.
#    post_packet returns per-request {status, ok}; any non-2xx aborts
#    the run for inspection (fail closed, never blind-retry).
```

Idempotency: every observation carries `logicalId = sourceIdentity`
(`sha256("git|ping-workspace|<sha>|<sha>")`-family). Re-posting the same
packet is a safe no-op downstream (`ON CONFLICT DO NOTHING`); a changed
ref target produces a new `sourceVersion` and therefore a new identity.

Verification: after the POST, confirm the 3 (then 25) `logicalId`s are
present in `ping_events` (or via the gateway read path). Record the
returned event IDs in the allowlist history table.

## What is NOT authorized by this runbook

- Posting any repo not on the allowlist.
- Raising `max_commits_per_run` without an allowlist update.
- Retrying a failed POST without inspecting the per-request result.
- Storing the bearer key anywhere except the transient invoking shell.
