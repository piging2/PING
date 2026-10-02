# INTEGRATION-REQUEST-proto.md
From: LANE PROTO (protocol projections) — 2026-09-23
To: FYD factory lane owner (owns src/app/api/fyd/ and src/fyd/ in the PING repo)

## Request
Add an alternate-projection read surface to the FYD website, per the spec in
this lane's MINIMAL-PING-WRAPPER.md. Summary:
- Two pure projector modules under src/fyd/projections/ (project-jsonld.ts,
  project-text.ts) + fact-list adapter, reusing PingObjectReader visibility
  and the inverse of structured-data.ts LITERAL_FACTS.
- One thin route: GET /api/fyd/projection/alternate?siteId=&kind=jsonld|text,
  serving application/ld+json or text/plain.
- Read-only; zero new dependencies; ~400 lines + tests.

## Why
Proves the optionality test on the real object graph: the website renderer is
replaceable, business facts survive in machine-readable (SEO/API) and
human-readable (CLI/SMS/print/accessibility) shapes. Full evidence:
spike/run.sh (38/38 checks green) and STATE.md in this lane dir.

## Constraints
- Do NOT touch the constitutional sprint WIP; land only on a lane worktree or
  as a reviewed uncommitted diff per the program commit policy.
- Visibility policy must be PingObjectReader's (lane G's policy), enforced at
  projection time — projectors withhold private facts by construction.
- Keep the "projection, not authority" labeling (isProjectionNotAuthority,
  banner, inputHash) — a consumer must not mistake output for canonical truth.
