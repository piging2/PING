cd /home/nolan/projects/ping
echo "=== FULL ASK CONFIG ==="
npx jest --config src/fyd/ask/jest.config.cjs 2>&1 | grep -E "Tests:|Suites:|✕" | head -30
