/**
 * ping-connectors: connector framework for PING.
 *
 * Substrate primitives for business connections/connectors/adapters:
 * registration/discovery, capability contracts, rate-limit leases,
 * credential boundaries, append-only receipts, provenance, health signals,
 * and typed failure classification.
 *
 * Sits UNDER the wave's MCP/tool plane, tool safety, and memory: it owns no
 * tools, no side-effect policy, and no memory semantics.
 */

export * from "./types";
export * from "./registry";
export * from "./lease";
export * from "./receipt";
export * from "./credential";
export * from "./executor";
export { pigCapabilityRegistryDescriptor, pigCapabilityRegistryContract } from "./adapters/registry-projection";
