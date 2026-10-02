cd /home/nolan/projects/ping
grep -rn "Links\|CTA" src/fyd/components/__tests__/claim-badge.test.ts src/fyd/components/__tests__/render.test.ts 2>/dev/null | head
echo === run claim-badge tests ===
npx jest --config src/fyd/components/jest.config.cjs claim-badge 2>&1 | tail -15
