SELECT count(*) AS total,
       count(DISTINCT event_id) AS distinct_ids,
       sum(CASE WHEN event_id ~ '^[0-9a-f]{64}$' THEN 1 ELSE 0 END) AS era_h_bare_hex,
       sum(CASE WHEN event_id LIKE 'event\_%' THEN 1 ELSE 0 END) AS era_v1_prefix,
       sum(CASE WHEN processed THEN 1 ELSE 0 END) AS processed_true
FROM ping_events;
SELECT event_id FROM ping_events ORDER BY event_id LIMIT 3;
