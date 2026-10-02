# OpenRouter open-source shortlist (prepared 2026-09-27, no model calls made)

Source: live OpenRouter /v1/models catalog + web research. Prices per 1M tokens.

## Xiaomi MiMo (MIT licensed, open weights)
- `xiaomi/mimo-v2.6-pro` — $0.435 in / $0.87 out, 1.05M ctx. Released 2026-09-21.
  1.02T MoE / 42B active. Top open-weight score on Artificial Analysis Intelligence
  Index (46). Best capability-per-dollar in the open class. PRIMARY PICK.
- `xiaomi/mimo-v2.6-flash` — $0.14 in / $0.28 out, 1.05M ctx. 309B / 15B active.
  Near-Pro on agent workflow benchmarks (AutomationBench 52.3 vs 53.1), weaker on
  terminal tasks. Budget agent-loop pick.
- `xiaomi/mimo-v2.6-pro-ultraspeed` — $4.35 in / $8.70 out. 10x price for speed tier.
  Only if latency dominates.
- `xiaomi/mimo-v2.5-pro` — superseded by v2.6, same price. Skip.

## Zhipu GLM (note: current line is 5.x, not 3.x)
- `z-ai/glm-5.3-flash` — $0.045 in / $0.14 out, 1.31M ctx. 320B / 18B active,
  native multimodal, MIT. The former stealth "Ox Alpha" that topped OpenRouter
  blind tests. Absurdly cheap for the quality. VOLUME PICK.
- `z-ai/glm-5.3` — $1.40 in / $4.40 out, 1.31M ctx. Flagship, text-only input,
  744B / 40B active. Same base as 5.2, gains from post-training. MAX-QUALITY PICK.
  License is the new GLM-5.3 License (not MIT) — matters only for self-hosting.
- `z-ai/glm-5.2` — $0.65 / $2.04, 1.05M ctx, MIT. Superseded by 5.3. Skip unless
  5.3 has issues.
- `z-ai/glm-5.3-prime` — $2.80 / $8.80. Premium tier of 5.3. Skip unless needed.

## Thinking
- No `:free` variants exist yet for v2.6 or glm-5.3 on the catalog; the old
  `mimo-v2.5-pro:free` (200 req/day) pattern may repeat, worth watching.
- Recommended stack: mimo-v2.6-pro as the default workhorse, glm-5.3-flash for
  high-volume cheap loops, glm-5.3 when max quality matters.
- Hermes currently runs a free OpenRouter model; glm-5.3-flash at $0.045/$0.14
  is nearly free and far more capable — candidate replacement once approved.
