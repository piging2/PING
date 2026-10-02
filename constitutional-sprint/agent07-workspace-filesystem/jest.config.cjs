/**
 * Jest config for the FYD data lane (PING-backed read seams).
 * Scoped to this lane's tests only. Run with:
 * npx jest --config src/fyd/data/jest.config.cjs
 *
 * Shape harvested from src/fyd/identity/jest.config.cjs.
 */
module.exports = {
  testEnvironment: "node",
  rootDir: "../../..",
  testMatch: ["<rootDir>/src/fyd/data/__tests__/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
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
