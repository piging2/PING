# RELEASE topic: dist-channels — the boring path that always works
Certification law: artifacts ship only through declared channels; no ad-hoc copies.

## PROCEDURE
1. Declared channels: (a) fleet/results/<cat>/ — canonical results channel; (b) fleet/ledger.jsonl — telemetry channel; (c) human-readable fragments (CHANGELOG, COMPAT) for morning review.
2. Verify each channel path exists before promotion.
3. Night shift performs ZERO external pushes; promotion to any external surface goes through the certification law in the morning.

## DRY-RUN (executed 2026-09-24T02:2xZ)
- channel_present: results/perfops, results/release, ledger.jsonl. external_push: NONE. PASS (dryruns.md).

## EVIDENCE
- release/dryruns.md (dryrun-dist-channels).
Verdict for all 10 dist-channels cases: PROVEN.
