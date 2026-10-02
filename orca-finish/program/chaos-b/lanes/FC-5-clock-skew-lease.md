# IMPL LANE NOTE — FC-5: clock-skewed lease extend breaks fencing

**Class:** GENERIC (implementation-independent) | **Lane:** CHAOS-B Q1
**Fixture:** `fixtures/fc5-clock-skew-lease.py` (exits 0: RESURRECTED,
DUPLICATED(2), FENCING-HOLDS)
**Evidence:** `evidence/probe-records.jsonl`, DOMAIN `chaos.clock-skew` —
8 valid records (2 superseded probe-bug records, kept raw, excluded):
q1a-naive LOST-STATE / q1a-fixed SURVIVED, q1b-naive+fixed SURVIVED x2,
q1c SURVIVED, q1d-naive DUPLICATED / q1d-fixed SURVIVED.

## The failure (two facets, one fix class)
Lease expiry, renewal, and holder identity assumed a single clock, and the
bearer token was scoped to the lease instead of the grant.

- **Facet 1 — LOST-STATE.** Worker clock -60s vs the store. The lease is
  expired on the server clock. The skewed worker asks to extend, presenting
  its own timestamp; the naive store trusts it and accepts. The dead lease
  looks live again: the expiry event no longer fences the holder, and any
  failover the system started (or would start) on expiry is silently
  undermined.
- **Facet 2 — DUPLICATED.** A expires -> server re-grants to B (token NOT
  rotated) -> skewed A extends with its old bearer token; the store trusts
  the worker clock and reassigns the holder to A by token alone. Two
  holders now believe they own the lease; the lease-scoped external effect
  fires twice (2 effect rows, 2 distinct holders).

What held: revoked leases stay revoked under skew (revocation is a
server-side flag, clock-independent), and stale fencing tokens cannot win
claims or land epoch-fenced writes (fencing is clock-independent). Skew
attacks the *time* boundary only.

## Fix class: monotonic clock + server-issued timestamps
1. **Expiry is judged on the store clock only.** Extend/renew requests may
   carry a client timestamp for telemetry, never for the expiry decision.
2. **Extend binds holder + token.** A valid token presented by anyone other
   than the current holder is rejected; a superseded holder cannot extend,
   period.
3. **Re-grant rotates the bearer token.** Tokens are grant-scoped, never
   lease-scoped; the old holder's token dies with its grant.
4. Prefer a monotonic clock source for expiry comparisons where the
   platform offers one; never compare wall clocks across machines.

What is NOT the fix: NTP discipline alone (reduces frequency, keeps the
vulnerability), or shorter TTLs (shrinks the window, keeps the shape).

## Regression test
Run the fixture in CI. The naive path must demonstrate both facets; the
fixed path must reject both. Any lease/heartbeat implementation that
compares a client-supplied timestamp against expiry, or that reuses a
bearer token across grants, fails this fixture.

## Detection in production
Alert on extend-accepted-after-server-expiry (store saw expiry pass, then
accepted an extend for the same lease id) and on holder-flip-without-grant
(holder changed with no intervening grant record). Both are FC-5
signatures; both are silent without explicit auditing.
