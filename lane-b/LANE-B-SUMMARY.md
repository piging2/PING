# Lane B summary (PING Social 23-hour sprint, ingestion lane)

Sole writer for /home/nolan/ping on branch refactor/runtime-authority-convergence.
Repo commit: 9bcccaa23 (local only, PUSH_PENDING_EGRESS).

## What was built (repo, committed)
- 7 additive knowledge predicates + 7 additive knowledge schemas in the
  constitutional vocabulary (no new authority created).
- knowledge_ingest_adapter.js: Ed25519 envelope verification, secret
  rejection, mandatory provenance (source_url, source_type, observed_at)
  and claim_basis (website_statement / extractor_inference).
- Additive route dispatch: ping.knowledge.* schemas use the knowledge
  adapter; social path untouched.
- database/ping_objects.sql: predicate CHECK extended additively
  (5 social + 7 knowledge).
- Tests: 13/13 adapter, 17/17 vocabulary, 9/9 social regression.
  Full jest: 67 passed; 1 integration suite blocked on missing pg module
  (pre-existing env issue, ledgered FL-20260920-013-class).

## Live Oracle evidence
- 19 events emitted via governed POST /events (direct canonical-spine
  path, the only path on live image candidate-84486f056): 9 objects,
  10 relationships, journal sequences 65-83. Ed25519-signed by Nolan's
  dev key (identity_cc3383c868f96fc1); vocabulary + provenance enforced
  client-side against the canonical vocabulary.
- Projection rebuilt twice on the Oracle: 20 objects / 16 relationships /
  37 transitions; digests equal (37a5aa99...7457c77eb2fa172674006).
  Predicate CHECK evolved on the projection table only (old constraint
  definition recorded for reversibility).
- Preserved AI events intact (seq 43, 46); protected images untouched
  (8400deecf2a9); ping_events never direct-written.

## Deviations (ledgered)
- FL-20260920-014: second live observation blocked by browser upstream
  failure; temporal proof done on a controlled synthetic variant.
- FL-20260920-015: live image predates the ingest adapters (no BFF
  envelope path at all); emission used the live governed direct path.
  Server-side knowledge adapter wiring is a flagged operator decision
  for the next gateway build.
- FL-20260920-016: hatch /tmp wiped; recovered; lane now lives here.

## Files
- observation-001.json: first live observation (2026-09-21T02:44:00Z).
- differ.js: deterministic canonical observation differ.
- emit.js: builds + signs the 19 POST bodies (key read transiently).
- bodies.json / emit-results.json: the 19 bodies + accepted event IDs.
- laneb_run_projector.js + oracle_*.sh: exact replay of the live run.
