/** Jest config for the ping-connectors framework (standalone package). */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/*.test.ts"],
  collectCoverage: false,
};
