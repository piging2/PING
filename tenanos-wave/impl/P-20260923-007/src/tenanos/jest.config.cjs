/**
 * Jest config for P-20260923 worker-E3 evaluation implementation.
 * Shape mirrors the wave's scoped substrate config (src/tenanos/jest.config.cjs).
 * Run with: npx jest --config src/tenanos/jest.config.cjs
 */
module.exports = {
  testEnvironment: "node",
  rootDir: "../..",
  testMatch: ["<rootDir>/src/tenanos/__tests__/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2017",
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
        },
      },
    ],
  },
};
