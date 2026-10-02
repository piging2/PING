#!/bin/bash
# Swarm-14: shallow sparse clones at pinned SHAs (research only, never committed).
set -u
D=~/workspace/tenanos-wave/swarm-14/src
log() { echo "[clone] $*"; }

clone_sparse() { # repo, sha, dir, sparse-paths...
  local repo="$1" sha="$2" dir="$3"; shift 3
  if [ -d "$D/$dir/.git" ]; then
    log "$dir already cloned; verifying SHA"
    (cd "$D/$dir" && git rev-parse HEAD | grep -q "^$sha" && log "$dir OK @ $sha" || log "$dir SHA MISMATCH: $(git rev-parse HEAD)")
    return 0
  fi
  log "cloning $repo @ ${sha:0:12} -> $dir"
  git clone --no-checkout --filter=blob:none "https://github.com/$repo" "$D/$dir" 2>&1 | tail -1
  ( cd "$D/$dir" && git sparse-checkout init --cone 2>/dev/null; git sparse-checkout set "$@" && git checkout "$sha" 2>&1 | tail -1 && git rev-parse HEAD )
}

clone_branch_sparse() { # repo, branch, sha, dir, sparse-paths...
  local repo="$1" branch="$2" sha="$3" dir="$4"; shift 4
  if [ -d "$D/$dir/.git" ]; then log "$dir already cloned; skipping"; return 0; fi
  log "cloning $repo branch $branch @ ${sha:0:7} -> $dir"
  git clone --no-checkout --filter=blob:none --branch "$branch" "https://github.com/$repo" "$D/$dir" 2>&1 | tail -1
  ( cd "$D/$dir" && git sparse-checkout init --cone 2>/dev/null; git sparse-checkout set "$@" && git checkout "$sha" 2>&1 | tail -1 && git rev-parse HEAD )
}

clone_sparse restatedev/restate c0b4a74abec8 restate crates/types/src
clone_sparse PrefectHQ/fastmcp c6165d9193887d61a9c6ff2f7a50f1ee842ac70d fastmcp src/fastmcp/server/middleware src/fastmcp/server/auth
clone_sparse getzep/graphiti 13587ea graphiti graphiti_core/utils/maintenance graphiti_core/prompts
clone_sparse diegosouzapw/OmniRoute 18bbb101980c639cfabdc5663213836d917c3269 omniroute src/lib/quota src/lib/resilience open-sse/services/routing open-sse/handlers/chatCore
clone_branch_sparse letta-ai/letta archive 56ba9c2 letta-archive letta/schemas letta/services
log "done"
