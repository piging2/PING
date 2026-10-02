module.exports = {
  testEnvironment: "node",
  rootDir: "./tree",
  testMatch: ["<rootDir>/src/tenanos/__tests__/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { target: "ES2017", module: "commonjs", moduleResolution: "node", esModuleInterop: true, strict: true, skipLibCheck: true } }],
  },
};
