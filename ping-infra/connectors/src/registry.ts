/**
 * Connector registry: registration and discovery.
 *
 * The registry is a discovery projection, not an authority -- the adapters
 * named in each descriptor's contract.implementedBy own their behavior
 * (pig-fb/pig-capabilities.json doctrine). Workers consult the registry to
 * find a connector for a capability and to read its health; they never treat
 * the registry as proof the capability works.
 *
 * One writer per connector id: register() conflicts on duplicate id with a
 * differing contract (fail closed); re-registering the identical contract is
 * idempotent.
 */

import {
  CapabilityContract,
  ConnectorDescriptor,
  HealthState,
} from "./types";

export interface ConnectorRegistry {
  register(descriptor: ConnectorDescriptor): void;
  /** Find connectors whose contract name matches. */
  discover(capabilityName: string): ConnectorDescriptor[];
  get(id: string): ConnectorDescriptor | null;
  ids(): string[];
  health(id: string): HealthState;
  setHealth(id: string, state: HealthState, reason: string): void;
  /**
   * Clear BLOCKED -> AVAILABLE. The ONLY unlock path; requires explicit
   * evidence of a verified recovery (the ig-capability-state.json doctrine:
   * the recovery test is the only writer that flips BLOCKED to AVAILABLE).
   */
  verifiedRecovery(id: string, evidence: Record<string, unknown>): void;
  healthHistory(id: string): { state: HealthState; at: string; reason: string }[];
}

export class RegistryConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryConflictError";
  }
}

function contractsEqual(a: CapabilityContract, b: CapabilityContract): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class InMemoryConnectorRegistry implements ConnectorRegistry {
  private connectors = new Map<string, ConnectorDescriptor>();
  private healthStates = new Map<string, HealthState>();
  private history = new Map<string, { state: HealthState; at: string; reason: string }[]>();

  register(descriptor: ConnectorDescriptor): void {
    const existing = this.connectors.get(descriptor.id);
    if (existing) {
      if (!contractsEqual(existing.contract, descriptor.contract)) {
        throw new RegistryConflictError(
          `connector id conflict: ${descriptor.id} already registered with a different contract`,
        );
      }
      return; // identical re-registration is idempotent
    }
    this.connectors.set(descriptor.id, descriptor);
    this.transition(descriptor.id, HealthState.AVAILABLE, "registered");
  }

  discover(capabilityName: string): ConnectorDescriptor[] {
    const out: ConnectorDescriptor[] = [];
    for (const d of this.connectors.values()) {
      if (d.contract.name === capabilityName) out.push(d);
    }
    return out;
  }

  get(id: string): ConnectorDescriptor | null {
    return this.connectors.get(id) ?? null;
  }

  ids(): string[] {
    return [...this.connectors.keys()];
  }

  health(id: string): HealthState {
    this.requireKnown(id);
    return this.healthStates.get(id)!;
  }

  setHealth(id: string, state: HealthState, reason: string): void {
    this.requireKnown(id);
    const current = this.healthStates.get(id)!;
    if (current === HealthState.BLOCKED && state === HealthState.AVAILABLE) {
      throw new Error(
        `health transition refused: ${id} is BLOCKED; use verifiedRecovery() with evidence`,
      );
    }
    this.transition(id, state, reason);
  }

  verifiedRecovery(id: string, evidence: Record<string, unknown>): void {
    this.requireKnown(id);
    if (Object.keys(evidence ?? {}).length === 0) {
      throw new Error(`verifiedRecovery refused: ${id} requires non-empty evidence`);
    }
    this.transition(id, HealthState.AVAILABLE, `verified recovery: ${JSON.stringify(evidence)}`);
  }

  healthHistory(id: string): { state: HealthState; at: string; reason: string }[] {
    this.requireKnown(id);
    return [...(this.history.get(id) ?? [])];
  }

  private requireKnown(id: string): void {
    if (!this.connectors.has(id)) throw new Error(`unknown connector: ${id}`);
  }

  private transition(id: string, state: HealthState, reason: string): void {
    this.healthStates.set(id, state);
    const h = this.history.get(id) ?? [];
    h.push({ state, at: new Date().toISOString(), reason });
    this.history.set(id, h);
  }
}
