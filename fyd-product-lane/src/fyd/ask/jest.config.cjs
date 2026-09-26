/**
 * Jest config for the Ask FYD lane (fyd/ask-capabilities). Scoped to this
 * lane's tests plus the /api/fyd/ask route tests (same lane); sibling lanes
 * own their own test scope. Run with:
 * npx jest --config src/fyd/ask/jest.config.cjs
 */
const path = require("path");
// Absolute path to the minimal next/server stub used by route tests, so the
// inline tsconfig below can map "next/server" for type-checking.
const NEXT_SERVER_STUB = path.resolve(
  __dirname,
  "../../app/api/fyd/ask/__tests__/next-server-stub.ts",
);
module.exports = {
  testEnvironment: "node",
  rootDir: "../../..",
  testMatch: [
    "<rootDir>/src/fyd/ask/__tests__/*.test.ts",
    "<rootDir>/src/app/api/fyd/ask/__tests__/*.test.ts",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // The test sandbox does not install next; route tests use a minimal
    // stub providing NextRequest/NextResponse (see next-server-stub.ts).
    "^next/server$": "<rootDir>/src/app/api/fyd/ask/__tests__/next-server-stub.ts",
    "\\.css$": "<rootDir>/src/fyd/components/__tests__/css-stub.js",
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
          resolveJsonModule: true,
          baseUrl: path.resolve(__dirname, "../../.."),
          paths: {
            // The test sandbox does not install next; type-check route tests
            // against the same minimal stub used at runtime (see
            // moduleNameMapper above).
            "next/server": [NEXT_SERVER_STUB],
            "@/*": [path.join(path.resolve(__dirname, "../../.."), "src/*")],
          },
        },
      },
    ],
  },
};
