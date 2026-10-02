"""Verdict-authority fix, patch 1b: JSDoc ordering cleanup in unified_event_runtime.js."""
import sys

path = 'ping-runtime/events/unified_event_runtime.js'
with open(path) as f:
    text = f.read()

pairs = [
    (
        "   * @param {object} options \u2014 { causation_id, correlation_id, metadata, namespace, logical_id }\n   */\n  /**\n   * Verdict-class admission authority. Returns { ok:true } for non-verdict",
        "  /**\n   * Verdict-class admission authority. Returns { ok:true } for non-verdict",
    ),
    (
        "    return { ok: true };\n  }\n\n  async emit(eventType, source, payload, options = {}) {",
        "    return { ok: true };\n  }\n\n  /**\n   * Emit an event. Validates, persists, dispatches to handlers, and routes to integrations.\n   * @param {string} eventType \u2014 e.g., 'REVIEW_RECEIVED', 'CUSTOMER_CREATED'\n   * @param {string} source \u2014 which connector/worker emitted it\n   * @param {object} payload \u2014 the event data\n   * @param {object} options \u2014 { causation_id, correlation_id, metadata, namespace, logical_id }\n   */\n  async emit(eventType, source, payload, options = {}) {",
    ),
]
for old, new in pairs:
    count = text.count(old)
    assert count == 1, f"anchor found {count}x: {old[:60]!r}"
    text = text.replace(old, new)
with open(path, 'w') as f:
    f.write(text)
print("jsdoc cleanup applied")
