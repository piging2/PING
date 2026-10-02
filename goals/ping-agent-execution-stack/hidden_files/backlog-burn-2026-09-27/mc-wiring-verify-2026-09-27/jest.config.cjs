/** Jest config for the Mission Control -> FYD wiring patch verification.
 * Verifies the STAGED patch (byte-identical copies) without applying it to
 * any tree, serving it, or deploying it. Local only, mock fetch, no Pig. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/*.test.ts", "<rootDir>/tests/*.test.tsx"],
  transform: {
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2019",
          module: "commonjs",
          moduleResolution: "node",
          jsx: "react-jsx",
          esModuleInterop: true,
          strict: false,
          skipLibCheck: true,
          allowJs: true,
          types: ["jest", "node"],
          typeRoots: ["/home/hatch/workspace/fyd-build/node_modules/@types"],
        },
      },
    ],
  },
  // jsdom 30 depends on the ESM-only @exodus/bytes; let ts-jest compile it.
  transformIgnorePatterns: ["/node_modules/(?!@exodus/bytes/)"],
};
