# B9: approval digest substitution (holds) + attribution forgery

`b9-approval-attribution.py` runs the REAL approval primitive
(`mc-approval/approval_request.py`, stdlib-only, read-only copy from the Pig
worktree at HEAD 0264d517) against a scratch store. The journal event sink is
stubbed; that seam does not affect the authorization logic under test.

Findings:

- CONTROL: digest substitution is refused (`digest_mismatch`), no state change.
  The primitive compares the presented digest to the recorded digest with exact
  string equality; the HTTP route additionally enforces 64-char lowercase hex.
- ATTACK: with the correct digest (visible via the unauthenticated GET
  `/api/mc/approvals?proposal_id=`) and any self-asserted `approver` string,
  the transition is APPROVED and the record/journals the caller-supplied
  identity verbatim. The route takes `approver` from the request body (default
  `'nolan:demo-owner'`) and performs no caller authentication (middleware.ts
  does no auth; only dispatch + tenant-gate use `x-mc-caller-key`). Observed
  read-only: `:3100` listens on `*:3100`, not localhost-only.

Verdict: WHAT is bound by the digest; WHO is self-certified.

Replay: `python3 b9-approval-attribution.py` (writes only `./scratch-store.json`)
