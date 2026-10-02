/**
 * auth_boundary.test.ts — P-20260923-007.
 *
 * Proves the auth boundary's core properties:
 *  1. discovery hides ungranted tools; missing context -> empty catalog;
 *  2. call-time recheck catches mid-run revocation (TOCTOU);
 *  3. unknown-tool vs unauthorized-tool denials are byte-identical;
 *  4. a throwing grant resolver fails closed without propagating.
 */

import {
  DENIED_REASON,
  authorizeAtCall,
  filterAtDiscovery,
  isContextUsable,
  AuthContext,
  Grant,
  GrantResolver,
  ToolDescriptor,
} from '../auth_boundary';

const CTX: AuthContext = { agentId: 'muse', roles: ['worker'], credentialPresent: true };
const NO_CTX: AuthContext = { agentId: '', roles: [], credentialPresent: false };

const TOOLS: readonly ToolDescriptor[] = [
  { id: 'fs.read' },
  { id: 'fs.write' },
  { id: 'git.push' },
];

function resolverFor(grants: Record<string, boolean>, calls?: string[]): GrantResolver {
  return (toolId: string): Grant => {
    calls?.push(toolId);
    return grants[toolId] ? { granted: true } : { granted: false };
  };
}

test('discovery: only granted tools are visible; missing context yields an empty catalog', async () => {
  const resolve = resolverFor({ 'fs.read': true, 'fs.write': true });
  const visible = await filterAtDiscovery(TOOLS, CTX, resolve);
  expect(visible.map((t) => t.id)).toEqual(['fs.read', 'fs.write']);

  const empty = await filterAtDiscovery(TOOLS, NO_CTX, resolve);
  expect(empty).toEqual([]);
  expect(isContextUsable(NO_CTX)).toBe(false);
  expect(isContextUsable(CTX)).toBe(true);
});

test('call-recheck: a grant revoked after discovery is denied at call time (TOCTOU closed)', async () => {
  const grants: Record<string, boolean> = { 'fs.write': true };
  const calls: string[] = [];
  const resolve = resolverFor(grants, calls);

  // Discovery saw the grant.
  const visible = await filterAtDiscovery([{ id: 'fs.write' }], CTX, resolve);
  expect(visible).toHaveLength(1);
  const before = await authorizeAtCall('fs.write', CTX, resolve);
  expect(before.allowed).toBe(true);

  // Revocation lands mid-run.
  grants['fs.write'] = false;
  const after = await authorizeAtCall('fs.write', CTX, resolve);
  expect(after.allowed).toBe(false);

  // The resolver was consulted on EVERY call: no cached grant survived.
  expect(calls.filter((c) => c === 'fs.write').length).toBeGreaterThanOrEqual(3);
});

test('ambiguity: unknown tool, revoked grant, and missing context deny with the identical reason', async () => {
  const resolve = resolverFor({});
  const unknown = await authorizeAtCall('no.such.tool', CTX, resolve);
  const revoked = await authorizeAtCall('git.push', CTX, resolve);
  const noCtx = await authorizeAtCall('fs.read', NO_CTX, resolve);

  for (const d of [unknown, revoked, noCtx]) {
    expect(d.allowed).toBe(false);
    if (!d.allowed) {
      expect(d.reason).toBe(DENIED_REASON);
    }
  }
  // Byte-identical: no existence signal leaks through the reason string.
  const reasons = [unknown, revoked, noCtx].map((d) => (!d.allowed ? d.reason : null));
  expect(new Set(reasons).size).toBe(1);
});

test('fail-closed: a throwing resolver denies without propagating', async () => {
  const throwing: GrantResolver = () => {
    throw new Error('authority unreachable');
  };
  const d = await authorizeAtCall('fs.read', CTX, throwing);
  expect(d.allowed).toBe(false);
  if (!d.allowed) {
    expect(d.reason).toBe(DENIED_REASON);
  }
  const visible = await filterAtDiscovery(TOOLS, CTX, throwing);
  expect(visible).toEqual([]);
});
