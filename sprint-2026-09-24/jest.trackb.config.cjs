module.exports = {
  rootDir: "/home/nolan/projects/ping",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "/home/nolan/projects/ping/tsconfig.json", diagnostics: false, isolatedModules: true }],
  },
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "/home/nolan/projects/ping/src/$1",
  },
};
