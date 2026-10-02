/**
 * Jest config scoped to the Shape C observer tests only.
 * Run with:
 *   npx jest --config "src/app/sites/[slug]/activity/jest.config.cjs"
 *
 * Transpile-only (isolatedModules): the tests assert runtime projection
 * behavior; type diagnostics are deferred to the app build.
 */
module.exports = {
  testEnvironment: "node",
  rootDir: "../../../../..",
  // [slug] is escaped: testRegex (not testMatch) so glob char classes do not fire.
  testRegex: "sites/\\[slug\\]/activity/__tests__/.*\\.test\\.ts$",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      require.resolve("ts-jest"),
      {
        isolatedModules: true,
        tsconfig: {
          target: "ES2017",
          module: "commonjs",
          moduleResolution: "node",
          jsx: "react-jsx",
          esModuleInterop: true,
          strict: false,
          skipLibCheck: true,
        },
      },
    ],
  },
};
