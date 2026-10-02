/**
 * gateway-bootstrap-substrate.test.ts
 *
 * Structural tests for the SWARM-07 bootstrap substrate record. These assert
 * record integrity (closed enums, frozen exports, complete route coverage,
 * consistent reuse/replace verdicts), not gateway behavior.
 */
import {
  BOOTSTRAP_SUBSTRATE_VERSION,
  BOOT_PHASES,
  ROUTE_WIRING,
  COMPONENT_VERDICTS,
  BOOT_INVARIANTS,
  MISSION_LOOP_VERDICT,
  ComponentVerdict,
  RouteTier,
} from '../bootstrap/gateway-bootstrap-substrate';

const VERDICTS: ComponentVerdict[] = ['KEEP', 'PROPAGATE', 'REFACTOR', 'REPLACE', 'DROP'];
const TIERS: RouteTier[] = ['ALWAYS_ON', 'PG_GATED', 'CONDITIONAL'];

describe('gateway-bootstrap-substrate record', () => {
  test('version is set', () => {
    expect(BOOTSTRAP_SUBSTRATE_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });

  test('exports are frozen', () => {
    expect(Object.isFrozen(BOOT_PHASES)).toBe(true);
    expect(Object.isFrozen(ROUTE_WIRING)).toBe(true);
    expect(Object.isFrozen(COMPONENT_VERDICTS)).toBe(true);
    expect(Object.isFrozen(BOOT_INVARIANTS)).toBe(true);
    expect(Object.isFrozen(MISSION_LOOP_VERDICT)).toBe(true);
  });

  test('boot phases are ordered and load-bearing', () => {
    const orders = BOOT_PHASES.map((p) => p.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(new Set(BOOT_PHASES.map((p) => p.id)).size).toBe(BOOT_PHASES.length);
    const pgGate = BOOT_PHASES.find((p) => p.id === 'phase-3-pg-dependent');
    expect(pgGate).toBeDefined();
    expect(pgGate!.onGateFailure).toMatch(/skipped/i);
  });

  test('route wiring: every route has a valid tier and unique path', () => {
    const paths = ROUTE_WIRING.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const r of ROUTE_WIRING) {
      expect(TIERS).toContain(r.tier);
      expect(r.note.length).toBeGreaterThan(0);
    }
  });

  test('route wiring covers the known gateway surface', () => {
    const paths = new Set(ROUTE_WIRING.map((r) => r.path));
    for (const p of [
      '/health',
      '/ops',
      '/mc',
      '/ai',
      '/connectors',
      '/events',
      '/ingest',
      '/canonical-events',
      '/missions',
      '/knowledge',
      '/orchestration',
    ]) {
      expect(paths.has(p)).toBe(true);
    }
  });

  test('degraded mode: PG_GATED routes all document the 503 stub', () => {
    const gated = ROUTE_WIRING.filter((r) => r.tier === 'PG_GATED');
    expect(gated.length).toBeGreaterThan(0);
    for (const r of gated) {
      expect(r.note).toMatch(/503/);
    }
  });

  test('component verdicts use the closed verdict set and carry evidence', () => {
    const ids = new Set<string>();
    for (const c of COMPONENT_VERDICTS) {
      expect(VERDICTS).toContain(c.verdict);
      expect(c.id.length).toBeGreaterThan(0);
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
      expect(c.source.length).toBeGreaterThan(0);
      expect(c.rationale.length).toBeGreaterThan(0);
    }
  });

  test('mission loop verdict references only classified components', () => {
    const ids = new Set(COMPONENT_VERDICTS.map((c) => c.id));
    for (const id of MISSION_LOOP_VERDICT.reuse) {
      expect(ids.has(id)).toBe(true);
      const verdict = COMPONENT_VERDICTS.find((c) => c.id === id)!.verdict;
      expect(['KEEP', 'PROPAGATE']).toContain(verdict);
    }
    for (const id of MISSION_LOOP_VERDICT.replace) {
      expect(ids.has(id)).toBe(true);
      expect(COMPONENT_VERDICTS.find((c) => c.id === id)!.verdict).toBe('REPLACE');
    }
  });

  test('boot invariants are unique and grounded', () => {
    const ids = BOOT_INVARIANTS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of BOOT_INVARIANTS) {
      expect(i.statement.length).toBeGreaterThan(0);
      expect(i.basis.length).toBeGreaterThan(0);
    }
    expect(ids).toContain('INV-NO-SYNTHETIC-LOOP');
    expect(ids).toContain('INV-NO-SECOND-ORCHESTRATOR');
  });
});
