/**
 * Local verification mirror of src/tenanos/jest.config.cjs (P-20260923-001,
 * integrated). Same testMatch, same ts-jest inline tsconfig. For E1 worker
 * verification only; not part of any proposal diff.
 */
module.exports = {
  testEnvironment: "node",
  rootDir: ".",
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
