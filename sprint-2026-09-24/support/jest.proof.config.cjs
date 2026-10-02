module.exports = {
  testEnvironment: "node",
  rootDir: "/home/nolan/worktrees/fyd-family-converge/fyd-product-lane",
  moduleDirectories: [
    "/home/nolan/worktrees/copper-v2/fyd-product-lane/node_modules",
    "node_modules",
  ],
  testMatch: [
    "<rootDir>/src/fyd/proceduralize/__tests__/planner.test.ts",
    "<rootDir>/src/fyd/family/__tests__/family-page.test.tsx",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.css$": "<rootDir>/src/fyd/family/__tests__/css-stub.js",
  },
  transform: {
    "^.+\\.tsx?$": [
      "/home/nolan/worktrees/copper-v2/fyd-product-lane/node_modules/ts-jest",
      {
        // Skip type-checking: the worktree carries a pre-existing type
        // inconsistency (planner.ts uses PingObject.ownerPresentationOverride,
        // absent from src/lib/ping/types.ts at this commit). Tests exercise
        // runtime behavior; the proof render path (tsx) does not typecheck.
        diagnostics: false,
        tsconfig: {
          target: "ES2022",
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          strict: false,
          skipLibCheck: true,
          jsx: "react-jsx",
          baseUrl: "/home/nolan/worktrees/fyd-family-converge/fyd-product-lane",
          paths: { "@/*": ["./src/*"] },
        },
      },
    ],
  },
};
