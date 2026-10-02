/**
 * LANE BCQ — connector contract suite wired into the repo's jest runner.
 * Every future connector adapter runs this suite; ship nothing that fails.
 */
import { runContractSuite, testManifest } from '../contract-kit';
import { Harness } from '../harness';
import { ReferenceAdapter } from '../reference-adapter';

test('connector contract: reference adapter passes all checks', async () => {
  const report = await runContractSuite(
    () => new ReferenceAdapter(testManifest()),
    () => new Harness(testManifest()),
  );
  const failures = report.checks.filter((c) => !c.passed);
  if (failures.length > 0) {
    // eslint-disable-next-line no-console
    console.error(failures.map((f) => `${f.id} ${f.name}: ${f.detail}`).join('\n'));
  }
  expect(failures).toEqual([]);
}, 30000);
