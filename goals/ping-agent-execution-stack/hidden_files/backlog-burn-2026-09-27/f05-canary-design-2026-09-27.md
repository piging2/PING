# F-05 canary design (positive control for zero-hits) — 2026-09-27 ~13:15 MDT

Subagent: backlog-burn (parent: main agent). Design + live proof of the
canary query only; `class_08_message_execution.js` NOT modified (adapters
dormant/unwired; implementation queued at wiring time).

## The gap

`class_08_message_execution.js` email probe: a zero-hit Gmail Sent search
currently resolves to `outcome: 'not-delivered'` with
`evidence: { hitCount: 0, query: q, searchHealthy: true }`. `searchHealthy`
is hardcoded `true` — there is no positive control proving the search
machinery can return hits at all. A broken CLI, an expired token, or a
throttled search returning empty would be read as PROOF OF NON-DELIVERY.
That is the FYD journal emitOverlayEvent timeout-after-accept pattern in
reverse: absence of hits mistaken for evidence of absence.

## Canary spec

- **Canary query**: `in:sent` with `--max 1`, run through the SAME exec
  machinery (same `hatch_gws_cli` invocation shape, same 30s timeout
  budget) as the target query. It controls for exactly the machinery the
  target query depends on.
- **Expected**: ≥1 hit for any account that has ever sent mail.
- **Semantics**: canary hit → `searchHealthy: true`; canary zero-hits →
  `searchHealthy: false`. Zero-hits on the canary means the pipeline
  cannot prove itself healthy (broken CLI, auth, throttling) OR the
  account has never sent mail — fail-closed either way.
- **Cost**: one extra Gmail search per probe. Amortization option: run
  once per pass and cache health for the pass window; per-probe is
  simpler and still trivial. Decision deferred to wiring time.
- **Fail-closed wiring** (for the wiring owner): `searchHealthy` must come
  from the canary result, never a literal `true`. Zero-hits + canary fail
  → `outcome: 'inconclusive'` with observation naming the canary failure
  ("canary query `in:sent` returned zero hits; a zero-hit target query is
  not proof of non-delivery when the search pipeline cannot prove itself
  healthy"). Zero-hits + canary pass → current `not-delivered` path
  preserved unchanged.
- **Falsification plan**: (1) live canary returns a hit (proven below);
  (2) synthetic: stub exec to return empty for all queries → probe returns
  `inconclusive`, never `not-delivered`; (3) stub exec to return canary
  hit + target zero-hits → `not-delivered` preserved.

## Live proof (2026-09-27 ~12:30 MDT)

`hatch_gws_cli gmail +triage --query "in:sent" --max 1 --format json`
returned 1 message (id `1a0e1ef2dcd2948e`, sent 2026-09-27 02:15 MDT,
`resultSizeEstimate: 201`). The canary machinery works; the account has
201 sent messages, so the canary is discriminating, not vacuous.

## Status

DESIGN COMPLETE + canary query live-verified. Implementation in
`class_08_message_execution.js` queued for the wiring owner (adapters
dormant; see F-05 downgrade in orca-audit-reverify-2026-09-27.md).
