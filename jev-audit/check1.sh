for d in /home/nolan/ping/worktrees/jev-surgical /home/nolan/ping/worktrees/gw-repair-build; do
  echo "=== $d"
  git -C "$d" rev-parse --abbrev-ref HEAD 2>&1
  git -C "$d" rev-parse HEAD 2>&1
  echo "--- status:"; git -C "$d" status --porcelain 2>&1 | head -5
done
echo "=== /tmp scratch checkouts:"
for t in jev-preflight jev-pristine jev-independent-checkout jev-final-checkout jev-repair-checkout jev-broken-checkout; do
  echo "--- /tmp/$t:"
  if [ -d "/tmp/$t/.git" ]; then
    git -C "/tmp/$t" rev-parse --abbrev-ref HEAD 2>&1
    git -C "/tmp/$t" rev-parse --short HEAD 2>&1
    echo "--- /tmp/$t status:"; git -C "/tmp/$t" status --porcelain 2>&1 | head -3
  else
    echo MISSING_OR_NOT_GIT
  fi
done
