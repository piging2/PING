#!/bin/bash
echo "=== rpcbind justification in docs ==="
grep -ril "rpcbind\|port 111\|:111" /opt/ping/*.md /opt/ping/docs/ /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/*.md 2>/dev/null | head -5; echo "doc_grep_done"
echo "=== exit-137 / OOM alert wiring ==="
grep -ril "exit 137\|exit-137\|oom" /opt/ping/*.md /opt/ping/docs/ 2>/dev/null | head -5; echo "alert_grep_done"
ls /opt/ping/ | head -20
echo "=== snapshot digest ==="
sha256sum /opt/ping/releases/qdrant-snapshots-2026-09-16/knowledge-knowledge-7722890700902776-2026-09-17-02-26-36.snapshot 2>/dev/null
echo "=== re-derivation path components ==="
ls /opt/ping/ | grep -i -e embed -e index -e pipeline | head -5; echo "rederivation_done"
