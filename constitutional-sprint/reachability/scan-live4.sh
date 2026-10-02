#!/bin/bash
echo "### gateway /health (documented endpoint, plain GET)"
curl -s -m 8 http://localhost:8080/health | head -c 600; echo
echo "### rc gateway /health"
curl -s -m 8 http://127.0.0.1:18099/health | head -c 600; echo
echo "### served site vs sprint worktree commit distance"
cd /home/nolan/projects/ping-constitutional && git log --oneline e48ef710cb889bf4d59b833ef9766067a9e2bbf0..a69bb68f 2>/dev/null | wc -l
cd /home/nolan/projects/ping-constitutional && git merge-base --is-ancestor e48ef710cb889bf4d59b833ef9766067a9e2bbf0 a69bb68f 2>/dev/null && echo "served HEAD is ancestor of sprint HEAD" || echo "not ancestor / different history"
echo "### next-server (3100) gateway env (names + host:port only)"
tr '\0' '\n' < /proc/87920/environ 2>/dev/null | grep -iE "gateway|journal" | sed -E 's/=.*:\/\/([^@]*@)?([^/:]+)(:[0-9]+)?.*/=<\1\2\3>/' | head -10
echo "### session.test.ts header"
head -30 /home/nolan/projects/ping-constitutional/src/fyd/identity/__tests__/session.test.ts
echo "### qdrant port check (is qdrant actually answering despite unhealthy tag?)"
curl -s -m 5 http://localhost:6333/ | head -c 200; echo
