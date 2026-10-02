cp /mnt/c/Users/nolan/laneq-stage/ask-composer.ts /home/nolan/projects/ping/src/lib/ping/ask-composer.ts
cp /mnt/c/Users/nolan/laneq-stage/visitor-answer.ts /home/nolan/projects/ping/src/fyd/ask/visitor-answer.ts
echo "installed:"
grep -c "offers these services" /home/nolan/projects/ping/src/lib/ping/ask-composer.ts
grep -c "associationsClaim" /home/nolan/projects/ping/src/lib/ping/ask-composer.ts
grep -c "export type { AskClaimClassification }" /home/nolan/projects/ping/src/fyd/ask/visitor-answer.ts
cd /home/nolan/projects/ping && git status --porcelain src/lib/ping/ask-composer.ts src/fyd/ask/visitor-answer.ts
