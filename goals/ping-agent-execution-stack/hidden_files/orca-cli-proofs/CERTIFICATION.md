# CLI Worker Certification — ORCA hardening workstream D (Track 3)
Date: 2026-09-18. Normalizer: Pigi workstream D. Evidence: adapter proofs in
`hidden_files/orca-cli-proofs/` (durable copies of the Pig's /tmp/orca-autonomy-proofs/*.json).

Rule applied: a worker is VERIFIED only on authorize -> dispatch -> result envelope ->
evidence -> verification PASS. Binary-start (smoke) alone is never VERIFIED.

## goose — VERIFIED
- binary available: YES (/home/nolan/.local/bin/goose, Pig WSL)
- profile registered: YES (external_agent_adapter.js + AGENT_PROFILES.md; dispatcher validator 64/64 green 2026-09-18)
- smoke invocation: OK (proof dispatch below subsumes it)
- WorkOrder accepted: YES — work_order_id 7d4d70c634273282
- authorization proven: YES — granted, capability text.transform, namespace core::orca-autonomy
- execution proven: YES — dispatch exit 0, not timed out, 26361ms
- result returned: YES — envelope status completed, output exact "THE PIG RUNS AT DAWN"
- evidence persisted: YES — goose-proof.json (durable copy in hidden_files/orca-cli-proofs/)
- verification passed: YES — verify.valid, WORKER_COMPLETED event e7fe2b77b6bd8dcbbe1e842e196054dbd51909affd6a52fcb9270a0f070d7eb6
- model: ollama:qwen2.5-coder:7b (Pig-local Ollama, no account)

## qwen — VERIFIED
- binary available: YES (/home/nolan/.local/node-v22.23.2-linux-x64/bin/qwen, Pig WSL)
- profile registered: YES (adapter + AGENT_PROFILES.md; validator 64/64)
- smoke invocation: OK
- WorkOrder accepted: YES — work_order_id b7a718f4465314fd
- authorization proven: YES — granted, text.transform, core::orca-autonomy
- execution proven: YES — exit 0, 69147ms
- result returned: YES — envelope completed, output exact "THE PIG RUNS AT DAWN"
- evidence persisted: YES — qwen-proof.json (durable copy)
- verification passed: YES — WORKER_COMPLETED 6daa2b7d52134c7ce2f1974853ca4cd145cb0675ae5faaa1d2bea1dd1179d3a0
- model: ollama:qwen2.5-coder:7b (Pig-local Ollama)

## crush — VERIFIED
- binary available: YES (/home/nolan/.local/node-v22.23.2-linux-x64/bin/crush, Pig WSL)
- profile registered: YES (adapter + AGENT_PROFILES.md; validator 64/64)
- smoke invocation: OK
- WorkOrder accepted: YES — work_order_id 86f957265cde9183
- authorization proven: YES — granted, text.transform, core::orca-autonomy
- execution proven: YES — exit 0, 2721ms
- result returned: YES — envelope completed, output exact "THE PIG RUNS AT DAWN"
- evidence persisted: YES — crush-proof.json (durable copy)
- verification passed: YES — WORKER_COMPLETED 441bee4b1036dc186145df96332c7e12ddd4bf9bbcdb059952399765f24a22ee
- model: copilot/gpt-4o-mini (invoked `crush run -m copilot/gpt-4o-mini`)

## opencode — PROFILE_LIVE_EXECUTION_BLOCKED (3 bounded attempts exhausted 2026-09-18)
- binary available: YES (/home/nolan/.opencode/bin/opencode — dispatcher path; /home/nolan/.local/bin/opencode also 1.18.31)
- profile registered: YES (adapter + AGENT_PROFILES.md; validator 64/64)
- smoke invocation: SMOKE_OK (1.18.31, trivial prompt ~13s)
- WorkOrder accepted: YES — work_order_id 26c5c393aada43ed (accepted on every attempt)
- authorization proven: YES — granted on every attempt, text.transform, core::orca-autonomy
- execution proven: NO — dispatch killed at 150s (prompt-run timeout), exit 124, empty stdout, on all 3 bounded proof attempts
- result returned: NO — no envelope
- evidence persisted: PARTIAL — opencode-proof.json records ok:false, verification FAIL (durable copy)
- verification passed: NO
- exact gate: NOT a permission gate. The deterministic hang is a stdin hang: opencode `run`
  supports stdin piping, so with an open never-EOF stdin pipe (Node execFile default stdio in
  prove-cli.js) it waits for piped input until prompt-run's 150s timeout kills it.
  _pig-ssh.sh already documents this ("stdin closed: remote tools (opencode) hang if stdin is
  left open"). Closing stdin in the spawn (stdio:['ignore','pipe','pipe']) did NOT fix the
  execFile path (2/2 still hung); the ssh path with stdin closed completes (11-80s).
  Residual execFile-vs-ssh difference unexplained within the attempt budget.
  Separately, qwen2.5-coder:7b is nondeterministic on the envelope: it intermittently ignores
  "No tools" (emits write-tool calls) or emits wrong-field JSON.
- attempts: (1) prove-cli.js opencode, default stdio, 150028ms exit 124;
  (2) prove-opencode2.js (stdio ignore), long prompt, 150044ms exit 124;
  (3) prove-opencode2.js (stdio ignore), COMPACT_PROMPT=1, 150025ms exit 124.
- no permission weakening used (no --auto, no allow-all, no config change); none recommended.
- recommended follow-up (future workstream, not this one): dispatcher-side stdin close in the
  spawn (matching _pig-ssh.sh), investigate the execFile-vs-ssh residual, and consider a more
  capable model or stricter envelope extraction for the 7b model.
