/**
 * Scoped Jest config for the Coppersmith family-generation tests
 * (product lane).
 *
 * Runs ONLY src/app/sites/coppersmith-plumbing/v2/**, so the
 * pre-existing lane-wide breakage (tsc rot, missing optional deps in
 * unrelated modules) does not touch this suite. CSS side-effect imports
 * (family.css) are stubbed; the theme seam is asserted through
 * data-theme, not the compiled stylesheet.
 *
 * Run with: npx jest --config src/app/sites/coppersmith-plumbing/v2/jest.config.cjs
 * from the fyd-product-lane root (cwd matters: the builder resolves the
 * pinned media manifest and observation fixture from the lane root).
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "../../../../..",
  roots: ["<rootDir>/src/app/sites/coppersmith-plumbing/v2"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.css$": "<rootDir>/src/fyd/family/__tests__/css-stub.js",
  },
  globals: {
    "ts-jest": {
      tsconfig:
        "<rootDir>/src/app/sites/coppersmith-plumbing/v2/__tests__/tsconfig.test.json",
      diagnostics: true,
    },
  },
};
