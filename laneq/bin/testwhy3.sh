cd /home/nolan/projects/ping
ls jest.config* 2>/dev/null; ls src/fyd/object/__tests__/*.test.ts | head
echo "=== run under root config ==="
npx jest --config jest.config.cjs src/fyd/object/__tests__/confirm-command.test.ts src/fyd/object/__tests__/consequence-detection.test.ts src/fyd/object/__tests__/why-this-steps.test.ts 2>&1 | grep -E "Tests:|Suites:|✕|No tests" | head -20
