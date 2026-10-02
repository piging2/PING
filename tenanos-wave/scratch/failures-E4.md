# Failure classes — worker E4 (2026-09-24)

New typed failure/gap states discovered during evaluation of
P-20260923-010 / -011 / -014 / -090. Recorded here before any narration.

## FL-E4-001 — budgets.ts: `remaining` is root-scope, not caller-scope

- **Found in:** P-20260923-090 diff, `BudgetLedger.check()` / `consume()`.
- **Mechanism:** `check()` recurses to the parent chain and returns the
  rootmost ledger's result, so the `remaining` on a successful
  `CheckResult` is measured at the tenant root, not at the calling scope.
  A consumer reading it as "my scope's remaining" is misled.
- **Severity:** bounded. Fail-closed behavior is unaffected (denials name
  the correct scope via R1); only the informational `remaining` is
  scope-ambiguous.
- **Recommended integration fix:** document the invariant ("remaining is
  measured at the chain root") in the `CheckResult` type comment, or return
  scope-tagged remaining (`{ scope, remaining }`).
- **Status:** OPEN, handed to coordinator with eval-090.json.

## FL-E4-002 — in-process reserve-before-spend has no cross-process atomicity

- **Found in:** P-20260923-090 diff, `BudgetLedger.consume()`.
- **Mechanism:** check-then-record is synchronous and safe within one
  event loop, but two worker *processes* can both check-ok against a shared
  ceiling and both consume, overshooting it. The module is explicitly
  pure/in-process (no I/O), so this is a scope boundary, not a bug — but
  any durable cross-worker enforcement must go through a single ledger
  authority with atomic reserve (executor lane follow-up).
- **Status:** OPEN, documented boundary; not rejection-grade.

## FL-E4-003 — 010's throw-based `checkBeforeRequest` vs typed-value canon

- **Found in:** P-20260923-010 STATE notes ("checkBeforeRequest (throws
  BudgetExceeded)").
- **Mechanism:** a thrown budget error cannot be projected, journaled, or
  replayed as an enumerable outcome; it also bypasses the "exhaustion is
  never silent" rule when caught upstream by generic handlers.
- **Resolution:** standing coordinator decision (typed BUDGET_EXHAUSTED
  values are canonical) already covers this; 010 REJECTED as
  non-conforming duplicate of 090 (eval-010.json).
- **Status:** CLOSED by decision.

## FL-E4-004 — router must never synthesize candidates from an empty set

- **Found in:** P-20260923-011 design review.
- **Mechanism:** if the capability authority returns an empty authorized
  set, a router that "helpfully" falls back to a default provider silently
  widens authority. The staged implementation returns typed
  `NO_CANDIDATES` ("the router synthesizes nothing") instead.
- **Invariant:** candidate set in = candidate set out, subset only.
- **Status:** MITIGATED in staged impl (test: "denies with NO_CANDIDATES
  on an empty authorized set and synthesizes nothing").

## FL-E4-005 — 014 span attributes must never be read as evidence

- **Found in:** P-20260923-014 design review.
- **Mechanism:** a span is a projection of a journal event; treating OTel
  attributes as proof of what happened inverts the evidence hierarchy
  (journal = evidence authority, exporter = projection).
- **Mitigation:** module header states the rule; `tenant.event_id` on every
  span preserves the anti-join back to the evidence event.
- **Status:** MITIGATED in staged impl.
