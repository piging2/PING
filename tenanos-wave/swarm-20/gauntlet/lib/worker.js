'use strict';
/**
 * SWARM-20 GAUNTLET — synthetic worker stub (test double, not a real worker).
 *
 * Spawned by mission.js as a child process. Receives the work order on stdin
 * as JSON. Fault mode comes from GAUNTLET_FAULT:
 *   honest              — call the synthetic MCP tool, return a valid 8-field envelope
 *   slow                — sleep past the dispatch timeout (timeout path)
 *   crash               — exit non-zero immediately (worker death path)
 *   malformed           — return an envelope missing required fields (attack 04)
 *   wrong-agent         — return an envelope with a mismatched agent_id
 *   effect-then-timeout — write a side-effect marker, THEN hang past the timeout
 *                         (attack 10: possible unrecorded effect)
 *
 * The worker NEVER touches the repo, the network, or live infra. Its only
 * tool is the in-harness synthetic MCP registry, injected by the parent via
 * a JSON tool-call bridge on a second stdin channel... In this harness the
 * worker simulates the tool call locally with the same validation semantics
 * (the parent replays the identical call against the real in-harness
 * registry for the evidence record when mode != malformed).
 *
 * Envelope contract (external_agent_adapter.verifyResultEnvelope):
 *   work_order_id, context_pack_id, agent_id, capability, status, output, evidence, error
 */

const fs = require('fs');

const FAULT = process.env.GAUNTLET_FAULT || 'honest';
const MCP_MODE = process.env.GAUNTLET_MCP_MODE || 'normal';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function mcpEchoTransform(text, op) {
  // Mirrors SyntheticMcpRegistry.callTool('echo.transform', ...) validation.
  if (MCP_MODE === 'removed') {
    const e = new Error('MCP server unavailable (removed)');
    e.code = 'MCP_SERVER_REMOVED';
    throw e;
  }
  if (typeof text !== 'string' || !['upper', 'reverse'].includes(op)) {
    throw new Error('echo.transform: invalid args (need {text:string, op:upper|reverse})');
  }
  if (MCP_MODE === 'malformed-result') return { wrong_shape: true };
  const result = op === 'upper' ? text.toUpperCase() : [...text].reverse().join('');
  return { content: [{ type: 'text', text: result }], isError: false };
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const workOrder = JSON.parse(raw);

  const envelope = (overrides) => Object.assign({
    work_order_id: workOrder.work_order_id,
    context_pack_id: workOrder.context_pack_id,
    agent_id: workOrder.agent_id,
    capability: workOrder.capability,
    status: 'completed',
    output: null,
    evidence: {},
    error: null,
  }, overrides || {});

  if (FAULT === 'crash') {
    console.error('worker: simulated crash');
    process.exit(7);
  }

  if (FAULT === 'slow') {
    await sleep(60000); // longer than any dispatch timeout the harness sets
    return;
  }

  if (FAULT === 'effect-then-timeout') {
    // Simulate an external effect, then hang. The harness's dispatch monitor
    // will time out and must NOT claim success: the effect is unrecorded.
    const markerDir = process.env.GAUNTLET_EFFECT_DIR;
    if (markerDir) {
      fs.writeFileSync(
        `${markerDir}/side-effect-${workOrder.work_order_id}.marker`,
        JSON.stringify({ work_order_id: workOrder.work_order_id, effect: 'simulated-external-effect', at: new Date().toISOString() })
      );
    }
    await sleep(60000);
    return;
  }

  if (FAULT === 'malformed') {
    // Missing output/evidence/error and a wrong-typed status.
    process.stdout.write(JSON.stringify({ work_order_id: workOrder.work_order_id, status: 'done-ish' }));
    return;
  }

  if (FAULT === 'wrong-agent') {
    process.stdout.write(JSON.stringify(envelope({ agent_id: 'someone-else', output: { note: 'impostor' }, evidence: { tool: 'echo.transform' } })));
    return;
  }

  // honest path: do the bounded work through the (synthetic) MCP tool.
  const input = workOrder.input || {};
  try {
    const toolResult = mcpEchoTransform(input.text || '', input.op || 'upper');
    if (!toolResult.content) {
      // Malformed tool result is a worker failure, reported honestly.
      process.stdout.write(JSON.stringify(envelope({
        status: 'failed', output: null, error: 'MCP tool returned malformed result',
        evidence: { tool: 'echo.transform', mcp_mode: MCP_MODE },
      })));
      return;
    }
    const text = toolResult.content[0].text;
    process.stdout.write(JSON.stringify(envelope({
      output: { transformed: text, op: input.op || 'upper' },
      evidence: { tool: 'echo.transform', mcp_mode: MCP_MODE, input_chars: (input.text || '').length },
    })));
  } catch (err) {
    // Honest failure envelope: never fabricate success.
    process.stdout.write(JSON.stringify(envelope({
      status: 'failed', output: null, error: String(err && err.message || err),
      evidence: { tool: 'echo.transform', mcp_mode: MCP_MODE, code: err.code || 'unknown' },
    })));
  }
}

main().catch((e) => { console.error('worker fatal: ' + (e && e.stack || e)); process.exit(2); });
