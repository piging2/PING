cd /home/nolan/projects/ping
npx jest --config src/fyd/ask/jest.config.cjs src/app/api/fyd/ask/__tests__/ask-support-classes.test.ts src/app/api/fyd/ask/__tests__/object-scope.test.ts 2>&1 | grep -E "✓|✕|Tests:|Suites:"
