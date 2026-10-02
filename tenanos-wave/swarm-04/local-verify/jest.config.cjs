module.exports = {
  testEnvironment: "node",
  rootDir: "../stage",
  testMatch: ["<rootDir>/src/tenanos/__tests__/*.test.ts"],
  transform: {
    "^.+\.tsx?$": ["/home/hatch/workspace/tenanos-wave/swarm-04/local-verify/node_modules/ts-jest", { tsconfig: { target: "ES2017", module: "commonjs", moduleResolution: "node", esModuleInterop: true, strict: true, skipLibCheck: true } }],
  },
};
