# PHASE 0 - Event Authority Forensics
Status: PROVEN - verdict delivered 2026-09-23 ~20:05 MDT. Read-only; zero writes to any repo.

Repo (verified via pigwsl-run.sh):
- /home/nolan/projects/ping, branch fyd-factory, HEAD e48ef710cb889bf4d59b833ef9766067a9e2bbf0 (dirty WIP, untouched)
- Gateway runtime source: /home/nolan/ping-gateway-src; live container ping-gateway:devin-boundary2;
  key files sha256-identical between source and container (unified_event_runtime.js 2f56ba17…, gateway_runtime.js e295417f…)

Ledger:
- RESEARCHED: OWNERSHIP.md charter; Pig SSH access pattern (pigwsl-run.sh → wsl bash -c base64; direct ssh lands in cmd.exe)
- RESEARCHED: full event-path trace across ping repo, ping-gateway-src, container /app, and live ping-postgres (crx_runtime)
- PROVEN: canonical authority = UnifiedEventRuntime.emit → ping_events (739 live rows, sole non-test INSERT, schema+code match)
- FALSIFIED: ConstitutionalEventStore / IEventAuthority / AcquisitionManager / EventAuthority.computeEventIdFromEvent
  (all zero code occurrences); EventWriteAuthority as write path (events table 0 rows); EventReadAuthority as read path
  (repository_events 0 rows, live reads fall back to direct ping_events SQL); FYD sequence ordering (no sequence column);
  IdentityAuthority/HashAuthority on the live emit path (bypassed by inline SHA-256 over JSON.stringify)
- HARVESTED: nothing to import; this phase is forensic closure, not acquisition
- IEventAuthority implementation count: 0
- AcquisitionManager persistence seam: none exists - AcquisitionManager is UNWIRED; the real observation→event seam is
  POST /ingest → CanonicalizationService → UnifiedEventRuntime.emit (proven live)

NEXT: Phase 0 complete. Lane A / BCQ / CONN may build on: the single proven event authority (UnifiedEventRuntime),
the proven ingest seam (POST /ingest), and the honest gaps (no sequencing, no live streaming, replay is transcript-only).

BLOCKED: nothing. No credentials needed (all reads used existing SSH + local docker; DB read via container env,
no secrets extracted). Transient infra flakiness observed (session-metadata timeouts, one SSH banner timeout, one
service restart) - all retried successfully.
