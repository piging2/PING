# MC event_bind reserved-key shadowing (2026-09-27)

Status: REAL defect, PROVEN by falsification harness. Not patched here.

File: `~/workspace/mission-control/mission_intent.py`

Location:
- `_intent_record()` around lines 395-407
- `validate()` around lines 360-370
- readers: `find_intent_record()` around line 761 and `_terminal_verified()`

Defect:
- `validate()` permits arbitrary `event_bind` keys.
- `_intent_record()` builds the required-field record, then calls
  `record.update(intent.get("event_bind") or {})`.
- Therefore an `event_bind` key named `tenant` or `idempotency_key`
  overwrites the packed record's required field.
- `intent_digest` is set after the merge, so it is still computed from
  the true validated intent.

Falsification:
- Harness: `mc-eventbind-shadow-2026-09-27.py`
- Control: ordinary bind keys preserve required fields.
- Hostile case:
  - true tenant: `tenant-a`
  - true key: `K-SHADOW-1`
  - event_bind: `{"tenant": "tenant-b", "idempotency_key": "K-SHADOW-2"}`
  - packed record tenant became `tenant-b`
  - packed record idempotency_key became `K-SHADOW-2`
  - packed intent_digest remained the digest of the true intent
  - `find_intent_record(journal, "K-SHADOW-1", tenant="tenant-a")`
    returned `None`

Impact:
- Tenant-scoped idempotency lookup can miss a real acceptance record.
- Terminal verification compares tenant, key, and digest between issuance
  and terminal; shadowing the required fields can orphan or mismatch the
  chain.
- E2 collision comparisons that read packed fields can disagree with the
  digest computed from validated intent.
- Same root cause applies to other reserved names merged at top level,
  including `mission_class`, `actor`, `capability`, and `inputs_hash`.
  `intent_digest` is protected only because it is assigned after the merge.

Required regression for the owner:
1. Add a failing-then-passing test with event_bind keys:
   `intent_version`, `tenant`, `idempotency_key`, `mission_class`, `actor`,
   `capability`, `inputs_hash`.
2. Assert the packed record preserves every validated required field
   exactly.
3. Assert tenant-scoped `find_intent_record()` finds the true key and
   tenant after the hostile bind is packed.
4. Acceptable fixes:
   - reject reserved keys in `validate()`; or
   - namespace event_bind under `"event_bind"` instead of merging it; or
   - merge bind keys only into a non-reserved sub-object.
5. Do not "fix" this by documenting that callers should avoid reserved
   names.

Queued for: Mission Control sprint owner.
