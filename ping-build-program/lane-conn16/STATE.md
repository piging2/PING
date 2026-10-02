# LANE CONN16 — Connectors / Git Ingestion (Agent 16) — STATE

## STATUS: INVESTIGATION COMPLETE (read-only; no implementation per mission)

Worker: agent 16 (subagent, night shift 2026-09-23). Coordinator: 14a1adc2.
Mission: parallel read-only investigation at full breadth. Implemented
nothing until Event/Witness contracts are certified. Nothing was connected;
no live credentials anywhere in this lane.

## DELIVERABLES (all in ~/workspace/ping-build-program/lane-conn16/)

- SOURCE-INVENTORY.md — Part 1: 9 sources inventoried (git, GitHub,
  Google Drive, email, web, RSS, files, generic APIs, business data),
  each with identity / acquisition / evidence shape / event mapping /
  provenance / dedup / refresh / deletion / replay semantics + shared
  record lines. Lane A and lane-conn work extended as deltas, never redone.
- SUBSTRATE-MAPPING.md — Part 2: every source mapped onto the BCQ 9-verb
  contract, lane-K dominant error classes, lane-R fixture backlog
  (14 proposed), lane-L handle plug points, lane-M checkpoint kinds;
  4 substrate gaps recorded (Nango verdict missing, taxonomy import path,
  per-source fixture backlog, phase0 event names).
- OAUTH-CONNECT-FLOW.md — Part 3 design: 7-step state machine
  (IDLE..INVENTORIED), PKCE-S256 required on every authorization-code
  flow, PAR+DPoP for ATProto, scope discipline (smallest set, per-scope
  why/what-breaks, granted-scopes read-back, no speculative write scopes),
  token containment rules, UI button policy.
- spike/connect_flow_spike.py — isolated fixture-only spike: 3 provider
  profiles (facebook, atproto, google-drive) + tampered-state fails-closed
  + partial-grant degradation + canary containment scan. ALL CHECKS PASS
  (stdlib only, no network).
- MORNING-QUEUE.md — Part 3 queue: 7 items (Facebook Pages, ATProto,
  Google Drive, Gmail, Stripe test mode, QuickBooks deferred,
  cross-refs to sibling lane-conn queue). Per scope: exact string, why
  needed, PKCE yes/no, what breaks without it. 5 decisions Nolan must
  make in the morning.

## LEDGER

- RESEARCHED: OWNERSHIP.md, COORDINATOR-STATUS.md, lane A (STATE + spike
  artifacts on disk), lane-conn GITHUB-CONNECTOR/BUSINESS-CONNECTOR/
  MORNING-QUEUE/STATE, lane BCQ (testkit contract, Airbyte harvest,
  incremental-state envelope), lane K (13-class taxonomy), lane L
  (secret broker design), lane R (fixture format), lane M (registry
  design), lane J (observability design), lane D (hostile-input contract),
  lane P (media design).
- RESEARCHED (web): Google Drive changes API (startPageToken/changes/
  newStartPageToken/410), Gmail history.list (startHistoryId/~1wk expiry/
  404), ATProto OAuth spec (PAR + PKCE S256 + DPoP mandatory, scope
  strings, sub/iss verification), Meta Graph API permission state
  (via sibling docs).
- DELTA RECORDED: lane A STATE.md NEXT steps 3-6 appear satisfied by
  existing spike artifacts on disk (engines, fixtures, redteam, packets);
  flagged for the lane A owner to confirm or rebut.
- IMPLEMENTED: spike/connect_flow_spike.py (fixture-only, allowed by
  mission: "design document + isolated spike, fixtures only").
- TESTED: spike 6/6 checks pass, rerun-clean (no network, deterministic
  except CSPRNG handles which are asserted by shape not value).
- FALSIFIED: "OAuth connect needs a new secret store" (lane L broker is
  the custody authority; the flow only produces issue() calls).
- BLOCKED: Event/Witness certification (mission-scoped, not a lane
  blocker for investigation); Nango ADOPT/ADAPT/REJECT verdict not on
  disk (BCQ-NANGO worker still running at time of write); phase0 event
  names unconfirmed (lane-M proposals used provisionally).
- NEXT (for the morning implementer, not tonight): run the connect flow
  against Nolan's picked account; add the 14 proposed lane-R fixtures;
  wire per-source adapters through the testkit.

## PROOF LEDGER (program format)

- EXTERNAL SYSTEMS EVALUATED: Drive API v3, Gmail API, ATProto OAuth,
  Meta Login/Graph, Stripe, QuickBooks, Square, Yelp (via sibling).
- PING MODULES HARVESTED: lane A git spike, lane-conn GitHub/GBP designs,
  lane D hostile-input contract, lane P media pipeline, BCQ testkit +
  Airbyte envelope, lane L broker, lane K taxonomy, lane R fixtures,
  lane M registry, lane J run records.
- DEPENDENCIES ADOPTED: 0 (investigation only; spike is stdlib).
- DEPENDENCIES REJECTED: 0 tonight (Nango verdict pending).
- HAND-WRITTEN INFRA AVOIDED: generic API reader framed as declarative
  streams over the existing substrate (no new SDK per provider).
- CONNECTORS PROVEN: 0 new (GitHub/GBP proven by sibling lanes).
- GIT INGESTION: delta recorded; lane A spike exists on disk.
- SECRET BOUNDARY: design + spike containment proven (canary scan clean).
- LINEAGE / ASK FYD: consumed (lane N supersede chains, lane G claim
  discipline) not duplicated.
- CUSTOMER LOOP: review-triggered outreach fed by GBP reviews leg
  (sibling design).
- FIRST BROKEN PRODUCT STEP: none found tonight in this lane's scope.
- HIGHEST-LEVERAGE INFRA GAP: Nango proxy verdict missing (blocks the
  proxy-mode custody story); per-source fixture backlog in lane R.
- NEXT: morning connect against Nolan's picks; fixture backlog; phase0
  event-name confirmation.

## Files

- SOURCE-INVENTORY.md, SUBSTRATE-MAPPING.md, OAUTH-CONNECT-FLOW.md,
  MORNING-QUEUE.md, STATE.md (this file)
- spike/connect_flow_spike.py
