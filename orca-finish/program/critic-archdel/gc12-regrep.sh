#!/bin/bash
# GC-12 re-grep pass: re-verify all 24 proven-dead deletion claims for the
# quoting blind spot that falsified C5 P-5 (single-quote-only grep missed a
# double-quoted require). This pass matches require/import/from in ALL quote
# forms (single, double, backtick), with any path prefix and optional .js/.ts
# extension. It does NOT re-do the live-closure analysis; it closes only the
# GC-12 quoting blind spot.
set -u
REPO=/home/nolan/ping
cd "$REPO" || { echo "FATAL: cannot cd $REPO"; exit 1; }
echo "REPO_SHA=$(git rev-parse --short HEAD 2>/dev/null) BRANCH=$(git branch --show-current 2>/dev/null) DIRTY=$(git status --short 2>/dev/null | wc -l)"

# check <label> <own-path-fragment> <basename>...
# own-path-fragment excludes the module's own file (self-references).
check() {
  local label="$1"; local own="$2"; shift 2
  echo "=== $label ==="
  local found=0
  for name in "$@"; do
    while IFS= read -r line; do
      case "$line" in *"$own"*) continue;; esac
      case "$line" in *RepositoryKnowledgeIndex/dependency_graph.json*) continue;; esac
      echo "  HIT: $line"; found=1
    done < <(grep -rn --include='*.js' --include='*.ts' --include='*.mjs' \
      --include='*.cjs' --include='*.jsx' \
      --exclude-dir=node_modules --exclude-dir=.git \
      -e "require(['\"\`][^'\"\`]*${name}\(\.\(js\|ts\)\)\?['\"\`])" \
      -e "from ['\"\`][^'\"\`]*${name}\(\.\(js\|ts\)\)\?['\"\`]" \
      -e "import(['\"\`][^'\"\`]*${name}\(\.\(js\|ts\)\)\?['\"\`])" \
      . 2>/dev/null)
  done
  [ "$found" -eq 0 ] && echo "  CLEAN"
}

check "D-1 approval_authority" "gateway/approval_authority.js" "approval_authority"
check "D-2 commit_authority" "gateway/commit_authority.js" "commit_authority"
check "D-3 patch_authority+v2" "gateway/patch_authority" "patch_authority" "patch_authority_v2"
check "D-4 mission_execution_authority" "gateway/mission_execution_authority.js" "mission_execution_authority"
check "D-5 authority_container" "gateway/authority_container.js" "authority_container"
check "D-6 registry+bootstrap" "gateway/constitutional_" "constitutional_authority_registry" "constitutional_bootstrap"
check "D-7 filesystem_authority" "gateway/filesystem_authority.js" "filesystem_authority"
check "D-8 effect_authority+business_action" "ping-runtime/approval/" "effect_authority" "business_action_authority"
check "D-9 proposal_pipeline" "ping-runtime/orchestration/proposal_pipeline.js" "proposal_pipeline"
check "D-10 continuous_reflection_loop" "gateway/continuous_reflection_loop.js" "continuous_reflection_loop"

echo "=== D-11 agents/worker_port (path-fragment form; live worker_port.js at orchestration/execution is EXPECTED) ==="
grep -rn --include='*.js' --include='*.ts' --exclude-dir=node_modules --exclude-dir=.git \
  -e "require(['\"\`][^'\"\`]*agents/worker_port['\"\`])" \
  -e "from ['\"\`][^'\"\`]*agents/worker_port['\"\`]" . 2>/dev/null | grep -v "ping-runtime/agents/worker_port.js" || echo "  CLEAN"

echo "=== D-12 orchestration/index (path-fragment form) ==="
grep -rn --include='*.js' --include='*.ts' --exclude-dir=node_modules --exclude-dir=.git \
  -e "require(['\"\`][^'\"\`]*orchestration/index['\"\`])" \
  -e "from ['\"\`][^'\"\`]*orchestration/index['\"\`]" . 2>/dev/null | grep -v "ping-runtime/orchestration/index.js" || echo "  CLEAN"

check "D-13 capability-authority (TS)" "runtime/kernel/capabilities/capability-authority.ts" "capability-authority"

echo "=== D-14 MCPReference (type identifier, all .ts) ==="
grep -rn --include='*.ts' --exclude-dir=node_modules --exclude-dir=.git "MCPReference" . 2>/dev/null \
  | grep -v "runtime/kernel/capabilities/capability.ts" | grep -v "runtime/kernel/identity/typed-references.ts" || echo "  CLEAN"

echo "=== D-15 WorkerPort.execute callers (scoped, KEEP file) ==="
grep -rn --include='*.js' --exclude-dir=node_modules --exclude-dir=.git "\.execute(" ping-runtime/orchestration/execution/ 2>/dev/null \
  | grep -v "orchestration/execution/worker_port.js" || echo "  CLEAN"

echo "=== D-16 OllamaWorkerPort/DevinWorkerPort instantiations ==="
grep -rn --include='*.js' --exclude-dir=node_modules --exclude-dir=.git -e "new OllamaWorkerPort" -e "new DevinWorkerPort" . 2>/dev/null || echo "  CLEAN"

check "D-17 execution_repository" "gateway/repositories/execution_repository.js" "execution_repository"
check "D-18 checkpoint_repository" "gateway/repositories/checkpoint_repository.js" "checkpoint_repository"
check "D-19 checkpoint_authority" "gateway/checkpoint_authority.js" "checkpoint_authority"

echo "=== D-20 advisory_lock / AdvisoryLock (module + identifier) ==="
{ check "D-20a advisory_lock module" "gateway/advisory_lock.js" "advisory_lock";
  echo "--- identifier AdvisoryLock outside own file ---";
  grep -rn --include='*.js' --exclude-dir=node_modules --exclude-dir=.git "AdvisoryLock" . 2>/dev/null | grep -v "gateway/advisory_lock.js" || echo "  CLEAN (identifier)"; }

check "D-21 graceful_shutdown" "gateway/graceful_shutdown.js" "graceful_shutdown"

echo "=== D-22 mission_workflow + temporal/index ==="
check "D-22a mission_workflow" "ping-runtime/temporal/workflows/mission_workflow.js" "mission_workflow"
grep -rn --include='*.js' --exclude-dir=node_modules --exclude-dir=.git \
  -e "require(['\"\`][^'\"\`]*temporal/index['\"\`])" \
  -e "from ['\"\`][^'\"\`]*temporal/index['\"\`]" . 2>/dev/null | grep -v "ping-runtime/temporal/index.js" || echo "  CLEAN (temporal/index)"
echo "--- gateway_runtime.js temporal mentions (expect none) ---"
grep -ci "temporal" gateway/gateway_runtime.js 2>/dev/null | sed 's/^/  count: /'

check "D-23 execution_repository_port" "gateway/execution_repository_port.js" "execution_repository_port"

echo "=== D-24 crx main.py:95 debug print ==="
sed -n '95p' /home/nolan/crx/app/main.py 2>/dev/null | sed 's/^/  line95: /'

echo "DONE"
