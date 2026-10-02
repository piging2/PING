/**
 * Unit tests for observability/semconv.ts (convergence wave, E4).
 *
 * Proves: known journal event types project to spans in the pinned gen_ai.*
 * vocabulary, every span carries the tenant join keys (tenant_id + event_id,
 * run_id when present) for the journal anti-join, unknown event types return
 * a typed UNMAPPED outcome (never throw, never silent), and the vocabulary
 * guard rejects any experimental/unknown attribute key.
 */
import {
  JournalEventLike,
  projectEventToSpan,
  STABLE_GEN_AI_ATTRIBUTES,
  vocabularyIsPinned,
} from "../semconv";

function event(over: Partial<JournalEventLike> = {}): JournalEventLike {
  return {
    eventId: "evt-1",
    eventType: "model.request",
    tenantId: "t1",
    runId: "r1",
    occurredAt: "2026-09-24T11:00:00.000Z",
    payload: {},
    ...over,
  };
}

describe("projectEventToSpan", () => {
  it("maps a model.request event to a gen_ai.request span with join keys", () => {
    const out = projectEventToSpan(
      event({
        payload: { system: "openai", model: "gpt-5", maxTokens: 1000, temperature: 0.2 },
      }),
    );
    expect(out.mapped).toBe(true);
    if (out.mapped) {
      expect(out.span.name).toBe("gen_ai.request");
      expect(out.span.attributes["gen_ai.system"]).toBe("openai");
      expect(out.span.attributes["gen_ai.request.model"]).toBe("gpt-5");
      expect(out.span.attributes["gen_ai.request.max_tokens"]).toBe(1000);
      expect(out.span.attributes["gen_ai.request.temperature"]).toBe(0.2);
      expect(out.span.attributes["tenant.tenant_id"]).toBe("t1");
      expect(out.span.attributes["tenant.run_id"]).toBe("r1");
      expect(out.span.attributes["tenant.event_id"]).toBe("evt-1");
      expect(out.span.timestamp).toBe("2026-09-24T11:00:00.000Z");
      expect(vocabularyIsPinned(out.span)).toBe(true);
    }
  });

  it("maps a model.response with usage and finish reasons", () => {
    const out = projectEventToSpan(
      event({
        eventType: "model.response",
        payload: {
          system: "openai",
          model: "gpt-5",
          responseId: "resp-9",
          inputTokens: 120,
          outputTokens: 45,
          finishReasons: ["stop"],
        },
      }),
    );
    expect(out.mapped).toBe(true);
    if (out.mapped) {
      expect(out.span.attributes["gen_ai.usage.input_tokens"]).toBe(120);
      expect(out.span.attributes["gen_ai.usage.output_tokens"]).toBe(45);
      expect(out.span.attributes["gen_ai.response.finish_reasons"]).toBe("stop");
      expect(out.span.attributes["gen_ai.response.id"]).toBe("resp-9");
      expect(vocabularyIsPinned(out.span)).toBe(true);
    }
  });

  it("maps tool.call and tool.result to gen_ai.tool.call spans", () => {
    for (const type of ["tool.call", "tool.result"] as const) {
      const out = projectEventToSpan(
        event({ eventType: type, payload: { toolName: "web.fetch", callId: "call-3" } }),
      );
      expect(out.mapped).toBe(true);
      if (out.mapped) {
        expect(out.span.name).toBe("gen_ai.tool.call");
        expect(out.span.attributes["gen_ai.tool.name"]).toBe("web.fetch");
        expect(out.span.attributes["gen_ai.tool.call.id"]).toBe("call-3");
        expect(vocabularyIsPinned(out.span)).toBe(true);
      }
    }
  });

  it("maps verification.output and budget.exhausted", () => {
    const v = projectEventToSpan(
      event({ eventType: "verification.output", payload: { artifactId: "art-1" } }),
    );
    expect(v.mapped).toBe(true);
    if (v.mapped) {
      expect(v.span.name).toBe("gen_ai.verification");
      expect(v.span.attributes["gen_ai.data_source.id"]).toBe("art-1");
    }
    const b = projectEventToSpan(
      event({ eventType: "budget.exhausted", payload: { dimension: "tool-calls", scope: "run" } }),
    );
    expect(b.mapped).toBe(true);
    if (b.mapped) {
      expect(b.span.name).toBe("gen_ai.budget.exhausted");
      expect(b.span.attributes["gen_ai.data_source.id"]).toBe("budget:run:tool-calls");
    }
  });

  it("omits run_id when the event has none, keeps the tenant join", () => {
    const out = projectEventToSpan(event({ runId: undefined }));
    expect(out.mapped).toBe(true);
    if (out.mapped) {
      expect("tenant.run_id" in out.span.attributes).toBe(false);
      expect(out.span.attributes["tenant.tenant_id"]).toBe("t1");
    }
  });

  it("returns a typed UNMAPPED outcome for unknown event types, never throws", () => {
    let threw = false;
    let out;
    try {
      out = projectEventToSpan(event({ eventType: "mystery.happened" }));
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(out).toBeDefined();
    if (out && !out.mapped) {
      expect(out.reason).toBe("UNMAPPED_EVENT_TYPE");
      expect(out.eventType).toBe("mystery.happened");
      expect(out.eventId).toBe("evt-1");
    } else {
      throw new Error("expected an unmapped outcome");
    }
  });

  it("skips malformed payload values instead of emitting garbage", () => {
    const out = projectEventToSpan(
      event({ payload: { maxTokens: "a-thousand", temperature: NaN } }),
    );
    expect(out.mapped).toBe(true);
    if (out.mapped) {
      expect("gen_ai.request.max_tokens" in out.span.attributes).toBe(false);
      expect("gen_ai.request.temperature" in out.span.attributes).toBe(false);
      expect(vocabularyIsPinned(out.span)).toBe(true);
    }
  });

  it("vocabulary guard rejects experimental agent.* keys", () => {
    const out = projectEventToSpan(event());
    expect(out.mapped).toBe(true);
    if (out.mapped) {
      const tampered = {
        ...out.span,
        attributes: { ...out.span.attributes, "gen_ai.agent.name": "rogue" },
      };
      expect(vocabularyIsPinned(tampered)).toBe(false);
    }
    // And the pinned list itself contains no experimental agent keys.
    expect(STABLE_GEN_AI_ATTRIBUTES.some((k) => k.startsWith("gen_ai.agent"))).toBe(false);
  });
});
