/**
 * Scoped Jest config for the FYD family surface tests (product lane, V1).
 *
 * Runs ONLY src/fyd/family/**, so the pre-existing proceduralize
 * dependency failures (missing fast-xml-parser etc.) do not touch this
 * suite. CSS side-effect imports (family.css) are stubbed; the theme
 * seam is asserted through data-theme and class names, not the compiled
 * stylesheet.
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "../../..",
  roots: ["<rootDir>/src/fyd/family"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.css$": "<rootDir>/src/fyd/family/__tests__/css-stub.js",
  },
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/src/fyd/family/__tests__/tsconfig.test.json",
      diagnostics: true,
    },
  },
};
