// run-all.mjs: same consumer code, four SyncPort providers.
// If every provider passes the same conformance suite, PING is isolated
// from the provider choice: ElectricSQL shapes, plain pgoutput logical
// replication, and PGlite are swappable behind SyncPort.
import { rm } from 'node:fs/promises';
import { StubSyncPort, PGliteSyncPort, ShapeSyncPort, LogicalSyncPort } from './sync-port.mjs';
import { conformance, report } from './conformance.mjs';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const writers = {
  stub: (port, e) => port.externalWrite(e),
  pglite: (port, e) => port.externalWrite(e),
  // Electric /v1/shape log entries: key + value + headers.operation
  'electric-shape': (port, e) => port.applyShapeBatch(e.table, [{
    key: `${e.table}:${e.key}`,
    value: e.op === 'delete' ? null : e.row,
    headers: { operation: e.op },
  }]),
  // pgoutput decoded change messages, as pg_recvlogical would emit them
  'pg-logical': (port, e) => {
    const cols = e.row ? Object.entries(e.row).map(([name, value]) => ({ name, value })) : [];
    const key = [{ name: 'id', value: e.key }];
    port.applyLogicalBatch([{
      action: e.op === 'insert' ? 'I' : e.op === 'update' ? 'U' : 'D',
      table: e.table, columns: cols, key,
    }]);
  },
};

let totalFails = 0;
const mk = {
  stub: () => new StubSyncPort(),
  'electric-shape': () => new ShapeSyncPort(),
  'pg-logical': () => new LogicalSyncPort(),
};

for (const [name, make] of Object.entries(mk)) {
  const port = make();
  const results = await conformance(port, { externalWriter: writers[name] });
  totalFails += report(name, results);
}

// PGlite last (boots real WASM Postgres; file-backed datadir in lane dir)
const dir = new URL('./pgdata/', import.meta.url).pathname;
await rm(dir, { recursive: true, force: true });
const pg = new PGliteSyncPort({ dataDir: `file://${dir}`, tables: { objects: 'id' } });
const results = await conformance(pg, { restartable: true, externalWriter: writers.pglite });
totalFails += report('pglite', results);
await rm(dir, { recursive: true, force: true }).catch(() => {});

console.log(totalFails === 0 ? '\nALL PROVIDERS CONFORM' : `\n${totalFails} FAILURES`);
process.exit(totalFails === 0 ? 0 : 1);
