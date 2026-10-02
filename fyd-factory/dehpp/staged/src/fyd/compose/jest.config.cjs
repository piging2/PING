/**
 * Jest config for the DEHPP parameterization lane.
 * Scoped to this lane's tests only. Run with:
 *   node_modules/.bin/jest --config src/fyd/compose/jest.config.cjs
 * Shape harvested from src/fyd/builder/jest.config.cjs.
 */
module.exports = {
  testEnvironment: "node",
  rootDir: "../../..",
  testMatch: [
    "<rootDir>/src/fyd/compose/__tests__/*.test.ts",
    "<rootDir>/src/fyd/copy/__tests__/*.test.ts",
  ],
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
