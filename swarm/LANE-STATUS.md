# Lane status — updated 2026-09-24 ~15:46 MDT

| Lane | Worker | Status | Notes |
|---|---|---|---|
| A re-observe/provenance | 75e8fb4a COMPLETED | ledger done | [lane-a-ledger.md](sandbox://workspace/swarm/lane-a-ledger.md); successor findings folded into frontier |
| B/C TRADESMAN | ae77b28b (parent's coordinator) | ACTIVE | NOT my child; steering relay needed via parent |
| D owner write->regen->readback | 77f4f10d | ACTIVE | projection-loop P0 + one-click lens |
| E Ask FYD | de8f0dc3 | ACTIVE | |
| F ORCA chaos | ecddbb6c | ACTIVE | sandbox/fake providers only |
| G idempotency | 8c3a6101 | ACTIVE | |
| H TenantOS isolation | dba28817 | ACTIVE | safe probes only |
| I event authority | 97eba648 | ACTIVE | |
| R-DESIGN trades design research | 77c0e4b5 | ACTIVE | generic rules -> TRADESMAN ceiling |
| SRE-ENGAGE engagement reliability | d018d676 | ACTIVE | read-only watch thru 2026-09-25 09:00 revert |
| J-Z | — | QUEUED | expand as capacity allows |
| GW-REP gateway /events auth repair | 48ffeb0c COMPLETED | 3 priorities scratch-proven (auth backport 7 routes 401; W-1/W-2 retry identity; bridge tenant-namespace); recommends patched candidate over rollback; patch owner-ready, needs clean-branch application |
| OBS-TRIP dormant-authority tripwire | 91005aed COMPLETED | baseline seeded (0/0 rows, 1 journal process), alert path tested live, QUIET; cron dormant-authority-tripwire every 2h, alert-only, first run ~17:52 MDT |
| GW-BUILD gateway repair build/certify | 840cec27 COMPLETED | VERIFIED SUCCESS: commits bb3e73c+8d252ba on gateway/auth-repair-20260924 (not pushed); image ping-gateway:repair-cert-20260924 sha256:4472c543...; all proofs pass; leakage clean; NOTHING DEPLOYED |
| EDGE-1 edge-object interaction correction | fcb69f5d COMPLETED (code) | 227/227 jest green, Q2 edge attack green in jest, committed c115f98+ce1da5c; BLOCKED: built on base 6ad6a04 (e474c89b unavailable in sandbox repo) -> port to real FYD tree pending; Pig SSH DOWN 2026-09-24 ~16:17 MDT (proxy broken pipe x2); 375x812 15/15 browser proof delegated to parent |
| ACQ-1 SSRF-hardened acquisition seam | c4f3b39a COMPLETED | VERIFIED SUCCESS 58/58 hostile battery, tsc clean; seam in ~/workspace/acquisition-seam/; worktree uncreatable in sandbox; successor = integration mission (merge, converge safe-fetch.ts, wire intake) |
| D-SHIP D-IMPL ship+verify | PENDING | Pig SSH flaky: GW-BUILD lane reported recovery ~16:32 MDT but 3/3 orchestrator probes since failed; pig-ssh-watch re-armed (30m, alert-only); spawn D-SHIP on confirmed PIG_OK |

| pig-ssh-watch | cron re-armed | 30m alert-only; spawn D-SHIP then EDGE-1 port on confirmed recovery |
