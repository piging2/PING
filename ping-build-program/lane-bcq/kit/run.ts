/**
 * LANE BCQ — kit runner. Executes the contract suite against the reference
 * adapter and prints the report. Zero dependencies; run with bun or tsx.
 *
 * Usage: bun run.ts   (from the kit/ directory)
 */
import { runContractSuite, testManifest } from './contract-kit';
import { Harness } from './harness';
import { ReferenceAdapter } from './reference-adapter';

async function main(): Promise<void> {
  const report = await runContractSuite(
    () => new ReferenceAdapter(testManifest()),
    () => new Harness(testManifest()),
  );
  for (const c of report.checks) {
    const mark = c.passed ? 'PASS' : 'FAIL';
    console.log(`${mark} ${c.id} ${c.name}`);
    if (!c.passed) console.log(`      → ${c.detail}`);
  }
  console.log(`\n${report.passed}/${report.checks.length} checks passed (${report.failed} failed)`);
  if (report.failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
