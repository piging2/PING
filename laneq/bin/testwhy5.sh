cd /home/nolan/projects/ping
npx jest --config src/fyd/ask/jest.config.cjs --testMatch '**/confirm-command.test.ts' '**/consequence-detection.test.ts' '**/why-this-steps.test.ts' 2>&1 | grep -E "Tests:|Suites:|✕" | head -20
