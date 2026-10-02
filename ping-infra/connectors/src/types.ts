/**
 * ping-connectors framework: core types.
 *
 * The framework sits UNDER the wave's MCP/tool plane (swarm 03), tool safety
 * (swarm 04), and memory (swarms 05/06): it provides the substrate primitives
 * every connector currently re-implements by hand -- registration/discovery,
 * capability contracts, rate-limit leases, credential boundaries, receipts,
 * provenance, health signals, and failure classification. It declares no tools,
 * no side-effect policy, and no memory semantics of its own.
 *
 * Conventions inherited from the surveyed mechanisms:
 * - pig-fb/pig-capabilities.json: contract_status is discovery-projection;
 *   implementations are the authority. This framework's registry is likewise
 *   a discovery projection; adapters own their behavior.
 * - outreach/action-intent-ledger.py: UNKNOWN is never silently converted to
 *   FAILED and never auto-retried; reconciliation is an explicit, evidenced
 *   act.
 * - tandem provenance sidecars: every artifact carries its provenance.
 * - recovery-budgets.json: the universal failure classifier is typed here as
 *   FailureClass (it previously existed only as JSON prose).
 */

/** Typed universal failure classifier (from pig-fb/recovery-budgets.json). */
export enum FailureClass {
  SUCCESS = "SUCCESS",
  SUCCESS_EMPTY = "SUCCESS_EMPTY",
  ELIGIBILITY_EMPTY = "ELIGIBILITY_EMPTY",
  ENUMERATION_FAILURE = "ENUMERATION_FAILURE",
  DEPENDENCY_FAILURE = "DEPENDENCY_FAILURE",
  AUTH_FAILURE = "AUTH_FAILURE",
  SURFACE_DRIFT = "SURFACE_DRIFT",
  RATE_LIMIT = "RATE_LIMIT",
  TEMPORARY_FAILURE = "TEMPORARY_FAILURE",
  TERMINAL_FAILURE = "TERMINAL_FAILURE",
  /** Claim exists but no observation; external commitment state unknown. */
  UNKNOWN = "UNKNOWN",
}

/** Health of a connector capability. */
export enum HealthState {
  AVAILABLE = "AVAILABLE",
  DEGRADED = "DEGRADED",
  /** Only a verified recovery (explicit evidence) may clear BLOCKED. */
  BLOCKED = "BLOCKED",
}

/**
 * Capability contract declaration. Every adapter declares one; the registry
 * indexes it; the executor enforces it. Schema deliberately mirrors the
 * de-facto pig-fb/pig-capabilities.json shape (description, inputs, outputs,
 * failure modes, timeout, idempotency) so existing projections can be
 * mechanically promoted into contracts.
 */
export interface CapabilityContract {
  /** Stable dotted name, e.g. "pig.capability-discovery". */
  name: string;
  description: string;
  /** JSON-schema-ish descriptor of the adapter's input (informational). */
  inputs: Record<string, unknown>;
  /** JSON-schema-ish descriptor of the adapter's output (informational). */
  outputs: Record<string, unknown>;
  /** Failure classes this adapter may legitimately report. */
  failureModes: FailureClass[];
  /** Wall-clock bound in ms for one execution; exceeded => TEMPORARY_FAILURE. */
  timeoutMs: number;
  /** True when repeated identical executions are side-effect safe. */
  idempotent: boolean;
  /** True when the adapter performs no external mutation (read-only). */
  readOnly: boolean;
  /** Names of secrets the adapter needs; resolved via CredentialRef only. */
  requiredCredentials: string[];
  /** Rate-limit class: max claims per window; the lease manager enforces. */
  rateLimit: { maxClaims: number; windowMs: number };
  /** Human/machine pointer to the implementing code (the authority). */
  implementedBy: string;
  contractVersion: number;
}

/** A connector registered with the framework. */
export interface ConnectorDescriptor {
  /** Unique connector id, e.g. "pig-capability-registry". */
  id: string;
  contract: CapabilityContract;
  /** Adapter factory; called by the executor, never by consumers. */
  createAdapter: () => ConnectorAdapter;
}

/** The adapter surface the framework executes. */
export interface ConnectorAdapter {
  readonly connectorId: string;
  readonly contract: CapabilityContract;
  /**
   * Execute one operation. Receives ONLY framework-controlled context:
   * an opaque credential resolver (not raw secrets), a lease token, and a
   * receipt writer. May throw AdapterSignal for typed failures.
   */
  execute(ctx: AdapterContext): Promise<AdapterResult>;
}

/** What the framework hands an adapter at execution time. */
export interface AdapterContext {
  /** Opaque credential handles; resolving is audited and single-purpose. */
  credentials: CredentialVault;
  /** The active lease token for this claim. */
  leaseToken: string;
  /** Bounded scratch the adapter may use; contents enter the receipt. */
  scratch: Record<string, unknown>;
}

/** Typed failure signal an adapter may throw instead of returning. */
export class AdapterSignal extends Error {
  constructor(
    public readonly failureClass: FailureClass,
    message: string,
    public readonly evidence?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AdapterSignal";
  }
}

export interface AdapterResult {
  ok: boolean;
  failureClass?: FailureClass;
  /** Adapter output; scanned for credential leakage before it is recorded. */
  output: unknown;
  evidence?: Record<string, unknown>;
}

/** Opaque credential handle. Never carries the secret value. */
export interface CredentialRef {
  readonly kind: "credential-ref";
  readonly name: string;
  readonly refId: string;
}

/**
 * The ONLY path from a CredentialRef to a secret value. The executor owns
 * the vault; adapters receive the vault interface but the vault refuses to
 * resolve for unregistered callers. Test doubles assert the boundary.
 */
export interface CredentialVault {
  ref(name: string): CredentialRef;
  /**
   * Resolve a ref to its secret. Implementations MUST throw unless called
   * from the framework executor's privileged path.
   */
  resolve(ref: CredentialRef, purpose: string): string;
  /** All secret values currently held (for leak-scan registration). */
  registeredSecrets(): string[];
}

/** Receipt lifecycle stages. Mirrors action-intent-ledger semantics. */
export enum ReceiptStage {
  INTENT_RECORDED = "INTENT_RECORDED",
  CLAIMED = "CLAIMED",
  OBSERVED = "OBSERVED",
}

/** Terminal outcome derived from the receipt stream. Never UNKNOWN->SUCCESS. */
export enum TerminalOutcome {
  EXECUTED = "EXECUTED",
  FAILED = "FAILED",
  NOT_ATTEMPTED = "NOT_ATTEMPTED",
  /** Claim without observation and the claimant is gone. Never auto-retried. */
  UNKNOWN = "UNKNOWN",
}

export interface Receipt {
  receiptId: string;
  connectorId: string;
  capability: string;
  stage: ReceiptStage;
  terminalOutcome: TerminalOutcome | null;
  failureClass: FailureClass | null;
  /** Monotonic sequence within the log; ordering authority for derivation. */
  seq: number;
  at: string;
  leaseToken: string | null;
  /** Evidence; credential-scanned before append. */
  detail: Record<string, unknown>;
}

/** A rate-limit lease claim. */
export interface Lease {
  token: string;
  capability: string;
  holder: string;
  claimedAt: number;
  expiresAt: number;
}
