-- CHAOS-A scratch schema. File-backed SQLite only. Never production.
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS runs(
  run_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'chaos-a',
  status TEXT NOT NULL DEFAULT 'RUNNING',
  prompt_ref TEXT,
  lease_holder TEXT,
  fencing_token TEXT,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS packets(
  packet_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  kind TEXT NOT NULL DEFAULT 't',
  status TEXT NOT NULL DEFAULT 'ENQUEUED',
  claimed_by TEXT,
  claim_fencing INTEGER,
  attempt_seq INTEGER NOT NULL DEFAULT 1,
  coordinator_epoch INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL DEFAULT '{}',
  result_ref TEXT,
  acceptance_criteria TEXT,
  effect_class TEXT NOT NULL DEFAULT 'TRANSACTIONAL',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_packets_run_status ON packets(run_id, status);

CREATE TABLE IF NOT EXISTS checkpoints(
  run_id TEXT NOT NULL,
  checkpoint_id INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT '{}',
  state_digest TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(run_id, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS leases(
  lease_id TEXT PRIMARY KEY,
  holder_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  role TEXT NOT NULL,
  allowed_tools TEXT NOT NULL DEFAULT '["*"]',
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);

-- Idempotent effect application: the side-effect half of record 8.
-- effect_key is deterministic per (packet, step); INSERT OR IGNORE makes
-- re-execution after a kill a no-op, never a duplicate delegation.
CREATE TABLE IF NOT EXISTS effects(
  effect_key TEXT PRIMARY KEY,
  packet_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  worker_id TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_effects_packet ON effects(packet_id, step);

CREATE TABLE IF NOT EXISTS tool_calls(
  call_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  packet_id TEXT,
  tool_name TEXT NOT NULL,
  effect_class TEXT NOT NULL DEFAULT 'TRANSACTIONAL',
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  effect_ack_at TEXT,
  outcome TEXT,
  evidence TEXT
);

-- Append-only audit. ORCA-11 anti-pattern avoided: never updated, only inserted.
CREATE TABLE IF NOT EXISTS audit_events(
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '{}',
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_run_kind ON audit_events(run_id, kind);

CREATE TABLE IF NOT EXISTS coordinator_epoch(
  id INTEGER PRIMARY KEY CHECK (id = 1),
  epoch INTEGER NOT NULL DEFAULT 0,
  heartbeat_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT OR IGNORE INTO coordinator_epoch(id, epoch) VALUES (1, 0);

-- Every delegation (claim win) is recorded: the duplicate-delegation detector.
CREATE TABLE IF NOT EXISTS delegations(
  delegation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  packet_id TEXT NOT NULL,
  worker_id TEXT NOT NULL,
  fencing INTEGER NOT NULL,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_deleg_packet ON delegations(packet_id);

-- Exactly-once completion emission: UNIQUE(packet_id) is the fence.
CREATE TABLE IF NOT EXISTS completions(
  packet_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  result_ref TEXT NOT NULL,
  emitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
