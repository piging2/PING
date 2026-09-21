# Lane F failures / gap log

## 2026-09-21 ~14:05 MDT — main-journal overlay query failed to connect (OBSERVED, non-blocking)

Classification: infrastructure observation, NOT a replay failure.
The replay proof does not depend on the main journal (see below).

What happened: `lane-f-probe.py` queried BOTH overlay journals for
`FYD_SITE_OVERLAY` events with `siteId='happy-place'`.
- demo journal (ping-fyd-demo via ping-test-pg, node on Pig host): OK,
  1 event `39fc9971a47f807ef38cf8976cb9d4ff4360c27b52bf14f4cc1f4393094d78fd`
  @ 2026-09-21T19:26:26.042Z — exactly the event id in the live
  projection's `meta.overlayEventIds`.
- main journal (8080 deployment gateway Postgres, docker-cp'd probe JS
  into the `ping-gateway` container): rc=2, `CONNECT:` with an empty
  error message. The container itself is Up (`docker ps` shows
  `ping-gateway Up 41 hours`); the pg client inside it could not
  establish the connection with the container's own POSTGRES_* env.

Why non-blocking: the live projection's overlay provably came from the
demo journal (event-id match), and dump.py documents the demo journal as
the standing arrangement until the 8080 deployment lane registers
FYD_SITE_OVERLAY in its own baked registry (FAILURE_LEDGER
FL-20260921-231). The replay used `FYD_OVERLAY_JOURNAL=demo` and matched.

Follow-up for whoever owns the 8080 deployment lane: verify whether the
main-journal query path (gateway container env -> main PG) is expected
to work; if it should, the empty CONNECT error needs diagnosis with the
container's POSTGRES_* values. If it should not, nothing to do — the
demo journal is the canonical overlay source for FYD until registration.

No other failures. The reducer, ordering, canonicalization, and digest
verification all behaved as documented; replay1 == replay2 ==
live projection.
