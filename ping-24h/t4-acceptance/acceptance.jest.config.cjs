/**
 * Jest config for the Phase 1 approval-door ACCEPTANCE suite (T4).
 *
 * Extends the lane runner (src/fyd/approval/jest.config.cjs) with
 * jsx: "react" because the integrated read path (Ask FYD visitor-answer)
 * transitively imports the site renderer (src/fyd/components/renderer.tsx).
 * The lane's canonical config is left untouched; only the acceptance suite
 * uses this config.
 *
 * Run with:
 *   npx jest --config src/fyd/approval/acceptance.jest.config.cjs
 */
module.exports = {
  testEnvironment: "node",
  rootDir: "../../..",
  testMatch: ["<rootDir>/src/fyd/approval/__tests__/acceptance-door.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.module\\.css$": "<rootDir>/src/fyd/approval/__tests__/css-stub.cjs",
    "\\.(css|scss|sass|less)$": "<rootDir>/src/fyd/approval/__tests__/css-stub.cjs",
    "\\.(png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot)$": "<rootDir>/src/fyd/approval/__tests__/file-stub.cjs",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        diagnostics: false,
        tsconfig: {
          target: "ES2022",
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          jsx: "react",
        },
      },
    ],
  },
};
