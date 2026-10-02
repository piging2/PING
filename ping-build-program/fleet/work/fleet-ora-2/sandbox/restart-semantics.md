# Restart semantics procedures (fleet-ora-2, 2026-09-24)
Owner: Nolan (PING Social). The worker never restarts live containers; every live
drill below is owner-executed. Design-spec workers get their contract here.

## Graceful-shutdown contract (all workers + gateway)
1. On SIGTERM: stop accepting new work, drain in-flight requests with a bounded
   deadline (30s), then exit 0.
2. In-flight HTTP requests get a typed 503 (not a silent drop) during drain.
3. State changes go through the journal first; after restart, replay the journal
   and diff against the pre-restart log tail (journal/log diff procedure).
4. Acknowledged work is never lost: ack happens only after the journal write.

## Journal/log diff evidence procedure (0816/0836)
1. Before restart: record the journal tail digest + row counts.
2. Restart (owner).
3. After restart: replay, re-record the digest + counts.
4. Any divergence is FAIL with the diff. Zero divergence = state consistent.

## Exit-137 replay (0814/0834, scratch)
- On a scratch host: run a memory-hungry process in a container with --memory=512m,
  observe the OOM-kill (exit 137), compare with the two dead gateway containers
  (exit 137, 2026-09). The suspicion (no memory limits + zero swap) is documented
  as a risk, not a verdict.

## Restart storm (0817/0837, owner drill)
- Restart all three containers at once; verify: postgres healthy before gateway
  serves (depends_on healthy, design); zero acknowledged-work loss via the journal
  diff; in-flight requests get typed errors.

## Healthcheck gates (0818/0838)
- postgres: pg_isready; qdrant: /readyz (TCP check today); gateway: /health.
  No container serves traffic before its healthcheck passes (design).

## Backup/snapshot mid-write restart (0819/0820, 0839/0840)
- Partial pg_dump .gz: refused on restart (digest verification before use; the
  store-loss drill proved typed failures and rollback).
- Partial qdrant snapshot: refused on restart (snapshot manifest verification).
