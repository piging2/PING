echo "=== /tmp entries:"; ls /tmp/ | head -40
echo "=== any jev dirs anywhere in /tmp:"; find /tmp -maxdepth 2 -name '*jev*' 2>/dev/null
echo "=== recent gate-relevant commits in jev-surgical:"
git -C /home/nolan/ping/worktrees/jev-surgical log --oneline -8 2>&1
echo "=== files changed in gate commit:"
git -C /home/nolan/ping/worktrees/jev-surgical show --stat --oneline HEAD 2>&1 | head -30
