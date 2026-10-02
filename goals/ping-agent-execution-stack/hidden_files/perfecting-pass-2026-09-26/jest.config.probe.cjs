/** Jest harness for perfecting-pass probe tests. Rooted at the fyd-build
 *  lane so probe files in the goal hidden_files dir can import the lane's
 *  modules; @/ maps exactly like the lane's own config. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "/home/hatch/workspace/fyd-build",
  roots: [
    "/home/hatch/workspace/goals/ping-agent-execution-stack/hidden_files/perfecting-pass-2026-09-26",
  ],
  testMatch: ["**/*.probe.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "/home/hatch/workspace/fyd-build/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2017",
          module: "commonjs",
          moduleResolution: "node",
          baseUrl: ".",
          jsx: "react-jsx",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
        },
      },
    ],
  },
};
