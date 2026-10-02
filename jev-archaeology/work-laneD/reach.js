const path = require("path"), fs = require("fs");
const ROOT = "/home/nolan/ping";
const seen = new Set();
function walk(f) {
  f = path.resolve(f);
  if (seen.has(f) || !f.startsWith(ROOT) || f.includes("node_modules")) return;
  if (!fs.existsSync(f)) {
    const j = f + ".js";
    if (fs.existsSync(j)) f = j; else return;
  }
  let st;
  try { st = fs.statSync(f); } catch (e) { return; }
  if (st.isDirectory()) return;
  seen.add(f);
  let src = "";
  try { src = fs.readFileSync(f, "utf8"); } catch (e) { return; }
  const pat = "require(";
  let idx = 0;
  while (true) {
    idx = src.indexOf(pat, idx);
    if (idx < 0) break;
    const q = src[idx + pat.length];
    if (q === '"' || q === "'") {
      const end = src.indexOf(q, idx + pat.length + 1);
      if (end > 0) {
        const mod = src.slice(idx + pat.length + 1, end);
        if (mod.startsWith(".")) {
          let t = path.resolve(path.dirname(f), mod);
          if (!t.endsWith(".js") && !t.endsWith(".json")) t += ".js";
          walk(t);
        }
      }
    }
    idx += pat.length;
  }
}
walk(ROOT + "/gateway/bootstrap/gateway_runtime.js");
const cands = [
  "gateway/self_improvement_loop.js","gateway/approval_authority.js","gateway/patch_authority.js",
  "gateway/patch_authority_v2.js","gateway/transaction_boundary.js","gateway/ollama_adapter.js",
  "gateway/authority_container.js","gateway/witness_recorder.js","gateway/witness_registry.js",
  "gateway/replay_verifier.js","gateway/continuous_acquisition.js","gateway/acquisition_authority.js",
  "gateway/technology_authority.js","gateway/adapter_compiler_v2.js",
  "ping-runtime/agents/replay_worker.js","ping-runtime/agents/base_worker.js",
  "ping-runtime/agents/distributed_desktop_agents.js","ping-runtime/agents/worker_port.js",
  "ping-runtime/approval/business_action_authority.js","ping-runtime/approval/effect_authority.js",
  "ping-runtime/orchestration/execution/engine.js","ping-runtime/orchestration/execution/consensus_engine.js",
  "ping-runtime/orchestration/merge_gate.js","ping-runtime/orchestration/intelligence_graph.js",
  "ping-runtime/orchestration/execution/context_authority.js",
  "ping-runtime/orchestration/execution/artifact_authorities.js",
  "ping-runtime/orchestration/dormant_classifier.js","ping-runtime/orchestration/index.js",
  "ping-runtime/orchestration/execution/ollama_provider.js",
  "ping-runtime/knowledge/knowledge_promoter.js","ping-runtime/workers/canonical_workers.js"
];
for (const c of cands) {
  const full = ROOT + "/" + c;
  console.log((seen.has(full) ? "REACHABLE " : "ORPHAN    ") + c);
}
console.log("total reachable files: " + seen.size);
