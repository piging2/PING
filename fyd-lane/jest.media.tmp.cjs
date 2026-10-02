// Scratch jest config for the FYD media lane (lives in /tmp, not the repo).
// The repo has no jest config; ts-jest is installed but unwired.
module.exports = {
  rootDir: "/home/nolan/projects/ping",
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testPathIgnorePatterns: ["/node_modules/"],
};
