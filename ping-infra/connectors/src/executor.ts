/**
 * Framework executor: the single sanctioned path from "I want a connector
 * to do something" to a durable receipt.
 *
 * Execution order (each step fail-closed):
 *   1. registry lookup (unknown connector => error, no receipt needed)
 *   2. health gate (BLOCKED/DEGRADED-with-readOnly-false => NOT_ATTEMPTED)
 *   3. receipt INTENT_RECORDED
 *   4. lease claim (contention => NOT_ATTEMPTED observation; never queues)
 *   5. receipt CLAIMED
 *   6. adapter execute() under timeoutMs with the vault + lease token
 *   7. credential leak scan over output/evidence (hit => fail closed)
 *   8. receipt OBSERVED with terminal outcome + failure class
 *   9. health update on RATE_LIMIT/AUTH_FAILURE/DEPENDENCY_FAILURE
 *   10. lease release (always)
 *
 * Retry policy: the executor NEVER retries. A rate-limit signal records
 * FAILED/RATE_LIMIT, degrades health, releases the lease, and returns. Retry
 * scheduling is the caller's explicit decision with its own budget
 * (recovery-budgets.json doctrine); the framework will not start a storm.
 */

import {
  AdapterContext,
  AdapterResult,
  AdapterSignal,
  FailureClass,
  HealthState,
  Receipt,
  TerminalOutcome,
} from "./types";
import { ConnectorRegistry } from "./registry";
import { LeaseManager } from "./lease";
import { ReceiptLog } from "./receipt";
import { CredentialLeakError, InMemoryCredentialVault } from "./credential";

export interface ExecuteOptions {
  holder: string;
  leaseTtlMs?: number;
  leaseScope?: string;
  /** AbortSignal for caller-side cancellation. */
  signal?: AbortSignal;
}

export interface ExecuteOutcome {
  receiptId: string;
  terminal: TerminalOutcome;
  failureClass: FailureClass | null;
  result: AdapterResult | null;
}

export class ConnectorExecutor {
  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly leases: LeaseManager,
    private readonly receipts: ReceiptLog,
    private readonly vault: InMemoryCredentialVault,
  ) {}

  async execute(
    connectorId: string,
    input: Record<string, unknown>,
    opts: ExecuteOptions,
  ): Promise<ExecuteOutcome> {
    const descriptor = this.registry.get(connectorId);
    if (!descriptor) {
      throw new Error(`unknown connector: ${connectorId}`);
    }
    const contract = descriptor.contract;
    const health = this.registry.health(connectorId);
    const receiptId = this.receipts.mintId("op");

    // Health gate: BLOCKED always stops; DEGRADED stops mutating work.
    if (health === HealthState.BLOCKED || (health === HealthState.DEGRADED && !contract.readOnly)) {
      const r = this.receipts.recordIntent(receiptId, connectorId, contract.name, {
        input,
        gate: "health",
        health,
      });
      void r;
      this.receipts.recordObservation(receiptId, connectorId, contract.name, {
        ok: false,
        failureClass: FailureClass.DEPENDENCY_FAILURE,
        detail: { reason: `health gate: ${health}` },
      });
      return { receiptId, terminal: TerminalOutcome.NOT_ATTEMPTED, failureClass: FailureClass.DEPENDENCY_FAILURE, result: null };
    }

    this.receipts.recordIntent(receiptId, connectorId, contract.name, { input, holder: opts.holder });

    // Lease claim: contention fails closed, never queues.
    const lease = this.leases.claim(
      contract.name,
      opts.holder,
      opts.leaseTtlMs ?? 30_000,
      opts.leaseScope ?? "default",
    );
    if (!lease) {
      this.receipts.recordObservation(receiptId, connectorId, contract.name, {
        ok: false,
        failureClass: FailureClass.TEMPORARY_FAILURE,
        detail: { reason: "lease contention: capability already claimed" },
      });
      return { receiptId, terminal: TerminalOutcome.NOT_ATTEMPTED, failureClass: FailureClass.TEMPORARY_FAILURE, result: null };
    }

    this.receipts.recordClaim(receiptId, connectorId, contract.name, lease.token, { holder: opts.holder });

    const adapter = descriptor.createAdapter();
    const ctx: AdapterContext = {
      credentials: this.vault,
      leaseToken: lease.token,
      scratch: { input },
    };

    let result: AdapterResult | null = null;
    let thrown: unknown = null;
    try {
      result = await this.withTimeout(
        adapter.execute(ctx),
        contract.timeoutMs,
        opts.signal,
      );
      // Credential boundary: scan before anything is recorded.
      this.vault.assertNoLeak(result.output, `adapter output (${connectorId})`);
      this.vault.assertNoLeak(result.evidence ?? {}, `adapter evidence (${connectorId})`);
    } catch (e) {
      thrown = e;
    } finally {
      this.leases.release(lease.token);
    }

    if (thrown !== null) {
      return this.recordThrown(receiptId, connectorId, contract.name, lease.token, thrown);
    }
    return this.recordResult(receiptId, connectorId, contract.name, lease.token, result!);
  }

  private async withTimeout(
    p: Promise<AdapterResult>,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<AdapterResult> {
    if (signal?.aborted) throw new AdapterSignal(FailureClass.TEMPORARY_FAILURE, "aborted before start");
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        const t = setTimeout(
          () => reject(new AdapterSignal(FailureClass.TEMPORARY_FAILURE, `timeout after ${timeoutMs}ms`)),
          timeoutMs,
        );
        signal?.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new AdapterSignal(FailureClass.TEMPORARY_FAILURE, "aborted"));
        }, { once: true });
      }),
    ]);
  }

  private recordResult(
    receiptId: string,
    connectorId: string,
    capability: string,
    leaseToken: string,
    result: AdapterResult,
  ): ExecuteOutcome {
    const failureClass = result.ok ? null : (result.failureClass ?? FailureClass.TERMINAL_FAILURE);
    this.applyHealth(connectorId, failureClass);
    this.receipts.recordObservation(receiptId, connectorId, capability, {
      ok: result.ok,
      failureClass: failureClass ?? undefined,
      leaseToken,
      detail: { output: result.output, evidence: result.evidence ?? {} },
    });
    const terminal = result.ok ? TerminalOutcome.EXECUTED : TerminalOutcome.FAILED;
    return { receiptId, terminal, failureClass, result };
  }

  private recordThrown(
    receiptId: string,
    connectorId: string,
    capability: string,
    leaseToken: string,
    thrown: unknown,
  ): ExecuteOutcome {
    // Credential leak: fail closed, never record the offending bytes.
    if (thrown instanceof CredentialLeakError) {
      this.registry.setHealth(connectorId, HealthState.BLOCKED, `credential leak attempt: ${thrown.message}`);
      this.receipts.recordObservation(receiptId, connectorId, capability, {
        ok: false,
        failureClass: FailureClass.TERMINAL_FAILURE,
        leaseToken,
        detail: { reason: "BLOCKED_LEAK: adapter output contained a secret value; bytes withheld" },
      });
      return { receiptId, terminal: TerminalOutcome.FAILED, failureClass: FailureClass.TERMINAL_FAILURE, result: null };
    }
    const failureClass =
      thrown instanceof AdapterSignal ? thrown.failureClass : FailureClass.TERMINAL_FAILURE;
    const detail: Record<string, unknown> =
      thrown instanceof AdapterSignal
        ? { signal: thrown.message, evidence: thrown.evidence ?? {} }
        : { error: thrown instanceof Error ? thrown.message : String(thrown) };
    // Leak-scan even the error detail; never persist a secret in a receipt.
    try {
      this.vault.assertNoLeak(detail, `thrown detail (${connectorId})`);
    } catch {
      detail.error = "[withheld: contained a secret value]";
      delete detail.evidence;
    }
    this.applyHealth(connectorId, failureClass);
    this.receipts.recordObservation(receiptId, connectorId, capability, {
      ok: false,
      failureClass,
      leaseToken,
      detail,
    });
    return { receiptId, terminal: TerminalOutcome.FAILED, failureClass, result: null };
  }

  /** Health consequences of a failure class. Never retries; just signals. */
  private applyHealth(connectorId: string, failureClass: FailureClass | null): void {
    if (failureClass === FailureClass.RATE_LIMIT) {
      const h = this.registry.health(connectorId);
      if (h === HealthState.AVAILABLE) {
        this.registry.setHealth(connectorId, HealthState.DEGRADED, "rate-limit signal: no retry, degraded until recovery");
      }
    } else if (
      failureClass === FailureClass.AUTH_FAILURE ||
      failureClass === FailureClass.DEPENDENCY_FAILURE
    ) {
      this.registry.setHealth(connectorId, HealthState.BLOCKED, `failure class ${failureClass}`);
    }
  }
}
