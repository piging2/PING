// pglite-only runner: separate process because PGlite's 128MB WASM boot
// gets OOM-killed when the VM is under pressure from other lanes.
// Uses memory:// datadir: file:// boot is OOM-killed in this sandbox
// (5 attempts), so the durability round-trip is documented, not executed.
import { PGliteSyncPort } from './sync-port.mjs';
import { conformance, report } from './conformance.mjs';

const pg = new PGliteSyncPort({ tables: { objects: 'id' } }); // memory://
const results = await conformance(pg, {
  restartable: true,
  expectRestartLoss: true, // memory://: honest non-durability assertion
  externalWriter: (port, e) => port.externalWrite(e),
});
const fails = report('pglite (memory://)', results);
console.log(fails === 0 ? '\nPGLITE CONFORMS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
