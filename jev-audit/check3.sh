ls /tmp/jev-preflight /tmp/jev-pristine /tmp/jev-independent-checkout /tmp/jev-final-checkout /tmp/jev-repair-checkout /tmp/jev-broken-checkout 2>&1 | head -30
echo "=== file counts:"; for t in jev-preflight jev-pristine jev-independent-checkout jev-final-checkout jev-repair-checkout jev-broken-checkout; do echo -n "$t: "; find /tmp/$t -type f 2>/dev/null | wc -l; done
