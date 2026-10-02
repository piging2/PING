cd /home/nolan/projects/ping
npx jest --config src/fyd/ask/jest.config.cjs src/fyd/object/__tests__/confirm-command.test.ts src/fyd/object/__tests__/consequence-detection.test.ts src/fyd/object/__tests__/why-this-steps.test.ts 2>&1 | grep -E "Tests:|Suites:|✕" | head -20
