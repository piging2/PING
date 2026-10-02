---
id: crx-runtime-convergence-sweep
title: CRX-runtime convergence sweep (6h)
enabled: false
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-28T12:13:02
  every: 6h
timeout_secs: 21600
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
You are running the recurring six-hour CRX-runtime convergence sweep ordered by Nolan on 2026-09-28. The standing order is recorded in ~/workspace/orca-mc-sprint/MUSE-CEO-MODE-100H-FOREVER.md under the sections "2026-09-28 ~06:12 MDT: CRX-RUNTIME CONVERGENCE ORDER", "2026-09-28 ~06:23 MDT: GO. KEEP MOVING." and "2026-09-28 ~06:24 MDT: TENANCY RULE". Read all three sections first.

TENANCY RULE (Nolan 2026-09-28 ~06:24 MDT, binding): HPP (Happy Place) and the piging2 website are TENANTS. EVERYTHING ELSE IS PING. Generic backend/kernel/runtime work that is not tenant-specific belongs in crx-runtime — PUSH TO CRX-RUNTIME. "Keep product-side" applies ONLY to genuinely tenant-scoped code (serving HPP or the piging2 website specifically). Re-examine prior KEEP verdicts under this rule each sweep.

Spawn ONE convergence subagent with this brief: execute one full sweep cycle — DISCOVER (inventory every active/recent worktree: REPO/PATH/BRANCH/HEAD/UPSTREAM/AHEAD-BEHIND/DIRTY/UNTRACKED/STAGED/UNPUSHED/LATEST-TESTED-SHA/SEMANTIC-OWNER/ACTIVE-WRITER/OVERLAP/CANDIDATES; reobserve first, never modify first) → FIND UNCOMMITTED/UNPUSHED BACKEND WORK → CLASSIFY OWNERSHIP by semantics under the tenancy rule (CRX-owned/converge now when it is PING substrate; tenant-scoped/keep when it serves only HPP or the piging2 website; shared/split only on an existing boundary, never manufacture one; experimental/do not promote; unknown/investigate — UNKNOWN DOES NOT GET PUSHED) → compare each candidate against the current CRX implementation and strongest alternative → CONVERGE only proven PING-owned semantics → clean gate → push → verify remote → record rollback → converge callers + retire proven duplication where existing authority permits → REPORT.

Rules: A mirror, a remote branch, a clean commit in another worktree, or a passing test on an implementation branch is not convergence. Active writer exists → READ ONLY, queue after handoff. One writer per semantic unit. No TenantOS promotion pipeline; normal Git is the mechanism. DNS-rebinding socket-pinning gap stays honestly open. Minimum re-examination set: secret redaction invariant, vocabulary gate, SSRF safe-fetch/effective-destination, tenant/identity primitives, HOLD/UNKNOWN/reconciliation, WRONG_JOURNAL/event/evidence/replay.

REPORT FORMAT (required every sweep) — a convergence ledger:
DISCOVERED: <n> candidate semantic units
ALREADY CANONICAL: <n>
CONVERGED: <n>
PRODUCT-OWNED: <n>
ACTIVE WRITER — DEFERRED: <n>
SUPERSEDED: <n>
UNPROVEN: <n>
UNKNOWN: <n>
For every converged unit: SOURCE → TARGET → SHA → INVARIANT → TEST → CALLERS → DUPLICATES → RETIREMENT → ROLLBACK.
First-class lines, always present:
WHAT REMAINS UNCOMMITTED? — every valuable uncommitted unit with its owner; local-only must be an explained exception, not the default.
SEMANTIC DEBT — scan for duplicate LIVE implementations of: secret redaction, URL safety, tenant validation, event writing, retry, HOLD, reconciliation, canonicalization, identity, executor outcomes, approval checking. A clean git tree is not proof of convergence.

The subagent's final report is your result. Return the ledger verdict-first. If the sweep finds nothing new to converge and no blockers, say so plainly with the inventory counts plus the WHAT REMAINS UNCOMMITTED and SEMANTIC DEBT lines. Observations go to the daily log ~/memory/YYYY-MM-DD.md, not MEMORY.md.
