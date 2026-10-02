#!/bin/bash
# Lane 2 worktree inventory - outputs pipe-delimited records
REPO=/home/nolan/projects/ping
cd "$REPO" || exit 1
MAINBR=$(git branch --show-current 2>/dev/null)
echo "REPO_MAIN_HINT=$MAINBR"
git worktree list --porcelain | awk '
/^worktree / {wt=substr($0,10)}
/^branch / {br=substr($0,8); gsub("refs/heads/","",br); print wt "\t" br}
' | while IFS=$'\t' read -r WT BR; do
  if [ ! -d "$WT" ]; then echo -e "WTREC\t$WT\t$BR\tMISSING\tMISSING"; continue; fi
  HEAD=$(git -C "$WT" rev-parse --short HEAD 2>/dev/null || echo ERR)
  HEADD=$(git -C "$WT" log -1 --format='%ci|%s' HEAD 2>/dev/null | head -c 120)
  MOD=$(git -C "$WT" status --porcelain 2>/dev/null | grep -c '^ M\|^M')
  UNTR=$(git -C "$WT" status --porcelain 2>/dev/null | grep -c '^??')
  MODF=$(git -C "$WT" status --porcelain 2>/dev/null | grep '^ M\|^M' | sed 's/^...//' | head -15 | tr '\n' ';')
  UNTRF=$(git -C "$WT" status --porcelain 2>/dev/null | grep '^??' | sed 's/^...//' | head -15 | tr '\n' ';')
  UQ=$(git -C "$WT" rev-list --count "$HEAD" --not main 2>/dev/null || echo '?')
  echo -e "WTREC\t$WT\t$BR\t$HEAD\t$HEADD\tMOD=$MOD\tUNTR=$UNTR\tUQVSMAIN=$UQ"
  echo -e "MODFILES\t$WT\t$MODF"
  echo -e "UNTRFILES\t$WT\t$UNTRF"
done
