cd /home/nolan/projects/ping
npx jest --config src/fyd/ask/jest.config.cjs src/fyd/object/__tests__/confirm-command.test.ts 2>&1 | tail -15
