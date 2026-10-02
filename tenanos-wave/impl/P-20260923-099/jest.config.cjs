// Self-contained verification config for P-20260923-099 (E8).
// Uses the wave's shared jest-run toolchain; does not modify the shared
// impl/jest.config.cjs (owned by the wave's test gate).
const path = require("path");
const NM = "/home/hatch/workspace/tenanos-wave/swarm-05/jest-run/node_modules";

module.exports = {
  rootDir: __dirname,
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": [
      path.join(NM, "ts-jest"),
      { tsconfig: path.join(__dirname, "tsconfig.json"), isolatedModules: false },
    ],
  },
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
};
