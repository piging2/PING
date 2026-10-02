cd /home/nolan/projects/ping || { echo "NO_TREE"; exit 1; }
echo "=== REV ==="
git rev-parse HEAD
echo "=== BRANCH ==="
git branch --show-current
echo "=== STATUS ==="
git status --porcelain
echo "=== ENDSTATUS ==="
echo "=== DIFFSTAT ==="
git diff --stat
echo "=== NUMSTAT ==="
git diff --numstat
echo "=== UNTRACKED ==="
git ls-files --others --exclude-standard
echo "=== REFLOG ==="
git reflog -20 --date=iso
echo "=== STASH ==="
git stash list
echo "=== DONE ==="
