/**
 * H69 drive: four-case verification of the ContextCompiler knowledge read.
 *
 * Usage: node /tmp/h69-drive.js baseline   -> writes /tmp/h69-baseline.json
 *        node /tmp/h69-drive.js verify     -> runs all four cases, prints JSON
 *
 * (i)   stub returns approved nodes        -> knowledge_refs injected
 * (ii)  stub returns only candidates       -> high-confidence fallback
 * (iii) stub queryNodes throws             -> byte-identical to baseline
 * (iv)  knowledgeGraph null                -> byte-identical to baseline
 */
const fs = require('fs');
const { ContextCompiler } = require('/home/nolan/worktrees/ping-harvest-12h/ping-runtime/context/context_compiler.js');

const NAMESPACE = 'core::owner';

function makeEvents() {
  return [
    {
      event_id: 'evt_001',
      event_type: 'LEAD_CREATED',
      source: 'webhook',
      namespace: NAMESPACE,
      timestamp: '2026-09-17T12:00:00Z',
      payload: { lead_id: 'lead_001', customer_id: 'cust_001' },
      metadata: { authority: 'customer-authority', namespace: NAMESPACE, correlation_id: 'corr_001', causation_id: null },
    },
    {
      event_id: 'evt_002',
      event_type: 'CUSTOMER_CREATED',
      source: 'customer-authority',
      namespace: NAMESPACE,
      timestamp: '2026-09-17T12:01:00Z',
      payload: { customer_id: 'cust_001' },
      metadata: { namespace: NAMESPACE, correlation_id: 'corr_001', causation_id: 'evt_001' },
    },
  ];
}

const eventRuntime = {
  getCorrelationGroup: async (correlationId) => ({
    status: 'ok',
    correlation_id: correlationId,
    events: makeEvents(),
  }),
};
const evidenceAuthority = {
  accumulate: async (ids) => makeEvents().filter((e) => ids.includes(e.event_id)),
};

function makeCompiler(knowledgeGraph) {
  return new ContextCompiler({ eventRuntime, evidenceAuthority, knowledgeGraph });
}

const approvedRows = [
  { node_id: 'n-approved-1', node_type: 'project', label: 'Roof replacement', status: 'approved', confidence: 1.0, source_event_id: 'evt_001', entity_type: 'project', entity_id: 'p-1', namespace: NAMESPACE },
  { node_id: 'n-approved-2', node_type: 'review', label: 'Five star review', status: 'approved', confidence: 1.0, source_event_id: null, entity_type: null, entity_id: null, namespace: NAMESPACE },
];
const candidateRows = [
  { node_id: 'n-cand-hi', node_type: 'project', label: 'High conf candidate', status: 'candidate', confidence: 0.9, source_event_id: 'evt_002', entity_type: 'project', entity_id: 'p-2', namespace: NAMESPACE },
  { node_id: 'n-cand-lo', node_type: 'project', label: 'Low conf candidate', status: 'candidate', confidence: 0.3, source_event_id: 'evt_002', entity_type: 'project', entity_id: 'p-3', namespace: NAMESPACE },
  { node_id: 'n-cand-null', node_type: 'project', label: 'Null conf candidate', status: 'candidate', confidence: null, source_event_id: 'evt_002', entity_type: 'project', entity_id: 'p-4', namespace: NAMESPACE },
];

function stubGraph({ approved = [], candidates = [], throws = false } = {}) {
  const calls = [];
  return {
    calls,
    async queryNodes(options) {
      calls.push(options);
      if (throws) throw new Error('boom: graph unavailable');
      if (options.status === 'approved') return approved;
      if (options.status === 'candidate') return candidates;
      return [];
    },
  };
}

function normalize(pack) {
  const copy = JSON.parse(JSON.stringify(pack));
  copy.compiled_at = 'FIXED';
  return JSON.stringify(copy);
}

async function compileCase(knowledgeGraph) {
  const compiler = makeCompiler(knowledgeGraph);
  return compiler.compile({
    missionId: 'm-1',
    query: 'test query',
    correlationId: 'corr_001',
    namespace: NAMESPACE,
  });
}

async function main() {
  const mode = process.argv[2];

  const packNull = await compileCase(null);
  const normNull = normalize(packNull);

  if (mode === 'baseline') {
    fs.writeFileSync('/tmp/h69-baseline.json', normNull);
    console.log('baseline written, length=' + normNull.length);
    return;
  }

  const baseline = fs.readFileSync('/tmp/h69-baseline.json', 'utf8');
  const baselinePackId = JSON.parse(baseline).context_pack_id;
  const results = {};

  // (i) approved nodes present
  const g1 = stubGraph({ approved: approvedRows, candidates: candidateRows });
  const packApproved = await compileCase(g1);
  results.case_i_approved = {
    has_knowledge_refs: Array.isArray(packApproved.knowledge_refs),
    ref_count: (packApproved.knowledge_refs || []).length,
    ref_ids: (packApproved.knowledge_refs || []).map((r) => r.node_id),
    ref_shape_keys: packApproved.knowledge_refs ? Object.keys(packApproved.knowledge_refs[0]).sort() : [],
    pack_id_unchanged_vs_baseline: packApproved.context_pack_id === baselinePackId,
    query_calls: g1.calls,
  };

  // (ii) candidates only -> high-confidence fallback
  const g2 = stubGraph({ approved: [], candidates: candidateRows });
  const packCand = await compileCase(g2);
  results.case_ii_candidates_only = {
    ref_ids: (packCand.knowledge_refs || []).map((r) => r.node_id),
    high_conf_included: (packCand.knowledge_refs || []).some((r) => r.node_id === 'n-cand-hi'),
    low_conf_excluded: !(packCand.knowledge_refs || []).some((r) => r.node_id === 'n-cand-lo'),
    null_conf_excluded: !(packCand.knowledge_refs || []).some((r) => r.node_id === 'n-cand-null'),
    pack_id_unchanged_vs_baseline: packCand.context_pack_id === baselinePackId,
    query_calls: g2.calls,
  };

  // (iii) graph throws -> byte-identical to baseline
  const g3 = stubGraph({ throws: true });
  const normThrow = normalize(await compileCase(g3));
  results.case_iii_throws_byte_identical_to_baseline = normThrow === baseline;

  // (iv) null graph -> byte-identical to baseline
  results.case_iv_null_byte_identical_to_baseline = normNull === baseline;

  // fail-soft: throwing graph must not raise out of compile()
  results.case_iii_compile_did_not_throw = true;

  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error('DRIVE FAILED:', e);
  process.exit(1);
});
