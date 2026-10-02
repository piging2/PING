/**
 * Reference adapter: Pig capability-registry projection.
 *
 * WRAPS AN EXISTING MECHANISM: pig-fb/capability-registry.json, the
 * engagement capability registry (discovery projection with strategy
 * fallback ladders and health). This adapter performs a LOCAL, READ-ONLY
 * projection read -- no external sends, no new credentials, no new accounts.
 *
 * It demonstrates the framework's core claim: an existing hand-rolled
 * mechanism can be exposed through the framework's registry, capability
 * contract, lease, receipt, and health primitives without being rewritten.
 *
 * Per the projection doctrine (pig-fb/capability-registry.json authority
 * note), the JSON file remains the authority for its own contents; this
 * adapter only translates it into the framework's contract shape.
 */

import * as fs from "fs";
import {
  AdapterContext,
  AdapterResult,
  CapabilityContract,
  ConnectorAdapter,
  ConnectorDescriptor,
  FailureClass,
} from "../types";

export const PIG_CAPABILITY_REGISTRY_PATH =
  process.env.PIG_CAPABILITY_REGISTRY_PATH ??
  "/home/hatch/workspace/pig-fb/capability-registry.json";

export const pigCapabilityRegistryContract: CapabilityContract = {
  name: "pig.capability-discovery",
  description:
    "Read the Pig engagement capability registry projection: capabilities, " +
    "strategy fallback ladders, and per-strategy health. Read-only local file read.",
  inputs: {},
  outputs: {
    capabilities: "record of capability name -> { description, preferredStrategy, strategies[] }",
  },
  failureModes: [FailureClass.DEPENDENCY_FAILURE, FailureClass.TEMPORARY_FAILURE],
  timeoutMs: 5_000,
  idempotent: true,
  readOnly: true,
  requiredCredentials: [],
  rateLimit: { maxClaims: 100, windowMs: 60_000 },
  implementedBy: "ping-infra/connectors/src/adapters/registry-projection.ts over pig-fb/capability-registry.json",
  contractVersion: 1,
};

interface RegistryFile {
  capabilities?: Record<string, unknown>;
  updated?: string;
  version?: number;
}

export class PigCapabilityRegistryAdapter implements ConnectorAdapter {
  readonly connectorId = "pig-capability-registry";
  readonly contract = pigCapabilityRegistryContract;

  constructor(private readonly registryPath: string = PIG_CAPABILITY_REGISTRY_PATH) {}

  async execute(ctx: AdapterContext): Promise<AdapterResult> {
    void ctx;
    let raw: string;
    try {
      raw = fs.readFileSync(this.registryPath, "utf-8");
    } catch (e) {
      // Fail closed: an unreadable capability record is a fault, not a green light
      // (ig-capability-gate.sh doctrine).
      return {
        ok: false,
        failureClass: FailureClass.DEPENDENCY_FAILURE,
        output: null,
        evidence: { reason: "capability registry unreadable", error: (e as Error).message },
      };
    }
    let parsed: RegistryFile;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        failureClass: FailureClass.DEPENDENCY_FAILURE,
        output: null,
        evidence: { reason: "capability registry is not valid JSON" },
      };
    }
    const names = Object.keys(parsed.capabilities ?? {});
    return {
      ok: true,
      output: {
        capabilities: parsed.capabilities ?? {},
        capabilityNames: names,
        registryUpdated: parsed.updated ?? null,
        registryVersion: parsed.version ?? null,
      },
      evidence: { source: this.registryPath, capabilityCount: names.length },
    };
  }
}

export function pigCapabilityRegistryDescriptor(
  registryPath?: string,
): ConnectorDescriptor {
  return {
    id: "pig-capability-registry",
    contract: pigCapabilityRegistryContract,
    createAdapter: () => new PigCapabilityRegistryAdapter(registryPath),
  };
}
