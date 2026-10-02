cd /home/nolan/projects/ping
grep -rni "conflict" src/fyd/sitespec/*.ts src/lib/ping/types.ts 2>/dev/null | grep -vi "conflict-free" | head -20
echo === evidence types ===
grep -rn "EvidenceStep\|evidence" src/lib/ping/types.ts | head -10
