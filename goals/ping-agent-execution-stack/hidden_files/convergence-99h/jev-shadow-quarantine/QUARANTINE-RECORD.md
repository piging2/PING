# jev-shadow quarantine record — 2026-09-30 ~17:15 MDT
Authority: CEO-ORDER-FOCUS-THE-SYSTEM-2026-09-30.md (Nolan, binding):
"QUARANTINE jev-shadow MISSIONS. NO OWNER = NO EXECUTION AUTHORITY."

## Blocking defect
`jev-shadow: emit JEV_DECISION_EVALUATED failed — No owner defined for namespace 'jev'`
Namespace-owner governance decision belongs to Nolan (CG-001). Explicitly out of scope here:
no namespace owner was assigned.

## Store located
`brain-postgres` container, database `ping_runtime`, table `public.ping_missions`
(the gateway's POSTGRES_HOST/DB; NOT the ping-postgres container's databases).

## Quarantined missions: 29 (all CLASSIFICATION_CREATE, all already terminal `failed`, retries=3)
4 from 2026-09-25 (the original poison pills), 25 exhausted during the 2026-09-30 22:12–22:13 UTC drain.

- 402152d14539171b
- 70e962a9d257c6dc
- a5dc21a36107b0a5
- 201b589ad959c6c0
- 4a8a31af5855c73f
- 3028d0c9caba4f08
- 3f33a15572ebd83a
- 8227eaddd067a2a4
- 4a878f99c0aec05e
- 80b0bb38e16ab236
- f94aa825abb14a91
- 72a3d86588f14745
- 7fbcde5e9ec06beb
- 6ac5eb27f4253ac3
- c9d1b3f076ada3dc
- 887bd42c2c651ac5
- 0eced9ef16399b40
- 600de936692e2f37
- b80937e94e898fc3
- ff195de5e7776aca
- b68291922958cce4
- 5eb453656e16fe79
- cb85841d2fde9794
- 49d045b2d5e631f6
- d58e06972199324b
- 9b9c33a1b46ccc05
- 0a4408925acbcb6a
- d6a654d35093cb29
- 812ab6b7d81d74d7

## Status choice (existing semantics only)
No `blocked` status exists in the mission lifecycle
(`created → assigned → running → completed/failed`, plus `retry_pending`).
All 29 were already in `failed`, which is a true terminal sink: no code path
transitions out of it — `getPending()` reads only `created` and due
`retry_pending`; `claimMission`/`startMission`/`completeMission`/`failWithRetry`
all require non-failed statuses; `reapExpiredLeases` only touches
`running`/`assigned`. `failed` is therefore the honest existing-semantics
equivalent of BLOCKED_OWNER_REQUIRED: non-executable, non-retryable.
No new status enum, table, or authority was created.

## Mark applied (2026-09-30, single transaction, predicate-guarded)
`result` JSONB annotated on exactly the 29 rows matching
`status='failed' AND error ILIKE '%No owner defined for namespace%'`:
`{"_quarantine": {"status":"BLOCKED_OWNER_REQUIRED",
"reason":"No owner defined for namespace 'jev' (jev-shadow); no execution authority without a namespace owner",
"quarantined_by":"CEO-ORDER-FOCUS-THE-SYSTEM-2026-09-30 P0 quarantine lane",
"release_authority":"CG-001 (Nolan)",
"release_condition":"namespace owner assigned for 'jev' by CG-001; until then no execution, no retry",
"semantics":"existing terminal failed sink; no new status enum, table, or authority created"}}`
The original `error` text (evidence of the defect) was NOT rewritten.

## Proof of non-visibility (post-change, live store)
- getPending-equivalent query
  (`status='created' OR (status='retry_pending' AND retry_at <= NOW())`)
  returns exactly 1 row: `3b0f430a06a41357` (INTELLIGENCE_RESEARCH,
  MarketingOS falsification test, unrelated to jev). Zero quarantined
  missions are scheduler-visible.
- All 29 quarantined rows remain `status='failed'`.
- No missions exist in `assigned`/`running`/`retry_pending` at all.
- No other mission in the store references `jev` in error or payload.

## Release condition
Only CG-001 (Nolan) assigning a namespace owner for `jev` releases this
quarantine. That authorization requires Nolan's five-proofs and is out of
scope for this lane.
