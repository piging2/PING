# FYD auth lane: remaining verification steps (run on Pig WSL after SSH recovers)

1. Push fixed files:
   - identity/config.ts
   - identity/callback-flow.ts
   - routes/google/callback/route.ts (static import cleanup)

2. Re-run identity suite:
   npx jest --config src/fyd/identity/jest.config.cjs

3. Type-check scoped to new files:
   npx tsc --noEmit 2>&1 | grep -E "fyd/identity|api/fyd/auth"

4. Run all 12 existing module suites + identity suite, record totals.

5. Commit chunk 4 (pathspec):
   git add <7 routes + 2 tests> && git commit -m "fyd(identity): Google auth routes, route tests, demo-owner regression" -- <same paths>

6. Report: harvest table, Better Auth evaluation, SHAs, test totals.
