/**
 * Lane-scoped Jest config for the Ask FYD -> EVIDENCE test boundary
 * (tests/ask-fyd). Functionally identical to the repo-root standard
 * config (node env, ts-jest with the same inline tsconfig, @/ alias);
 * only testMatch scope differs. Per TESTING.md this is the sanctioned
 * lane-local invocation:
 *
 *   npx jest --config tests/ask-fyd/jest.config.cjs
 */
module.exports = {
  testEnvironment: "node",
  rootDir: __dirname,
  testMatch: ["<rootDir>/*.test.{ts,tsx}"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/../../src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2017",
          module: "commonjs",
          moduleResolution: "node",
          jsx: "react-jsx",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
        },
      },
    ],
  },
};
