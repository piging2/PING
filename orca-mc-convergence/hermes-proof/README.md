# Hermes Reached-Path Proof — Lane brief (2026-09-26)

**Question:** Reobserve the WSL bridge and PROVE the full path
Windows caller -> batch bridge -> PowerShell -> WSL Hermes -> exit status ->
artifact/result -> Mission Control event/evidence, across all 8 conditions.
Hermes becomes a real executor CANDIDATE only after this proof.

**Authority:** Nolan, `~/workspace/fyd-autonomy/batch5-owner-disposition.md`;
operating law O1-O17 in `~/workspace/fyd-autonomy/scratch/axioms.md`.

**Steering (coordinator):** verify AGAINST the orca-adapter spine
(`~/workspace/orca-adapter/adapter.js`, `outcomes.js`,
`vendor/external_agent_adapter.js`), not from scratch. Where the adapter's
envelope already covers a condition, proof = reobservation of that behavior +
the MC event/evidence leg. Uncovered conditions = precise defect reports.

## Proven path under test

```
dispatchExecution (orca-adapter/adapter.js)
 -> authorizeWorkOrder (vendored external_agent_adapter.js)   [AUTHORITY LEG]
 -> issueWorkOrder (deterministic work_order_id)
 -> dispatchHermes: spawnSync bash /home/hatch/workspace/bin/prompt-hermes.sh (prompt via stdin)
     -> scp prompt -> Pig C:\Windows\Temp\hermes-prompt.txt
     -> ssh nolan@100.79.154.43 'wsl -u nolan -- bash /mnt/c/Windows/Temp/hermes-run.sh'
         -> exec venv python C:\Windows\Temp\hermes-launch.py <prompt file>
             -> subprocess [VENV_PY, hermes_cli/main.py, -z, prompt]
 -> extractEnvelope (balanced-brace JSON scan of stdout)
 -> verifyResultEnvelope (vendored contract: binding, echoes, status, deadline)
 -> recordVerifiedResult (INJECTED UER only; null here -> recorded:false, honest)
 -> outcome {completed|failed|unknown|denied|escalated} + atomic artifact (temp+rename)
 -> MC event leg: mission-control/emit.py -> fyd-journal-gateway/events.jsonl (MC_* types)
```

The bridge is TRANSPORT, never authority. Authority is checked at
`authorizeWorkOrder` (capability allowlist, namespace, constraints,
identity fence) BEFORE any dispatch. Nothing in prompt-hermes.sh /
hermes-run.sh / hermes-launch.py checks authority.

## 8 conditions

1. success: exit 0 + artifact present + MC event emitted
2. nonzero exit: exact code captured, no silent swallowing (x-follow-run.ps1 lesson)
3. malformed invocation: typed error, no hang
4. timeout/cancellation: bounded wait, typed outcome
5. missing WSL
6. missing Hermes
7. interrupted worker mid-run
8. result after potential external effect -> EFFECT_UNKNOWN/HOLD, never inferred clean

## Rules of this lane

- HARMLESS prompts only (echo-level, read-only). No real external effects.
- Per-lane spend accounting in `spend.jsonl`; loop ceiling: one retry per
  condition on identical failure, then stop and report.
- Deterministic, rerunnable scripts; an independent falsifier may replay.
- No changes to live drivers or cron bodies. Allowed paths: this dir + /tmp.
- Zero-change outcomes are valid. If the bridge is healthy in all 8, say so and stop.
