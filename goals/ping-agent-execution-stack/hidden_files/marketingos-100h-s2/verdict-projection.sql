-- MARKETINGOS Sprint 2 (Block 15-30): claim-verdict observability projection.
--
-- THE GAP: every CLAIM_CREATED row in ping_events has metadata->>'verdict' = NULL,
-- so claim verdicts were not queryable from the journal's metadata. The verdicts
-- were never lost: attachClaimVerdict() (ping-runtime/evidence/verdict_vocab.js)
-- sets payload->'claim'->>'verdict' on the claim record before emission, using the
-- closed vocabulary CONFIRMED | REFUTED | UNCLEAR. They were just buried in payload.
--
-- THE JOIN (read-only, history never mutated):
--   ping_events.event_id  (varchar PK on the live Pig journal; no correlation_id
--                          column exists -- correlation lives at
--                          metadata->>'correlation_id')
--     = knowledge_nodes.source_event_id   (the node the claim event produced)
--   filtered to event_type = 'CLAIM_CREATED'.
-- knowledge_nodes.label also carries a human-readable verdict prefix
-- ("C1 CONFIRMED: ...", "C3 REFUTED-as-worded: ...") from the sprint drivers;
-- the projection exposes it as label_verdict for cross-checking against the
-- payload verdict. Disagreement (e.g. a REFUTED claim later re-emitted with a
-- correction claim marked CONFIRMED, as with sprint-2 U2-C5/U2-C6) is SURFACED,
-- not resolved: correction is a mission-level semantic, not a projection job.
--
-- HONEST NULLS: rows whose claim was never given a verdict (sprint-1 claims
-- emitted before the verdict vocabulary existed) project as NULL. A NULL verdict
-- means "not recorded", never "passed". Do not backfill.
--
-- Chosen over a VIEW: a committed documented query is the smallest fix. Creating
-- a VIEW in the journal would add schema state to the sealed append-only store
-- surface; this projection lives in the repo and runs read-only at query time.
SELECT
    pe.event_id,
    pe.timestamp AS event_time,
    pe.metadata->>'correlation_id' AS correlation_id,
    pe.payload->'claim'->>'subject' AS claim_subject,
    pe.payload->'claim'->>'text' AS claim_text,
    pe.payload->'claim'->>'verdict' AS claim_verdict,   -- CONFIRMED|REFUTED|UNCLEAR, NULL = never recorded
    pe.metadata->>'verdict' AS metadata_verdict,        -- NULL on every stored row (the original gap)
    kn.node_id,
    kn.label AS node_label,
    (regexp_match(kn.label, '(^|[^\w])(CONFIRMED|REFUTED|UNCLEAR)'))[2] AS label_verdict
FROM ping_events AS pe
LEFT JOIN knowledge_nodes AS kn
    ON kn.source_event_id = pe.event_id
WHERE pe.event_type = 'CLAIM_CREATED'
ORDER BY pe.timestamp;
