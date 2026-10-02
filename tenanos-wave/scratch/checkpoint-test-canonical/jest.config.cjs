/**
 * Jest config for the C1 durable-checkpoint test, canonical-005 rerun
 * (scratch only, no repo touch). Mirrors src/tenanos/jest.config.cjs
 * (P-20260923-001) but roots in this scratch directory. Runs ON THE PIG
 * (jest + ts-jest live in /home/nolan/projects/ping/node_modules).
 *
 * Run: cd /home/nolan/projects/ping && npx jest --config <this file>
 * Env: TENANOS_RUN_SRC overrides the substrate source dir (default:
 *   /home/nolan/projects/ping-wave-integration/src/tenanos/run).
 * The canonical 005 schema is compiled on the Pig from the isolated
 * worktree into <rootDir>/canonical/schema.js before the run.
 */
const path = require('path');
const PING_NODE_MODULES = '/home/nolan/projects/ping/node_modules';

module.exports = {
  testEnvironment: 'node',
  rootDir: __dirname,
  roots: [__dirname],
  testMatch: ['<rootDir>/checkpoint-durability.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      path.join(PING_NODE_MODULES, 'ts-jest'),
      {
        tsconfig: {
          target: 'ES2017',
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
        },
      },
    ],
  },
};
