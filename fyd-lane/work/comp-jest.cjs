module.exports = {
  testEnvironment: "node",
  rootDir: "/home/nolan/projects/ping",
  testMatch: ["<rootDir>/src/fyd/components/__tests__/*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { target: "ES2017", module: "commonjs", moduleResolution: "node", jsx: "react-jsx", esModuleInterop: true, strict: true, skipLibCheck: true } }] },
};
