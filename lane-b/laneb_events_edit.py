p = "/home/nolan/ping/gateway/routes/events.js"
s = open(p).read()

old = """    if (req.body && req.body.type && req.body.payload && !req.body.event_type) {
      const adapter = require('../social_ingest_adapter');"""

new = """    if (req.body && req.body.type && req.body.payload && !req.body.event_type) {
      // Lane B (2026-09-21, additive): knowledge envelopes (payload.schema
      // 'ping.knowledge.*') normalize through the knowledge ingest adapter;
      // everything else keeps the proven social adapter. The social path is
      // untouched.
      const kSchema = req.body.payload && req.body.payload.schema;
      const adapter =
        typeof kSchema === 'string' && kSchema.startsWith('ping.knowledge.')
          ? require('../knowledge_ingest_adapter')
          : require('../social_ingest_adapter');
      const normalize =
        adapter.normalizeKnowledgeEnvelope || adapter.normalizeBffEnvelope;"""

assert old in s, "dispatch block not found"
s = s.replace(old, new)

old2 = """      let norm;
      try {
        norm = await adapter.normalizeBffEnvelope(req.body, pool);"""

new2 = """      let norm;
      try {
        norm = await normalize(req.body, pool);"""

assert old2 in s, "normalize call not found"
s = s.replace(old2, new2)
open(p, "w").write(s)
print("events.js updated OK")
