# Failure classes — worker E3 (P-20260923-007/008/009 evaluation, 2026-09-24)

New failure classes discovered while evaluating the three swarm-14 proposals
against their neighbors. Each is a reusable invariant, not a one-off bug.

## FL-E3-01: AUTH_DENIAL_DISCLOSURE (exterior denial strings vary by internal state)

**Observed:** P-20260923-093's `dispatch()` returns distinct denial reasons for
unclassified tool vs UNKNOWN effect class vs revoked grant. P-20260923-007
requires byte-identical opaque denials for not-found and not-authorized.
Distinct reasons leak catalog existence and classification state to the caller:
an agent can probe which tool ids exist by comparing reason strings.

**Invariant:** The exterior authorization surface emits exactly one denial
string (`DENIED_REASON`) regardless of internal cause. Granular reasons stay
inside audit records, never in the decision returned to the caller.

**Status:** MITIGATED BY DESIGN in the 007 implementation (eval-007.json scope
split documents the contract). Re-verify when 093 integrates: its reason
strings must be demoted to audit-internal.

## FL-E3-02: GRANT_SOURCE_DIVERGENCE (discovery filter and dispatch gate disagree)

**Observed:** 007 filters at discovery; 093 gates at dispatch. If the two
layers resolve grants against different sources (static registry vs live
authority, or two cached snapshots taken at different times), a tool can be
visible-but-denied (agent confusion, wasted budget) or hidden-but-allowed
(authorization bypass through a stale allow).

**Invariant:** The discovery filter and the per-dispatch gate resolve against
the SAME GrantResolver instance on every call. No caching inside either
layer; the resolver owns freshness. A visible-at-discovery/denied-at-dispatch
transition is legal ONLY when the grant actually changed between the two
resolutions (revocation), never from source divergence.

**Status:** DOCUMENTED in eval-007.json scope_split.contract. Enforce at
integration time: wire one resolver into both `filterAtDiscovery` and the
093 guard's dispatch lookup.

## FL-E3-03: HISTORY_EDIT_FORK (exact-match edit applied to a superseded fact)

**Observed:** 008 introduces fail-closed exact-match edits; 009 introduces
bitemporal supersession. An edit whose `expected` text matches a SUPERSEDED
(old, invalid_at != null) fact would, if applied, fork history: two live
records claiming the same valid-time interval, breaking the asOf read
contract (009's tests prove old-before/new-after exclusivity).

**Invariant:** Exact-match edits apply ONLY to current facts
(invalid_at IS NULL AND expired_at IS NULL). An edit targeting a superseded
fact is rejected (new error code at integration, e.g. SUPERSEDED_FACT);
corrections to history go through supersession (009), never through edit
(008). Detection of "expected matches a superseded version" should surface
as a hint to re-read current state, not as a silent fork.

**Status:** OPEN — neither 008 nor 009 implements the cross-check yet (each
is correct in isolation). Requires an integration-time guard where the two
meet (memory write path). Flagged for the coordinator.
