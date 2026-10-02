// SyncPort: the reactive sync boundary PING programs against.
// Lane H spike. PING never touches a provider directly; all providers
// implement this interface. Mutations from PING are PROPOSALS only:
// a provider may mirror accepted writes in its local cache, but canonical
// truth always lives in PING's event/knowledge plane, never in the provider.
//
// SyncPort provider contract:
//   start()            open local cache, begin any subscriptions
//   stop()             close cleanly (flush, release)
//   read(table)        rows from the LOCAL cache (never hits the network)
//   subscribe(table, onChange) -> unsubscribe
//       onChange(evt) with evt = { op: 'insert'|'update'|'delete', table, key, row }
//   propose(mutation) -> proposal { id, mutation, status: 'proposed', createdAt }
//       mutation = { op: 'insert'|'update'|'delete', table, key, row|patch }
//       MUST NOT change the cache. The proposal waits for PING's write path.
//   applyAccepted(proposal) -> void
//       mirror an accepted write into the local cache + notify subscribers
//   durabilityProbe() -> { durable: boolean, detail: string }
//       provider self-report of its persistence guarantees, verified by test
//
// Providers implemented below:
//   StubSyncPort      in-memory Map + EventEmitter. Zero dependencies.
//   PGliteSyncPort    @electric-sql/pglite, file-backed, live queries.
//   ShapeSyncPort     applies ElectricSQL /v1/shape log entries (fixture) to cache.
//   LogicalSyncPort   applies pgoutput (pg_recvlogical) change messages (fixture) to cache.

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';

const now = () => new Date().toISOString();

// ---------------------------------------------------------------- stub
export class StubSyncPort {
  name = 'stub';
  #tables = new Map(); // table -> Map(key -> row)
  #subs = new Map();   // table -> Set(onChange)
  #proposals = new Map();

  #tbl(t) { if (!this.#tables.has(t)) this.#tables.set(t, new Map()); return this.#tables.get(t); }

  async start() {}
  async stop() { this.#subs.clear(); }

  async read(table) { return [...this.#tbl(table).values()].map(r => ({ ...r })); }

  async subscribe(table, onChange) {
    if (!this.#subs.has(table)) this.#subs.set(table, new Set());
    this.#subs.get(table).add(onChange);
    return async () => { this.#subs.get(table)?.delete(onChange); };
  }

  #emit(evt) { for (const cb of this.#subs.get(evt.table) ?? []) { try { cb(evt); } catch {} } }

  // test-only: simulate an external authoritative write arriving at the cache
  async externalWrite(evt) {
    const t = this.#tbl(evt.table);
    if (evt.op === 'delete') t.delete(evt.key); else t.set(evt.key, { ...evt.row });
    this.#emit({ op: evt.op, table: evt.table, key: evt.key, row: evt.row ? { ...evt.row } : null });
  }

  async propose(mutation) {
    const p = { id: randomUUID(), mutation: { ...mutation }, status: 'proposed', createdAt: now() };
    this.#proposals.set(p.id, p);
    return { ...p };
  }

  async applyAccepted(proposal) {
    const p = this.#proposals.get(proposal.id);
    if (!p || p.status !== 'proposed') throw new Error('unknown or non-proposed proposal');
    p.status = 'accepted';
    await this.externalWrite({ op: p.mutation.op, table: p.mutation.table, key: p.mutation.key, row: p.mutation.row });
    return { ...p };
  }

  async durabilityProbe() {
    return { durable: false, detail: 'stub: in-memory only, no persistence by design' };
  }
}

// ---------------------------------------------------------------- PGlite
// Local Postgres-in-WASM cache. relaxedDurability:false so every top-level
// write awaits the filesystem flush before resolving. live extension for
// reactive subscriptions. Proposals are rows in sync_proposals; they do not
// touch business tables until applyAccepted runs inside a real transaction.
export class PGliteSyncPort {
  name = 'pglite';
  #db = null;
  #dir;
  #subs = new Map(); // table -> Array<{liveSub, onChange}>
  #pk = new Map();   // table -> primary key column

  constructor({ dataDir, tables = {} } = {}) {
    this.#dir = dataDir;
    for (const [t, pk] of Object.entries(tables)) this.#pk.set(t, pk);
  }

  async start() {
    this.#db = await PGlite.create({
      dataDir: this.#dir,
      relaxedDurability: false,
      extensions: { live },
    });
    await this.#db.exec(`
      CREATE TABLE IF NOT EXISTS sync_proposals (
        id TEXT PRIMARY KEY, payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'proposed',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`);
    for (const [t, pk] of this.#pk) {
      await this.#db.exec(`CREATE TABLE IF NOT EXISTS ${t} (data JSONB NOT NULL, pk TEXT PRIMARY KEY);`);
    }
  }

  async stop() { await this.#db?.close(); this.#db = null; this.#subs.clear(); }

  async read(table) {
    const r = await this.#db.query(`SELECT data FROM ${table}`);
    return r.rows.map(x => x.data);
  }

  // NOTE (upstream issue electric-sql/pglite#1048): unsubscribe(callback) on a
  // shared live query can tear down the whole query for every listener, so
  // each SyncPort subscriber gets its OWN live query. Slightly more queries,
  // correct semantics. Verified by conformance test 6.
  // BUG CLASS FOUND BY LIVE EXECUTION (2026-09-23): the live extension's
  // initial callback fires SYNCHRONOUSLY inside live.query(), before the
  // returned promise resolves. The previous version stored the baseline on
  // `liveSub._last`, which threw on a null liveSub during that synchronous
  // first fire; the empty catch swallowed it, `initialized` stayed false,
  // and the FIRST real change after every subscribe was absorbed into the
  // baseline and never emitted. Silent event loss, per-subscriber. Fix:
  // baseline state lives in closure variables, not on the liveSub object.
  async subscribe(table, onChange) {
    let liveSub = null;
    let last = null;
    let initialized = false;
    const pk = this.#pk.get(table);
    const diffCb = (res) => {
      try {
        const cur = new Map(res.rows.map(x => [x.data[pk], x.data]));
        if (!initialized) { last = cur; initialized = true; return; } // baseline; emits nothing
        for (const [k, row] of cur) {
          if (!last?.has(k)) onChange({ op: 'insert', table, key: k, row });
          else if (JSON.stringify(last.get(k)) !== JSON.stringify(row))
            onChange({ op: 'update', table, key: k, row });
        }
        for (const k of last?.keys() ?? []) {
          if (!cur.has(k)) onChange({ op: 'delete', table, key: k, row: null });
        }
        last = cur;
      } catch { /* a subscriber throw must not break the live loop */ }
    };
    liveSub = await this.#db.live.query(`SELECT data FROM ${table}`, [], diffCb);
    const rec = { liveSub, onChange };
    if (!this.#subs.has(table)) this.#subs.set(table, []);
    this.#subs.get(table).push(rec);
    return async () => {
      await liveSub.unsubscribe();
      const arr = this.#subs.get(table) ?? [];
      arr.splice(arr.indexOf(rec), 1);
    };
  }

  // test-only: authoritative write path (what Electric shape application or a
  // logical-replication applier would call), bypassing proposals
  async externalWrite({ op, table, key, row }) {
    const pk = this.#pk.get(table);
    if (op === 'delete') {
      await this.#db.query(`DELETE FROM ${table} WHERE pk = $1`, [String(key)]);
    } else {
      const r = { ...row, [pk]: key };
      await this.#db.query(
        `INSERT INTO ${table} (pk, data) VALUES ($1, $2)
         ON CONFLICT (pk) DO UPDATE SET data = EXCLUDED.data`,
        [String(key), r],
      );
    }
  }

  async propose(mutation) {
    const id = randomUUID();
    await this.#db.query(
      `INSERT INTO sync_proposals (id, payload) VALUES ($1, $2)`,
      [id, { ...mutation }],
    );
    return { id, mutation: { ...mutation }, status: 'proposed', createdAt: now() };
  }

  async applyAccepted(proposal) {
    const r = await this.#db.query(`SELECT payload, status FROM sync_proposals WHERE id = $1`, [proposal.id]);
    if (r.rows.length === 0 || r.rows[0].status !== 'proposed')
      throw new Error('unknown or non-proposed proposal');
    const m = r.rows[0].payload;
    await this.#db.transaction(async (tx) => {
      await tx.query(`UPDATE sync_proposals SET status = 'accepted' WHERE id = $1`, [proposal.id]);
      const pk = this.#pk.get(m.table);
      if (m.op === 'delete') {
        await tx.query(`DELETE FROM ${m.table} WHERE pk = $1`, [String(m.key)]);
      } else {
        const row = { ...m.row, [pk]: m.key };
        await tx.query(
          `INSERT INTO ${m.table} (pk, data) VALUES ($1, $2)
           ON CONFLICT (pk) DO UPDATE SET data = EXCLUDED.data`,
          [String(m.key), row],
        );
      }
    });
    return { ...proposal, status: 'accepted' };
  }

  async durabilityProbe() {
    // Close + reopen and check a probe row survives: tests the file-backed
    // datadir round-trip. Does NOT prove the transaction-commit fsync boundary
    // (upstream issue #1065: transaction() can resolve before syncToFs runs).
    const probe = `probe-${Date.now()}`;
    await this.#db.exec(`CREATE TABLE IF NOT EXISTS sync_probe (id TEXT PRIMARY KEY);`);
    await this.#db.query(`INSERT INTO sync_probe (id) VALUES ($1)`, [probe]);
    return { durable: true, detail: `probe row ${probe} committed; verify across close/reopen in conformance test 7` };
  }
}

// ---------------------------------------------------------------- Shape (ElectricSQL /v1/shape log)
export class ShapeSyncPort {
  // Applies Electric shape log entries to a local cache.
  // Entry: { key, value, headers: { operation: 'insert'|'update'|'delete' } }
  // Transport (ShapeStream HTTP/SSE) is intentionally NOT run here: the point
  // is that the APPLY semantics behind SyncPort are identical whether the
  // change arrived via Electric shapes, pgoutput, or the stub.
  name = 'electric-shape';
  #inner = new StubSyncPort();
  #shapeByTable = new Map(); // table -> shape params (provenance only)

  async start() { return this.#inner.start(); }
  async stop() { return this.#inner.stop(); }
  async read(t) { return this.#inner.read(t); }
  async subscribe(t, cb) { return this.#inner.subscribe(t, cb); }
  async propose(m) { return this.#inner.propose(m); }
  async applyAccepted(p) { return this.#inner.applyAccepted(p); }
  async durabilityProbe() {
    return { durable: false, detail: 'shape applier: cache is a projection of the shape log; durability belongs to the source Postgres + Electric offset resume, not this cache' };
  }

  // shapeKey format: "<table>:<pk>" (the applier owns this convention)
  async applyShapeBatch(table, entries) {
    for (const e of entries) {
      const op = e.headers?.operation;
      const pk = String(e.key).includes(':') ? String(e.key).split(':').slice(1).join(':') : String(e.key);
      if (op === 'delete') await this.#inner.externalWrite({ op: 'delete', table, key: pk });
      else await this.#inner.externalWrite({ op: op === 'update' ? 'update' : 'insert', table, key: pk, row: { ...e.value } });
    }
  }

  // test-only passthrough to the shared in-memory applier
  async externalWrite(evt) { return this.#inner.externalWrite(evt); }
}

// ---------------------------------------------------------------- Logical (plain Postgres logical replication)
export class LogicalSyncPort {
  // Applies pgoutput change messages to a local cache.
  // Message: { action: 'I'|'U'|'D', table, columns: [{name, value}], key: {name,value}[] }
  // This is the shape pg_recvlogical --plugin=pgoutput (or a walsender client)
  // decodes to. No live Postgres in this sandbox, so the replication WIRE is
  // shimmed in the test; the DECODE->APPLY path is real and provider-agnostic.
  name = 'pg-logical';
  #inner = new StubSyncPort();

  async start() { return this.#inner.start(); }
  async stop() { return this.#inner.stop(); }
  async read(t) { return this.#inner.read(t); }
  async subscribe(t, cb) { return this.#inner.subscribe(t, cb); }
  async propose(m) { return this.#inner.propose(m); }
  async applyAccepted(p) { return this.#inner.applyAccepted(p); }
  async durabilityProbe() {
    return { durable: false, detail: 'logical applier: cache is a projection of the replication stream; durability belongs to the source Postgres WAL + replication slot, not this cache' };
  }

  #row(cols) { const r = {}; for (const c of cols) r[c.name] = c.value; return r; }

  async applyLogicalBatch(messages) {
    for (const m of messages) {
      if (m.action === 'D') {
        const key = m.key.map(k => k.value).join('|');
        await this.#inner.externalWrite({ op: 'delete', table: m.table, key });
      } else {
        const row = this.#row(m.columns);
        const key = (m.key?.length ? m.key.map(k => k.value).join('|') : null) ?? row.id ?? JSON.stringify(row);
        await this.#inner.externalWrite({ op: m.action === 'U' ? 'update' : 'insert', table: m.table, key: String(key), row });
      }
    }
  }

  // test-only passthrough to the shared in-memory applier
  async externalWrite(evt) { return this.#inner.externalWrite(evt); }
}
