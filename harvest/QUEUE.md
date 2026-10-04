# Harvest Queue

Initial queue from directive section 16 (2026-10-04). One repo per day, in order unless the Meta lane or business-graph work reprioritizes. Each line: repo + one-line WHY.

1. ~~facebook-python-business-sdk~~ — DONE 2026-10-04 (ADAPT). Next: wire cursor/errors into the facebook-graph skill for the account capability inventory.
2. **n8n** — WHY: tool-level approval + approval receipts + deterministic execution patterns for the business-action pipeline (INTENT -> PROPOSAL -> APPROVAL -> EXECUTION needs a proven approval-receipt shape).
3. **Activepieces** — WHY: piece/connector abstraction and action/trigger contracts for channel adapters (BUSINESS INTELLIGENCE -> ACTION PLAN -> CHANNEL ADAPTERS must not become five competing brains).
4. **Mautic** — WHY: campaign graphs, segments, lead lifecycle, and measurement — the closest open-source ancestor of the FYD marketing graph (WHAT WE TRIED / WHERE / WHAT HAPPENED / WHAT WE LEARNED).
5. **marketing-workspace / IWE** — WHY: persistent campaign memory (people, venues, posts, mentions, experiments, typed campaign graph) to steal the memory shape without the product.
6. **HubSpot MCP implementations** — WHY: generic typed CRM-object tools + OAuth patterns for the CRM-as-projection-of-object-graph (ENTITY -> RELATIONSHIP -> INTERACTION -> SIGNAL -> INTENT -> OPPORTUNITY -> ACTION -> OUTCOME).
7. **Recent human-in-loop social agents** — WHY: draft/review/approve/schedule/publish/receipt loop as the authority-UX reference (LOW/MEDIUM/HIGH/VERY HIGH consequence tiers need a proven interaction shape).

Standing rules for every entry: DO NOT IMPORT THEIR AUTHORITY MODELS — PING OWNS AUTHORITY. Rejection is a valid outcome; 30/8/3/5/22 is good.
