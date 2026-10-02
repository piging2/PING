# Contract test kit run: fake-widget-crm
ran_at: 2026-09-24T01:39:28.463673+00:00
result: 17/18 passed

- [PASS] declaration.complete (0ms)
- [PASS] auth.success (0ms)
- [PASS] auth.denial (0ms)
- [PASS] auth.expired (0ms)
- [PASS] discovery.initial (0ms)
- [PASS] refresh.incremental (0ms)
- [PASS] checkpoint.resume (0ms)
- [PASS] input.duplicate (0ms)
- [PASS] input.changed (0ms)
- [PASS] input.deletion (0ms)
- [PASS] ratelimit.exhaustion (0ms)
- [PASS] timeout.outcome_unknown (0ms)
- [PASS] payload.malformed (0ms)
- [FAIL] secrets.redaction (0ms)
    evidence: {"blobs_scanned": 4, "hits": [{"blob": 0, "pattern": "sk_(live|test)_[A-Za-z0-9]{8,}", "match_prefix": "sk_live_4eC39HqLyjWDarjt..."}, {"blob": 1, "pattern": "ghp_[A-Za-z0-9]{20,}", "match_prefix": "ghp_abcdefghijklmnopqrst..."}]}
- [PASS] normalize.determinism (0ms)
- [PASS] observation.provenance (0ms)
- [PASS] lifecycle.revoke (0ms)
- [PASS] sanitize.hostile_html (0ms)
