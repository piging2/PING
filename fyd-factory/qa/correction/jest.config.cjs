/**
 * QA-CORRECT jest config. rootDir is the Pig scratch dir the tests run from;
 * the repo is referenced by absolute path inside the tests. "@/"" maps into
 * the fyd-factory repo src tree.
 */
module.exports = {
  testEnvironment: "node",
  rootDir: "/home/nolan/qa-correction",
  testMatch: ["<rootDir>/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "/home/nolan/projects/ping/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "/home/nolan/projects/ping/node_modules/ts-jest",
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
