# v2 read-fallback 3201-3250: cases 5-9 (fleet-acq-2, 2026-09-24)

Pattern-level sandbox proof. Lab: `fleet/work/fleet-acq-2/read_fallback_lab2.py`;
evidence: `readfallback2-evidence.json`. Applies to all 10 subjects (the
fallback contract is subject-independent; verified per subject in 3151-3200).

## case 5 (ORA-3201..3210): fallback disabled by config when freshness mandatory — PROVEN x10
Config flag off -> FreshnessRequired typed error, never a silent fallback.
Flag on -> labeled DERIVED served. Per-request require_fresh=True also refuses.
Three behaviors, all verified.

## case 6 (ORA-3211..3220): fallback decision table reviewed — PROVEN x10
8-cell table (primary up/down x fallback enabled/disabled x require_fresh):
primary up always serves FRESH; primary down + fallback enabled + not mandatory
serves DERIVED; every other cell fails typed (FRESHNESS_REQUIRED). All 8 cells
match the specified table.

## case 7 (ORA-3221..3230): client distinguishes via header/field — PROVEN x10
Every response carries X-Read-Freshness matching the body's freshness label:
DERIVED on fallback, FRESH on canonical. The client never has to guess.

## case 8 (ORA-3231..3240): fallback cache TTL bounded and documented — PROVEN x10
TTL 60 s documented; demo with 1 s TTL shows expiry -> revalidate (MISS), never
serve-stale-forever. Bounded staleness, not unbounded.

## case 9 (ORA-3241..3250): full outage -> typed UNAVAILABLE — PROVEN x10
Primary and fallback both down -> 503 with typed UNAVAILABLE body. Never an
empty 200, never a silent empty payload.
