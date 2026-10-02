/**
 * Lane T spike: action plan builder.
 * planAction(question, ctx) -> ActionPlan. Pure and deterministic:
 * same inputs -> byte-identical plan (digest stable). Timestamps live
 * outside the digest.
 */
"use strict";

const crypto = require("crypto");
const { classify } = require("./intent");
const { evaluateCandidate, CONTACT_RANK, evidenceRank } = require("./policy");

function canonicalJson(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalJson).join(",") + "]";
  return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonicalJson(v[k])).join(",") + "}";
}

function sha256(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function capabilityDigest(cap) {
  return sha256(canonicalJson({
    id: cap.id, kind: cap.kind, objectId: cap.objectId,
    valueRef: cap.valueRef, evidenceState: cap.evidence.state,
    lastChecked: cap.lastChecked, status: cap.status,
  }));
}

/**
 * Pick capabilities relevant to an intent kind. Deterministic ordering.
 * Contact-value capabilities are ONLY matched from records, never from
 * free text (injection boundary).
 */
function relevantCapabilities(intent, capabilities) {
  const byKind = (kinds) => capabilities
    .filter((c) => kinds.includes(c.kind))
    .sort((a, b) =>
      (CONTACT_RANK[a.kind] - CONTACT_RANK[b.kind]) ||
      (evidenceRank(a.evidence.state) - evidenceRank(b.evidence.state)) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  switch (intent.kind) {
    case "contact.request": {
      const want = intent.slots.channel;
      if (want === "phone") return byKind(["phone"]);
      if (want === "email") return byKind(["email"]);
      if (want === "form") return byKind(["contact_form"]);
      if (want === "message") return byKind(["fyd_message"]);
      return byKind(["phone", "email", "contact_form", "fyd_message"]);
    }
    case "contact.call": return byKind(["phone"]);
    case "contact.email": return byKind(["email"]);
    case "visit.navigate": return byKind(["directions"]);
    case "booking.request": return byKind(["booking"]);
    case "message.business": return byKind(["fyd_message"]);
    default: return [];
  }
}

function fallbackForIntent(intentKind) {
  if (intentKind === "booking.request" || intentKind === "message.business" || intentKind === "visit.navigate") {
    return { when: `no usable capability for ${intentKind}`, plan: "Use the contact.request plan instead." };
  }
  return null;
}

function noCapabilityReason(intentKind) {
  switch (intentKind) {
    case "booking.request": return "Refused: this business has no booking capability FYD can verify.";
    case "message.business": return "Refused: this business does not offer FYD messaging.";
    case "visit.navigate": return "Refused: no verified address or directions capability.";
    case "contact.request":
    case "contact.call":
    case "contact.email": return "Refused: no verified contact capability exists for this channel.";
    default: return "Refused: no capability supports this intent.";
  }
}

function buildCard({ intent, candidate, targetTitle, planDigest }) {
  const what = [];
  if (intent.kind === "owner.update_field") {
    what.push(`Set ${intent.slots.field} to: ${intent.slots.value || "(awaiting your value)"}`);
  } else if (intent.kind === "booking.request") {
    what.push(`Request the ${intent.slots.when === "soonest" ? "earliest available" : "requested"} slot`);
    what.push(`Service: ${intent.slots.service || "(choose from the business service list)"}`);
  } else if (intent.kind === "message.business") {
    what.push("Send the reviewed message text as you");
  } else {
    what.push(`${intent.kind} via ${candidate.kind}`);
  }
  if (intent.rerouteReason) what.unshift(intent.rerouteReason);
  return {
    title: cardTitle(intent, targetTitle),
    what,
    before: intent.kind.startsWith("owner.") ? [`Current ${intent.slots.field}: (from the object record)`] : [],
    after: intent.kind.startsWith("owner.") ? [`Proposed ${intent.slots.field}: ${intent.slots.value || "(awaiting your value)"}`] : [],
    evidenceReason: candidate.reason,
    affectedObjects: [{ id: candidate.objectId, title: targetTitle }],
    operationCount: 1,
    planDigest,
    approveLabel: approveLabel(intent),
    declineLabel: "Cancel",
    requiresPrincipal: intent.kind.startsWith("owner.") ? "owner" : "visitor",
  };
}

function cardTitle(intent, targetTitle) {
  const t = targetTitle || "this business";
  switch (intent.kind) {
    case "booking.request": return `Request booking with ${t}`;
    case "message.business": return `Send message to ${t}`;
    case "owner.update_field": return `Propose ${intent.slots.field} update`;
    case "owner.site_change": return "Propose site change";
    case "owner.publish": return "Publish site changes";
    default: return `${intent.kind} for ${t}`;
  }
}

function approveLabel(intent) {
  switch (intent.kind) {
    case "booking.request": return "Continue to booking";
    case "message.business": return "Send message";
    case "owner.publish": return "Publish";
    default: return "Approve";
  }
}

/**
 * planAction(question, ctx) where ctx = {
 *   targetObjectId, targetTitle, controllerId,
 *   principal: { kind: "anonymous"|"visitor"|"owner", viewerId },
 *   grants: string[], forbiddenEffects: string[],
 *   capabilities: CapabilityRecord[],
 * }
 */
function planAction(question, ctx) {
  const intents = classify(question);
  const steps = [];
  const refused = [];
  const fallbacks = [];

  if (intents.length === 0) {
    const plan = emptyPlan(question, ctx, {
      kind: "unknown.action", confidence: "none", anchors: [],
      slots: {}, needsClarification: false, missingSlots: [],
      clarificationQuestion: null, targetObjectId: ctx.targetObjectId,
    });
    plan.refused.push({ capabilityId: null, reason: "No action intent recognized. Ask a factual question, or name an action like contact, book, or update." });
    return finalize(plan);
  }

  for (const intent of intents) {
    intent.targetObjectId = ctx.targetObjectId;

    // quote.request never fabricates a price: it becomes a contact plan so
    // the visitor asks the business directly. The reroute is recorded.
    // (Mutated in place so the intents array stays consistent for gating.)
    if (intent.kind === "quote.request") {
      intent.reroutedFrom = "quote.request";
      intent.kind = "contact.request";
      intent.rerouteReason = "FYD does not invent prices. This quote request became a contact plan.";
    }

    if (intent.kind.startsWith("owner.")) {
      // Ownership gate FIRST: a non-owner is refused even when the value
      // slot is missing. Never ask a non-owner for an owner-only value.
      const ev = evaluateCandidate({ capability: null, intent, principal: ctx.principal, grants: ctx.grants, forbiddenEffects: ctx.forbiddenEffects });
      if (ev.gate === "refuse") {
        refused.push({ capabilityId: null, reason: ev.reason });
        steps.push({ intent: intent.kind, status: "refused", candidates: [] });
        continue;
      }
      if (intent.needsClarification && intent.clarificationQuestion) {
        steps.push({
          intent: intent.kind,
          status: "needs_clarification",
          clarificationQuestion: intent.clarificationQuestion,
          candidates: [],
        });
        continue;
      }
      const candidate = {
        capabilityId: "builtin:proposal",
        kind: "proposal",
        objectId: ctx.targetObjectId,
        route: "proposal",
        gate: "propose",
        reason: ev.reason,
        rank: 1,
        evidenceState: "observed",
        capabilityDigest: sha256("builtin:proposal"),
      };
      steps.push({ intent: intent.kind, status: "planned", candidates: [candidate] });
      continue;
    }

    const caps = relevantCapabilities(intent, ctx.capabilities);

    // Zero relevant capabilities: honest refusal, never a guessed route.
    if (caps.length === 0) {
      refused.push({ capabilityId: null, reason: noCapabilityReason(intent.kind) });
      const fb = fallbackForIntent(intent.kind);
      if (fb) fallbacks.push(fb);
      else fallbacks.push({ when: "no candidate survived policy", plan: "Ask a factual question about this business instead." });
      steps.push({ intent: intent.kind, status: "no_candidate", candidates: [] });
      continue;
    }

    if (intent.needsClarification && intent.clarificationQuestion) {
      steps.push({
        intent: intent.kind,
        status: "needs_clarification",
        clarificationQuestion: intent.clarificationQuestion,
        candidates: [],
      });
      continue;
    }

    const candidates = [];
    const seenFallbacks = new Set();
    let rank = 1;
    for (const cap of caps) {
      const ev = evaluateCandidate({ capability: cap, intent, principal: ctx.principal, grants: ctx.grants, forbiddenEffects: ctx.forbiddenEffects });
      if (ev.gate === "refuse") {
        refused.push({ capabilityId: cap.id, reason: ev.reason });
        if (ev.fallback && !seenFallbacks.has(ev.fallback)) {
          seenFallbacks.add(ev.fallback);
          fallbacks.push({ when: `no usable ${cap.kind} capability`, plan: `Use the ${ev.fallback} plan instead.` });
        }
        continue;
      }
      candidates.push({
        capabilityId: cap.id,
        kind: cap.kind,
        objectId: cap.objectId,
        route: ev.route,
        gate: ev.gate,
        reason: ev.reason,
        rank: rank++,
        evidenceState: cap.evidence.state,
        capabilityDigest: capabilityDigest(cap),
      });
    }
    if (candidates.length === 0 && refused.length > 0 && !fallbacks.length) {
      fallbacks.push({ when: "no candidate survived policy", plan: "Ask a factual question about this business instead." });
    }

    steps.push({
      intent: intent.kind,
      status: candidates.length ? "planned" : "no_candidate",
      candidates,
    });
  }

  const plan = {
    planId: null,
    question,
    intents,
    targetObjectId: ctx.targetObjectId,
    principal: ctx.principal,
    steps,
    confirmationGates: [],
    fallbacks,
    refused,
    digest: null,
    decidedAt: null, // set by finalize, outside the digest
  };

  // Digest binds the decision core (intents, steps, candidates, fallbacks,
  // refused). Gates are deterministically derived and reference it.
  const coreDigest = sha256(canonicalJson(stripPlan(plan)));

  // Confirmation gates for every propose candidate.
  let gi = 0;
  for (const step of steps) {
    for (const c of step.candidates) {
      if (c.gate !== "propose") continue;
      plan.confirmationGates.push({
        gateId: `gate:${++gi}`,
        candidateRef: c.capabilityId,
        card: buildCard({ intent: intents.find((i) => i.kind === step.intent), candidate: c, targetTitle: ctx.targetTitle, planDigest: coreDigest }),
        digest: coreDigest,
        requiresPrincipal: c.kind === "proposal" ? "owner" : "visitor",
      });
    }
  }

  return finalize(plan);
}

function emptyPlan(question, ctx, intent) {
  return {
    planId: null, question, intents: [intent],
    targetObjectId: ctx.targetObjectId, principal: ctx.principal,
    steps: [], confirmationGates: [], fallbacks: [], refused: [],
    digest: null, decidedAt: null,
  };
}

function stripPlan(plan) {
  const { digest, planId, decidedAt, confirmationGates, ...rest } = plan;
  return rest;
}

function finalize(plan) {
  const body = stripPlan(plan);
  plan.digest = sha256(canonicalJson(body));
  plan.planId = "plan:" + plan.digest.slice(0, 16);
  plan.decidedAt = new Date().toISOString();
  return plan;
}

module.exports = { planAction, sha256, canonicalJson };
