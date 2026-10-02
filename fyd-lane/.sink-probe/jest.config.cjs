module.exports = {
  testEnvironment: "node",
  rootDir: "/home/hatch/workspace/fyd-lane",
  roots: ["<rootDir>/.sink-probe"],
  testMatch: ["<rootDir>/.sink-probe/run.test.ts"],
  transform: { "^.+\\.tsx?$": ["<rootDir>/.sink-probe/node_modules/ts-jest", { isolatedModules: true }] },
  moduleNameMapper: { "^\\.\\./safe-link$": "<rootDir>/safe-link" },
};
