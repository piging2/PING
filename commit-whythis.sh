cd /home/nolan/projects/ping
git -c user.name="Pigi" -c user.email="pigi@ping.social" commit -m "fyd: generic WhyThis evidence drill-down on rendered object facts

Every FydObjectCard now carries a quiet 'Why this?' disclosure built by
whyThisStepsFor (src/fyd/object/why-this-steps.ts), a pure function of
PingObject that renders the SOURCE -> OBSERVED EVIDENCE -> EXTRACTION
METHOD -> STATUS chain from the object's own provenance. No
customer-specific conditionals; missing links render as 'unknown' and a
missing provenance record omits the affordance (fail closed).

Proven on the served :3100 coppersmith-plumbing site for the 'Plumbing'
service fact (object website-business-2f1327c09d622175-service-139408827c27).
Unit tests: src/fyd/object/__tests__/why-this-steps.test.ts (5 pass)." > /mnt/c/Users/nolan/transfer/commit-whythis.log 2>&1
echo "COMMIT_EXIT=$?"
git log --oneline -1
git status --short src/fyd/components/renderer.tsx src/fyd/object/why-this-steps.ts src/fyd/object/__tests__/why-this-steps.test.ts
