cd /home/nolan/projects/ping || exit 1
git update-ref refs/lanes/laneB13/dirty-tree-base 0264d517ea53358d9246ddbbba66bb9dd0beb0d4
echo "ref now points at: $(git rev-parse refs/lanes/laneB13/dirty-tree-base)"
echo "worktree still dirty: $(git status --porcelain | wc -l) porcelain lines"
echo "HEAD unchanged: $(git rev-parse HEAD)"
git status --porcelain | head -3
