/**
 * TenantOS observability: OTel gen_ai.* telemetry vocabulary as a PROJECTION
 * (convergence wave, E4).
 *
 * Authority rule: the journal (events) is the evidence authority. Spans are a
 * projection of journal events into the OpenTelemetry semantic-conventions
 * vocabulary so standard backends can read them. Exporters never create
 * evidence; they translate it. A span attribute is never proof that something
 * happened — the journal event it projects is.
 *
 * Vocabulary policy:
 * - Pin the STABLE gen_ai.* core only (gen_ai.system, gen_ai.request.*,
 *   gen_ai.response.*, gen_ai.usage.*, gen_ai.operation.name,
 *   gen_ai.provider.name, gen_ai.tool.*). Experimental agent conventions
 *   (gen_ai.agent.*) are deliberately skipped: they are not stable and we do
 *   not project guesses.
 * - Every span carries tenant_id and run_id attributes (custom namespace
 *   tenant.*) so backends can anti-join spans back to journal events.
 * - Mapping is total and pure: every known journal event type maps; unknown
 *   types produce a typed UNMAPPED outcome, never a throw and never a silent
 *   drop.
 *
 * Pure and deterministic: no imports, no I/O.
 */

/** Journal event types this projection understands. */
export type MappableJournalEventType =
  | "model.request"
  | "model.response"
  | "tool.call"
  | "tool.result"
  | "verification.output"
  | "budget.exhausted";

/** The journal event shape the projection reads (structural, not imported). */
export interface JournalEventLike {
  eventId: string;
  eventType: string;
  tenantId: string;
  runId?: string;
  missionId?: string;
  /** ISO-8601. */
  occurredAt: string;
  payload?: Record<string, unknown>;
}

/** Span kind vocabulary pinned by this projection. */
export type GenAiSpanName =
  | "gen_ai.request"
  | "gen_ai.tool.call"
  | "gen_ai.verification"
  | "gen_ai.budget.exhausted";

/**
 * Pinned STABLE gen_ai.* attribute keys. This is the closed vocabulary:
 * projection output may only use these keys plus the tenant.* join keys.
 * Experimental gen_ai.agent.* keys are intentionally absent.
 */
export const STABLE_GEN_AI_ATTRIBUTES = [
  "gen_ai.system",
  "gen_ai.operation.name",
  "gen_ai.provider.name",
  "gen_ai.request.model",
  "gen_ai.request.max_tokens",
  "gen_ai.request.temperature",
  "gen_ai.request.top_p",
  "gen_ai.response.model",
  "gen_ai.response.id",
  "gen_ai.response.finish_reasons",
  "gen_ai.usage.input_tokens",
  "gen_ai.usage.output_tokens",
  "gen_ai.tool.name",
  "gen_ai.tool.call.id",
  "gen_ai.data_source.id",
] as const;

export type StableGenAiAttribute = (typeof STABLE_GEN_AI_ATTRIBUTES)[number];

/** Join keys back to the journal (custom namespace; not OTel semconv). */
export const JOURNAL_JOIN_ATTRIBUTES = ["tenant.tenant_id", "tenant.run_id", "tenant.event_id"] as const;

export type SpanAttributeValue = string | number | boolean;

export interface ProjectedSpan {
  name: GenAiSpanName;
  attributes: Record<string, SpanAttributeValue>;
  /** ISO-8601, copied from the journal event (projection, not a new clock). */
  timestamp: string;
}

export type ProjectionOutcome =
  | { mapped: true; span: ProjectedSpan }
  | { mapped: false; reason: "UNMAPPED_EVENT_TYPE"; eventType: string; eventId: string };

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function joinAttrs(event: JournalEventLike): Record<string, SpanAttributeValue> {
  const attrs: Record<string, SpanAttributeValue> = {
    "tenant.tenant_id": event.tenantId,
    "tenant.event_id": event.eventId,
  };
  if (event.runId !== undefined) attrs["tenant.run_id"] = event.runId;
  return attrs;
}

function setIfDefined(
  attrs: Record<string, SpanAttributeValue>,
  key: string,
  value: SpanAttributeValue | undefined,
): void {
  if (value !== undefined) attrs[key] = value;
}

/**
 * Project one journal event to an OTel-shaped span. Total over event types:
 * unknown types return a typed UNMAPPED outcome (the caller decides whether
 * to log/drop; the projection never throws and never silently invents).
 */
export function projectEventToSpan(event: JournalEventLike): ProjectionOutcome {
  const p = event.payload ?? {};
  switch (event.eventType) {
    case "model.request": {
      const attrs = joinAttrs(event);
      setIfDefined(attrs, "gen_ai.system", str(p["system"]));
      setIfDefined(attrs, "gen_ai.operation.name", "chat");
      setIfDefined(attrs, "gen_ai.request.model", str(p["model"]));
      setIfDefined(attrs, "gen_ai.request.max_tokens", num(p["maxTokens"]));
      setIfDefined(attrs, "gen_ai.request.temperature", num(p["temperature"]));
      setIfDefined(attrs, "gen_ai.request.top_p", num(p["topP"]));
      return { mapped: true, span: { name: "gen_ai.request", attributes: attrs, timestamp: event.occurredAt } };
    }
    case "model.response": {
      const attrs = joinAttrs(event);
      setIfDefined(attrs, "gen_ai.system", str(p["system"]));
      setIfDefined(attrs, "gen_ai.operation.name", "chat");
      setIfDefined(attrs, "gen_ai.response.model", str(p["model"]));
      setIfDefined(attrs, "gen_ai.response.id", str(p["responseId"]));
      setIfDefined(attrs, "gen_ai.usage.input_tokens", num(p["inputTokens"]));
      setIfDefined(attrs, "gen_ai.usage.output_tokens", num(p["outputTokens"]));
      const finish = p["finishReasons"];
      if (Array.isArray(finish) && finish.every((f) => typeof f === "string"))
        attrs["gen_ai.response.finish_reasons"] = finish.join(",");
      return { mapped: true, span: { name: "gen_ai.request", attributes: attrs, timestamp: event.occurredAt } };
    }
    case "tool.call": {
      const attrs = joinAttrs(event);
      setIfDefined(attrs, "gen_ai.operation.name", "execute_tool");
      setIfDefined(attrs, "gen_ai.tool.name", str(p["toolName"]));
      setIfDefined(attrs, "gen_ai.tool.call.id", str(p["callId"]));
      setIfDefined(attrs, "gen_ai.system", str(p["system"]));
      return { mapped: true, span: { name: "gen_ai.tool.call", attributes: attrs, timestamp: event.occurredAt } };
    }
    case "tool.result": {
      const attrs = joinAttrs(event);
      setIfDefined(attrs, "gen_ai.operation.name", "execute_tool");
      setIfDefined(attrs, "gen_ai.tool.name", str(p["toolName"]));
      setIfDefined(attrs, "gen_ai.tool.call.id", str(p["callId"]));
      return { mapped: true, span: { name: "gen_ai.tool.call", attributes: attrs, timestamp: event.occurredAt } };
    }
    case "verification.output": {
      const attrs = joinAttrs(event);
      setIfDefined(attrs, "gen_ai.operation.name", "verification");
      setIfDefined(attrs, "gen_ai.data_source.id", str(p["artifactId"]));
      return { mapped: true, span: { name: "gen_ai.verification", attributes: attrs, timestamp: event.occurredAt } };
    }
    case "budget.exhausted": {
      const attrs = joinAttrs(event);
      setIfDefined(attrs, "gen_ai.operation.name", "budget_check");
      const dimension = str(p["dimension"]);
      const scope = str(p["scope"]);
      if (dimension !== undefined || scope !== undefined)
        attrs["gen_ai.data_source.id"] = `budget:${scope ?? "unknown"}:${dimension ?? "unknown"}`;
      return { mapped: true, span: { name: "gen_ai.budget.exhausted", attributes: attrs, timestamp: event.occurredAt } };
    }
    default:
      return {
        mapped: false,
        reason: "UNMAPPED_EVENT_TYPE",
        eventType: event.eventType,
        eventId: event.eventId,
      };
  }
}

/**
 * Vocabulary guard: true when every attribute key on the span is either a
 * pinned stable gen_ai.* key or a tenant.* journal join key. Exporters should
 * assert this before emitting; a false here is a projection bug, not an
 * exporter decision.
 */
export function vocabularyIsPinned(span: ProjectedSpan): boolean {
  const stable = new Set<string>(STABLE_GEN_AI_ATTRIBUTES);
  const joins = new Set<string>(JOURNAL_JOIN_ATTRIBUTES);
  return Object.keys(span.attributes).every((k) => stable.has(k) || joins.has(k));
}
