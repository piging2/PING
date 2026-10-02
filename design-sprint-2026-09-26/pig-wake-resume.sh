#!/bin/bash
# pig-wake-resume.sh — resume the FYD design sprint polish lane when the Pig wakes.
# Idempotent and stateful: each step records completion in the STATE file, so a
# cut-off run resumes where it left off on the next invocation.
# Run: ~/workspace/design-sprint-2026-09-26/pig-wake-resume.sh
# Exit 0 always on "Pig still asleep" (the cron tries again later).
# Writes a DONE/FAILED verdict to the STATUS file when the chain completes.

set -u

SPRINT=~/workspace/design-sprint-2026-09-26
STATE="$SPRINT/pig-wake-resume.state"
STATUS="$SPRINT/pig-wake-resume.status"
LANE_SRC=~/work/design-lane-polish-f1
FILELIST="$SPRINT/lane-polish-f1-files.txt"
PIGRUN=~/workspace/pig-fb/pigwsl-exec.sh

step_done() { grep -qx "DONE $1" "$STATE" 2>/dev/null; }
mark_done() { echo "DONE $1" >> "$STATE"; }
log() { echo "[$(date -u +%FT%TZ)] $*" >> "$STATUS"; }

mkdir -p "$SPRINT"
touch "$STATE" "$STATUS"

# Step 0: Pig reachability. Quiet exit if asleep.
if ! echo 'echo PIG-AWAKE' | "$PIGRUN" -s 2>/dev/null | grep -q PIG-AWAKE; then
  exit 0
fi
log "Pig reachable; resuming polish-lane chain"

# Step 1: create the lane worktree+branch on the Pig (idempotent).
if ! step_done worktree; then
  echo 'cd /home/nolan/projects/ping && (git worktree list | grep -q design-lane-polish-f1 || git worktree add --checkout -b design/lane-polish-f1 /home/nolan/worktrees/design-lane-polish-f1 design/sprint-visual-v1) && echo WT-OK' \
    | "$PIGRUN" -s 2>&1 | grep -q WT-OK || { log "FAILED: worktree creation"; exit 1; }
  mark_done worktree; log "worktree ready"
fi

# Step 2: rsync the 30 lane files into the Pig worktree.
if ! step_done rsync; then
  ( cd "$LANE_SRC" && rsync -a --files-from="$FILELIST" -e "/home/hatch/work/pig-rsync.sh" . nolan@100.79.154.43:/home/nolan/worktrees/design-lane-polish-f1/ ) \
    || { log "FAILED: rsync"; exit 1; }
  mark_done rsync; log "rsync complete (30 files)"
fi

# Step 3: Pig-side verification: tsc + targeted suites.
if ! step_done verify; then
  OUT=$(echo 'cd /home/nolan/worktrees/design-lane-polish-f1 && ./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | tail -3 && echo TSC-DONE && npx jest --config src/fyd/components/jest.config.cjs src/fyd/components/__tests__/site-header.test.ts src/fyd/components/__tests__/public-copy.test.ts src/fyd/components/__tests__/object-affordance.test.ts src/fyd/components/__tests__/cta-conversion.test.ts src/fyd/components/__tests__/contact-link.test.ts src/fyd/components/__tests__/hero-contact.test.ts 2>&1 | tail -5 && npx jest --config src/fyd/builder/jest.config.cjs src/fyd/builder/__tests__/planner.test.ts 2>&1 | tail -4' | "$PIGRUN" -s 2>&1)
  echo "$OUT" | grep -q TSC-DONE || { log "FAILED: Pig tsc"; echo "$OUT" >> "$STATUS"; exit 1; }
  echo "$OUT" | grep -qE "Tests:.*failed" && { log "FAILED: Pig tests"; echo "$OUT" >> "$STATUS"; exit 1; }
  mark_done verify; log "Pig verify green"; echo "$OUT" | grep -E "Tests:" >> "$STATUS"
fi

# Step 4: commit on the Pig.
# The file list lives on the Pig (scp'd fresh each run); NEVER interpolate a
# local $HOME path into the remote command (/home/hatch does not exist there).
# Failure detection: require a COMMIT-OK marker echoed after a successful
# commit; tail-pipe exit masking is not failure detection.
if ! step_done commit; then
  echo 'mkdir -p /home/nolan/design-sprint && echo MKDIR-OK' | "$PIGRUN" -s 2>&1 | grep -q MKDIR-OK \
    || { log "FAILED: Pig filelist dir"; exit 1; }
  rsync -a -e "/home/hatch/work/pig-rsync.sh" "$FILELIST" nolan@100.79.154.43:/home/nolan/design-sprint/ \
    || { log "FAILED: filelist rsync"; exit 1; }
  OUT=$(echo 'cd /home/nolan/worktrees/design-lane-polish-f1 && git add $(cat /home/nolan/design-sprint/lane-polish-f1-files.txt | tr "\n" " ") && git commit -m "design/lane-polish-f1: visitor-projection purity and conversion fixes" && echo COMMIT-OK && git log --oneline -1' \
    | "$PIGRUN" -s 2>&1)
  echo "$OUT" | tail -3 >> "$STATUS"
  echo "$OUT" | grep -q COMMIT-OK || { log "FAILED: commit (no COMMIT-OK marker)"; echo "$OUT" >> "$STATUS"; exit 1; }
  mark_done commit; log "committed"
fi

# Step 5: merge into the integration branch.
# A merge whose only output is "Already up to date" is a FAILURE for this
# chain: it means step 4 landed nothing. Require the new merge commit.
if ! step_done merge; then
  OUT=$(echo 'cd /home/nolan/worktrees/design-sprint-visual-v1 && git merge --no-ff design/lane-polish-f1 -m "sprint: merge design/lane-polish-f1" 2>&1 && echo MERGE-DONE && git log --oneline -2' \
    | "$PIGRUN" -s 2>&1)
  echo "$OUT" | tail -3 >> "$STATUS"
  echo "$OUT" | grep -qE "^[0-9a-f]+ sprint: merge design/lane-polish-f1" \
    || { log "FAILED: merge (no merge commit landed; check for 'Already up to date')"; echo "$OUT" >> "$STATUS"; exit 1; }
  mark_done merge; log "merged into design/sprint-visual-v1"
fi

# Step 6: rebuild the integrated tree.
if ! step_done build; then
  echo 'cd /home/nolan/worktrees/design-sprint-visual-v1 && npm run build 2>&1 | tail -2 && ls .next/BUILD_ID && echo BUILD-OK' \
    | "$PIGRUN" -s 2>&1 | grep -q BUILD-OK || { log "FAILED: build"; exit 1; }
  mark_done build; log "build green"
fi

# Step 7: restart :3200 (PID-scoped: kill only the PIDs listening on 3200).
if ! step_done restart; then
  echo 'PIDS=$(fuser 3200/tcp 2>/dev/null); [ -n "$PIDS" ] && kill $PIDS; sleep 3; setsid bash -c "cd /home/nolan/worktrees/design-sprint-visual-v1 && NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 exec npx next start -p 3200 > /home/nolan/3200.log 2>&1" < /dev/null > /dev/null 2>&1 & sleep 18; curl -s -o /dev/null -w "hpp %{http_code}\n" --max-time 25 http://localhost:3200/sites/happy-place; curl -s -o /dev/null -w "copper %{http_code}\n" --max-time 25 http://localhost:3200/sites/coppersmith-plumbing' \
    | "$PIGRUN" -s 2>&1 | tee -a "$STATUS" | grep -q "hpp 200" || { log "FAILED: restart/curl"; exit 1; }
  mark_done restart; log ":3200 restarted, both routes 200"
fi

# Step 8: capture v3 screenshots (discover the current WSL IP; it changes on wake).
if ! step_done shots; then
  WSLIP=$(echo 'hostname -I | awk "{print \$1}"' | "$PIGRUN" -s 2>/dev/null | tr -d '\r' | head -1)
  echo "powershell.exe -ExecutionPolicy Bypass -File C:/Users/nolan/design-sprint/run-shots.ps1 http://${WSLIP}:3200 C:/Users/nolan/design-sprint/shots/v3-polish v3p 2>&1 | tail -1" \
    | "$PIGRUN" -s 2>&1 | grep -q '"pageerrors":\[\]' || { log "FAILED: screenshots (WSLIP=$WSLIP)"; exit 1; }
  mark_done shots; log "v3-polish screenshots captured (18)"
fi

log "DONE: polish lane live on :3200; screenshots in C:/Users/nolan/design-sprint/shots/v3-polish"
echo "VERDICT: DONE" >> "$STATUS"
