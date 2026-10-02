# PING Convergence Checkpoint — 2026-09-24

## Lane merge

- `lane/wave3-integrate` @ `04d33af88` (GREEN: Node Qdrant guard 190 modules,
  Python guard 66 modules, swarm-02 18/18, compose replay clean).
- Working lane `lane/converge-f01-hold` @ `55ad658cc` contains `04d33af88`
  as its base. `git merge lane/wave3-integrate` → "Already up to date."
- The green integration state is folded by construction. No new merge commit
  needed.

## F-01: constitutional PARK/HOLD (committed 55ad658cc)

TIMEOUT != FAILED. Unknown outcomes PARK durably as HOLD. Lease expiry only
reclaims assigned-not-started. Recovery via reconcileHold (retry requires
idempotency proof; fail is terminal). Tests: 12/12 watchdog, 8/8 lease
renewal, 13/13 durability, 8/8 lifecycle, 4/4 reaping.

## Gateway promotion: COMPLETE

- Candidate `ping-gateway:candidate-fffe99f7a` @
  `sha256:aa1f085a067383fb6226ffa00d13b70e63be17a5b67ca9810a493c23c5cd6d42`
  is LIVE on 8080, compose-managed, healthcheck healthy.
- P0 gate proven on the live instance: forged WITNESS_CREATED and
  JEV_DECISION_EVALUATED both rejected (HTTP 500, verdict_not_authorized),
  zero p0-proof rows persisted.
- Forensic: verdict sources only registered producers; ping_events 2429 =
  pre-cutover (zero unexpected mutation).
- Old container preserved as `ping-gateway-precutover` (stopped, not deleted)
  until 30-min soak passes.
- Healthcheck fix: localhost→127.0.0.1 (IPv6 resolution failure in node:18
  image). Compose file updated on Pig and locally.
- Pre-cutover snapshot: /home/nolan/pig-promotion/ (redacted inspect, image
  identity, health, DB markers).

## Event bypass classification

`gateway/event_bus.js` (ConstitutionalEventBus) is legacy/deprecated. Live
event types: PASS_COMPLETED, PASS_FAILED (ephemeral signals, compiler
telemetry). Dead: MissionGenerated/MissionStarted/MissionCompleted publishers
+ control_center_subscription. No canonical transitions flow through the bus.
Full classification: ~/workspace/event-bypass-classification.md.

## Qdrant

- Authoritative live plane: brain-qdrant (host 6333). Collections:
  constitutional_documents (26), constitutional_memory (0),
  knowledge (389).
- ping-qdrant: isolated, no consumers, API-key protected. Decommission
  candidate ONLY — no action taken.
- Integrated Python workers route via ProjectionAuthority.get_client().
- Full inventory: ~/workspace/qdrant-inventory.md.

## Vault

- ping-vault: dev-mode, unhealthy, in-memory. Secret categories inventoried
  (openai, anthropic, google, postgres, qdrant, jwt, google_drive).
- All consumers fall back to env vars. Migration HOLD.
- Full inventory: ~/workspace/vault-inventory.md.

## CosyVoice

- STOPPED. No authorized consumer found. Data preserved on host bind mounts.
- Restart: `cd /mnt/c/Users/nolan/qwen3-tts-docker && docker compose -f
  docker-compose.cosyvoice.yml up -d`
- Full record: ~/workspace/cosyvoice-status.md.

## FREEZE BACKLOG (do NOT execute)

Per 2026-09-24 freeze: no new PING cleanup beyond bounded close-out.
Backlogged deletion candidates:
1. code_generator subgraph (gateway/code_generator.js)
2. replay_worker.py
3. filesystem_worker.py
4. ping-qdrant decommission

Rationale: freeze requires canonical-truth risk, security-boundary risk,
active-FYD blockage, or live reliability failure for new core work. None
apply. These are ordinary cleanup, not P0.

## RECONCILIATION 1: Wave 3 deletion claim was inaccurate

Wave 3 reported deleting `constitutional_acquisition_runner.js` and
`tests/ingest.test.js`. The deletions NEVER LANDED:
- `/home/nolan/ping/gateway/constitutional_acquisition_runner.js` EXISTS
  (13,769 bytes).
- `/home/nolan/ping/gateway/tests/ingest.test.js` EXISTS.
Correction: Wave 3's claim was inaccurate. The files are still present.

## RECONCILIATION 2: 0983bc934 attribution

Commit 0983bc934 ("remove dead Qdrant constructions and dead events writers")
was dead-JS removal (3,732 deletions across 20 files, mostly JS modules).
Its Python changes were 6-8 line unused-import removals only. It did NOT
implement the Python Qdrant routing. The real Python routing through
ProjectionAuthority is the sibling stream's 5-file patch. Do not credit
0983bc934 with the Python work.

## Highest-leverage failure

The gateway healthcheck IPv6 failure (localhost→::1 refused) would have
marked a healthy candidate as unhealthy indefinitely. Fixed by pinning
127.0.0.1. Lesson: healthcheck probes must match the server's actual
listen behavior, not DNS assumptions.

## Next (never-done)

1. 30-minute soak on the new gateway, then remove ping-gateway-precutover.
2. FYD G1/G2/G3 (pending FYD lane).
3. F-01 HOLD lane needs its own promotion when deployed (reaper must be
   re-proven against the HOLD invariant — the candidate has the old reaper).
4. Freeze backlog items await a future wave with proper authorization.
