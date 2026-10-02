/**
 * Append-only receipt log.
 *
 * One JSON object per line; records are never mutated. Readers derive each
 * operation's terminal outcome from the record stream by receiptId, in seq
 * order -- the same derivation discipline as
 * outreach/action-intent-ledger.py and pig-fb runs.jsonl.
 *
 * Lifecycle per operation (one receiptId):
 *   INTENT_RECORDED -> CLAIMED -> OBSERVED
 *
 * Terminal outcome derivation:
 *   OBSERVED with ok=true            => EXECUTED
 *   OBSERVED with ok=false           => FAILED
 *   CLAIMED with no OBSERVED,
 *     claimant provably never ran    => NOT_ATTEMPTED
 *   CLAIMED with no OBSERVED,
 *     claimant ran or may have run   => UNKNOWN
 *
 * UNKNOWN is the honest state: the external commitment may or may not have
 * happened. The log NEVER auto-transitions UNKNOWN to anything else and
 * NEVER retries it. Clearing UNKNOWN requires reconcile(), an explicit,
 * evidenced human/agent act that records its own receipt.
 *
 * A torn tail line (partial write from a killed process) makes the log
 * unreadable: fail closed until an operator inspects the bytes.
 */

import * as fs from "fs";
import * as path from "path";
import {
  FailureClass,
  Receipt,
  ReceiptStage,
  TerminalOutcome,
} from "./types";

export class ReceiptLogUnreadableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReceiptLogUnreadableError";
  }
}

export interface ReconcileEvidence {
  outcome: TerminalOutcome.EXECUTED | TerminalOutcome.NOT_ATTEMPTED;
  reason: string;
  evidence: Record<string, unknown>;
  resolvedBy: string;
}

export class ReceiptLog {
  private seq = 0;
  private receipts = new Map<string, Receipt[]>();
  private torn = false;

  constructor(private readonly filePath?: string) {
    if (filePath && fs.existsSync(filePath)) {
      this.load(filePath);
    }
  }

  private load(filePath: string): void {
    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw.split("\n");
    for (const line of lines) {
      if (line.trim() === "") continue;
      let rec: Receipt;
      try {
        rec = JSON.parse(line);
      } catch {
        this.torn = true;
        throw new ReceiptLogUnreadableError(
          `torn tail in receipt log ${filePath}: refusing to trust partial state`,
        );
      }
      this.ingest(rec);
    }
  }

  private ingest(rec: Receipt): void {
    this.seq = Math.max(this.seq, rec.seq + 1);
    const list = this.receipts.get(rec.receiptId) ?? [];
    list.push(rec);
    this.receipts.set(rec.receiptId, list);
  }

  private append(rec: Omit<Receipt, "seq" | "at">): Receipt {
    const full: Receipt = {
      ...rec,
      seq: this.seq++,
      at: new Date().toISOString(),
    };
    this.ingest(full);
    if (this.filePath) {
      fs.appendFileSync(this.filePath, JSON.stringify(full) + "\n");
      const fd = fs.openSync(this.filePath, "r");
      try {
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
    }
    return full;
  }

  /** Mint a new operation id. Deterministic per log instance (no randomness). */
  mintId(prefix = "op"): string {
    const base = this.filePath ? path.basename(this.filePath, ".jsonl") : "mem";
    return `${prefix}-${base}-${this.seq}`;
  }

  recordIntent(receiptId: string, connectorId: string, capability: string, detail = {}): Receipt {
    return this.append({
      receiptId,
      connectorId,
      capability,
      stage: ReceiptStage.INTENT_RECORDED,
      terminalOutcome: null,
      failureClass: null,
      leaseToken: null,
      detail,
    });
  }

  recordClaim(receiptId: string, connectorId: string, capability: string, leaseToken: string, detail = {}): Receipt {
    return this.append({
      receiptId,
      connectorId,
      capability,
      stage: ReceiptStage.CLAIMED,
      terminalOutcome: null,
      failureClass: null,
      leaseToken,
      detail,
    });
  }

  recordObservation(
    receiptId: string,
    connectorId: string,
    capability: string,
    opts: { ok: boolean; failureClass?: FailureClass; leaseToken?: string | null; detail?: Record<string, unknown> },
  ): Receipt {
    return this.append({
      receiptId,
      connectorId,
      capability,
      stage: ReceiptStage.OBSERVED,
      terminalOutcome: opts.ok ? TerminalOutcome.EXECUTED : TerminalOutcome.FAILED,
      failureClass: opts.failureClass ?? null,
      leaseToken: opts.leaseToken ?? null,
      detail: opts.detail ?? {},
    });
  }

  /**
   * Explicit, evidenced reconciliation of an UNKNOWN operation. The ONLY
   * path out of UNKNOWN. Records a new OBSERVED-stage receipt so the
   * derivation below resolves deterministically.
   */
  reconcile(receiptId: string, ev: ReconcileEvidence): Receipt {
    const current = this.derive(receiptId);
    if (current !== TerminalOutcome.UNKNOWN) {
      throw new Error(
        `reconcile refused: ${receiptId} is ${current}, only UNKNOWN may be reconciled`,
      );
    }
    const prior = this.receipts.get(receiptId)![0];
    return this.append({
      receiptId,
      connectorId: prior.connectorId,
      capability: prior.capability,
      stage: ReceiptStage.OBSERVED,
      terminalOutcome: ev.outcome,
      failureClass: null,
      leaseToken: null,
      detail: { reconciled: true, reason: ev.reason, evidence: ev.evidence, resolvedBy: ev.resolvedBy },
    });
  }

  /**
   * Derive the terminal outcome for an operation.
   *
   * @param claimantRan - did the claimant provably begin executing the
   *   external operation (i.e. was the adapter invoked)? When false and no
   *   observation exists, the outcome is NOT_ATTEMPTED; when true (or
   *   unknown), it is UNKNOWN. The caller must supply evidence; the log
   *   never guesses.
   */
  derive(receiptId: string, claimantRan: boolean | null = null): TerminalOutcome | null {
    const list = this.receipts.get(receiptId);
    if (!list || list.length === 0) return null;
    const ordered = [...list].sort((a, b) => a.seq - b.seq);
    // A reconciled OBSERVED record is authoritative and terminal.
    const last = ordered[ordered.length - 1];
    if (last.terminalOutcome !== null) return last.terminalOutcome;
    const stages = new Set(ordered.map((r) => r.stage));
    if (stages.has(ReceiptStage.OBSERVED)) {
      // Observed but no terminal outcome recorded: corrupt stream; fail closed.
      throw new ReceiptLogUnreadableError(
        `receipt ${receiptId} has OBSERVED stage with no terminal outcome`,
      );
    }
    if (stages.has(ReceiptStage.CLAIMED)) {
      if (claimantRan === false) return TerminalOutcome.NOT_ATTEMPTED;
      return TerminalOutcome.UNKNOWN;
    }
    if (stages.has(ReceiptStage.INTENT_RECORDED)) {
      return TerminalOutcome.NOT_ATTEMPTED;
    }
    return null;
  }

  history(receiptId: string): Receipt[] {
    return [...(this.receipts.get(receiptId) ?? [])].sort((a, b) => a.seq - b.seq);
  }

  isTorn(): boolean {
    return this.torn;
  }
}
