import sys

PATH = "/home/nolan/worktrees/ping-harvest-12h/ping-runtime/workers/canonical_workers.js"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

START = "    console.log(`[ClaimWorker] Processing ${event.event_type} for ${documentId || 'unknown'}`);\n"
END = "    return { status: 'ok', claim };\n"

assert src.count(START) == 1, "start marker count = %d" % src.count(START)
si = src.index(START)
seg = src[si:]
assert seg.count(END) == 1, "end marker count after start = %d" % seg.count(END)
ei = si + seg.index(END) + len(END)
# span must end before the closing brace of handle()
rest = src[ei:ei+10]
assert rest.startswith("  }\n"), "unexpected tail after end marker: %r" % rest
ei += len("  }\n")

new_block = (
"    console.log(`[ClaimWorker] Processing ${event.event_type} for ${documentId || 'unknown'}`);\n"
"\n"
"    // Observation lineage passthrough (fail-soft, H76): propagate\n"
"    // context_pack_id, context_evidence_refs, and context_knowledge_refs from\n"
"    // the incoming observation onto the claim and the CLAIM_CREATED payload.\n"
"    // Extract only when well-typed; absent/malformed leaves the output\n"
"    // identical to baseline.\n"
"    let context_pack_id, context_evidence_refs, context_knowledge_refs;\n"
"    try {\n"
"      const lineageSources = [payload.observation, payload];\n"
"      const pickLineage = (field, check) => {\n"
"        for (const src of lineageSources) {\n"
"          if (src && typeof src === 'object' && !Array.isArray(src) && check(src[field])) return src[field];\n"
"        }\n"
"        return undefined;\n"
"      };\n"
"      context_pack_id = pickLineage('context_pack_id', (v) => typeof v === 'string');\n"
"      context_evidence_refs = pickLineage('context_evidence_refs', Array.isArray);\n"
"      context_knowledge_refs = pickLineage('context_knowledge_refs', Array.isArray);\n"
"    } catch (err) {\n"
"      console.log('[ClaimWorker] lineage extraction failed: ' + (err && err.message));\n"
"    }\n"
"\n"
"    const claim = {\n"
"      documentId,\n"
"      eventType: event.event_type,\n"
"      timestamp: constitutionalTimeAuthority.nowAsISOString(),\n"
"      source: event.source,\n"
"    };\n"
"    if (context_pack_id !== undefined) claim.context_pack_id = context_pack_id;\n"
"    if (context_evidence_refs !== undefined) claim.context_evidence_refs = context_evidence_refs;\n"
"    if (context_knowledge_refs !== undefined) claim.context_knowledge_refs = context_knowledge_refs;\n"
"\n"
"    const claimPayload = {\n"
"      documentId,\n"
"      claim,\n"
"      upstreamEventId: event.event_id || event.mission_id,\n"
"    };\n"
"    if (context_pack_id !== undefined) claimPayload.context_pack_id = context_pack_id;\n"
"    if (context_evidence_refs !== undefined) claimPayload.context_evidence_refs = context_evidence_refs;\n"
"    if (context_knowledge_refs !== undefined) claimPayload.context_knowledge_refs = context_knowledge_refs;\n"
"\n"
"    await this._emit('CLAIM_CREATED', claimPayload, {\n"
"      causation_id: event.event_id,\n"
"    });\n"
"\n"
"    return { status: 'ok', claim };\n"
"  }\n"
)

out = src[:si] + new_block + src[ei:]
with open(PATH, "w", encoding="utf-8") as f:
    f.write(out)
print("patched ok, old span bytes:", ei - si)
