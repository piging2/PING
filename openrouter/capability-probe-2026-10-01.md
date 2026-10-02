# OpenRouter capability probe — 2026-10-01 18:35 MDT (initial)

Free inference is opportunistic compute. Routing degrades gracefully; never silently spend money because a free endpoint disappeared.

| MODEL ID | CURRENT PRICE | AVAILABLE | LATENCY | CONTEXT | TOOLS | FAILURE RATE | LAST VERIFIED |
|---|---|---|---|---|---|---|---|
| nvidia/nemotron-3-ultra-550b-a55b:free | $0/$0 | YES | fast | ~1M | yes | 0/2 | 2026-10-01 18:35 MDT |
| cohere/north-mini-code:free | $0/$0 | YES | fast | 256K | yes | 0/1 | 2026-10-01 18:35 MDT |
| qwen/qwen3.8-27b:free | $0/$0 | YES | fast | 262K | yes | 0/1 | 2026-10-01 18:35 MDT |
| typesafe/jev-router | free (-1/-1) | YES | fast | n/a | yes | 0/2 | 2026-10-01 18:35 MDT |
| poolside/laguna-s-2.1:free | $0/$0 | RATE-LIMITED | n/a | n/a | yes | 2/2 (HTTP 429) | 2026-10-01 18:35 MDT |
| thinkingmachines/inkling:free | $0/$0 | BLOCKED via or.py | n/a | ~1.05M | yes | 1/1 (HTTP 403: agentic-harness-only) | 2026-10-01 18:35 MDT |

Notes:
- Laguna S free 429'd on first contact: free IDs carry low account-level limits. Retry with backoff; do not treat as dead.
- Inkling free 403s through direct API calls ("only available on agentic harnesses"). May work when driven through Goose as the harness; untested. Do not route or.py traffic to it.
- Nemotron Ultra free is the current default for agent labor. Jev is the fallback when genuine autonomy or higher reliability is required.
- Degradation order: Nemotron Ultra free → North Mini Code free / Qwen 27B free → deterministic queue/retry → Jev (policy-gated).

Probe method: `or.py chat --model <id> --prompt "Reply with exactly: ok"`, trivial prompt, 90s timeout.
Re-probe cadence: on routing failures, and before any large swarm dispatch.
