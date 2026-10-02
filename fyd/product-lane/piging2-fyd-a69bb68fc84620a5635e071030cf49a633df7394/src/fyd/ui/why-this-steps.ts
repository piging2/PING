/**
 * Why This step builders: server-safe (no "use client").
 *
 * The WhyThis component lives in a client module; server components cannot
 * call functions exported from client modules. Step construction therefore
 * lives here, in a plain module both sides can import.
 */
import type { EvidenceState } from "./evidence-state";

export interface EvidenceStep {
  /** e.g. "Object field", "Evidence", "Observation", "Source". */
  step: string;
  /** The value or reference at this step. */
  detail: string;
  state?: EvidenceState;
}

/**
 * Build Why This steps from a structured object provenance record.
 *
 * The provenance ref is machine-shaped ("website-ingestion:<url>" or
 * "ping-event:<id>"): the prefix names the observation method, the rest
 * names the source. Every step carries its evidence state, so the
 * disclosure shows status badges instead of prose. No step invents
 * lineage: when the ref has no recognizable prefix, the full ref is shown
 * verbatim as the source.
 */
export function whyThisStepsForProvenance(args: {
  /** e.g. "description on ping.social.business@1". */
  fieldLabel: string;
  /** Observation method prefix, e.g. "website-ingestion" or "ping-event". */
  ref: string;
  /** ISO timestamp of the observation, e.g. "2026-09-21T13:50:00Z". */
  derivedAt: string;
}): EvidenceStep[] {
  const { fieldLabel, ref, derivedAt } = args;
  const observedDay = derivedAt.slice(0, 10);
  const sep = ref.indexOf(":");
  const prefix = sep > 0 ? ref.slice(0, sep) : "";
  const rest = sep > 0 ? ref.slice(sep + 1) : ref;
  const methodLabel =
    prefix === "website-ingestion"
      ? "Website ingestion"
      : prefix === "ping-event"
        ? "PING event record"
        : prefix || "Recorded observation";
  const sourceDetail =
    prefix === "website-ingestion" && rest
      ? rest
      : prefix === "ping-event" && rest
        ? "PING event " + rest
        : ref;
  return [
    { step: "Object field", detail: fieldLabel, state: "observed" },
    {
      step: "Observation method",
      detail: methodLabel + " (observed " + observedDay + ")",
      state: "observed",
    },
    { step: "Source", detail: sourceDetail, state: "observed" },
  ];
}
