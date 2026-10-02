const path = require('path');
const NM = '/home/hatch/workspace/tenanos-wave/swarm-05/jest-run/node_modules';

module.exports = {
  rootDir: __dirname,
  roots: [
    '<rootDir>/P-20260923-005',
    '<rootDir>/P-20260923-006',
    '<rootDir>/P-20260923-013',
  ],
  transform: {
    '^.+\\.tsx?$': [
      path.join(NM, 'ts-jest'),
      { tsconfig: path.join(__dirname, 'tsconfig.json'), isolatedModules: false },
    ],
  },
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
