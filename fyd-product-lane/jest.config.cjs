module.exports = {
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/src/**/__tests__/*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { target: "ES2017", module: "commonjs", moduleResolution: "node", esModuleInterop: true, strict: true, skipLibCheck: true } }],
  },
};
