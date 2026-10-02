/**
 * Lane T spike: deterministic intent classifier.
 * Keyword-anchored, closed intent space. No model, no probabilities.
 * Idiom follows PING's own SitePatchIntent / ask-composer hasWord style.
 */
"use strict";

function hasWord(q, ...words) {
  return words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(q));
}

function hasPhrase(q, ...phrases) {
  return phrases.some((p) => q.includes(p));
}

/**
 * Anchor sets per intent kind. Ordered by priority for tie-breaking.
 * Each entry: { kind, anchors: [...], weakAnchors: [...] }
 */
const INTENT_ANCHORS = [
  {
    kind: "contact.call",
    anchors: ["call them", "call the business", "phone them", "give them a call"],
    weak: ["call", "phone"],
  },
  {
    kind: "contact.email",
    anchors: ["email them", "send them an email", "write them an email"],
    weak: ["email"],
  },
  {
    kind: "booking.request",
    anchors: ["book", "booking", "schedule an appointment", "make an appointment", "reserve"],
    weak: [],
  },
  {
    kind: "visit.navigate",
    anchors: ["directions", "get there", "how do i get", "navigate", "find them"],
    weak: ["address", "location", "where are they"],
  },
  {
    kind: "contact.request",
    anchors: ["contact them", "contact the business", "get in touch", "reach them", "reach out"],
    weak: ["contact"],
  },
  {
    kind: "quote.request",
    anchors: ["get a quote", "request a quote", "how much for", "price for", "estimate for"],
    weak: ["quote", "estimate", "price"],
  },
  {
    kind: "message.business",
    anchors: ["message them", "send them a message", "dm them"],
    weak: ["message"],
  },
  {
    kind: "owner.update_field",
    anchors: ["update my", "change my", "fix my", "correct my", "edit my"],
    weak: [],
  },
  {
    kind: "owner.site_change",
    anchors: ["change my site", "update my site", "redesign", "feature the", "add to my site"],
    weak: ["my site", "my website"],
  },
  {
    kind: "owner.publish",
    anchors: ["publish", "go live", "push live"],
    weak: [],
  },
];

const FIELD_ANCHORS = [
  { field: "hours", words: ["hours", "open", "opening", "schedule"] },
  { field: "phone", words: ["phone number", "phone"] },
  { field: "email", words: ["email address", "email"] },
  { field: "description", words: ["description", "about", "bio"] },
  { field: "address", words: ["address", "location"] },
];

const CHANNEL_ANCHORS = [
  { channel: "phone", words: ["call", "phone", "ring"] },
  { channel: "email", words: ["email", "mail"] },
  { channel: "form", words: ["form"] },
  { channel: "message", words: ["message", "text", "dm"] },
];

const WHEN_ANCHORS = [
  { when: "soonest", words: ["soonest", "asap", "earliest"] },
  { when: "tomorrow", words: ["tomorrow"] },
  { when: "this_week", words: ["this week"] },
  { when: "next_week", words: ["next week"] },
];

function detectSlots(q, kind) {
  const slots = {};
  if (kind === "contact.request" || kind === "contact.call" || kind === "contact.email" || kind === "message.business") {
    for (const c of CHANNEL_ANCHORS) {
      if (hasWord(q, ...c.words)) {
        slots.channel = c.channel;
        break;
      }
    }
    slots.channel = slots.channel || null;
  }
  if (kind === "booking.request") {
    for (const w of WHEN_ANCHORS) {
      if (hasWord(q, ...w.words)) {
        slots.when = w.when;
        break;
      }
    }
    slots.when = slots.when || null;
    slots.service = null; // resolved from the target object, never parsed from free text
  }
  if (kind === "owner.update_field") {
    for (const f of FIELD_ANCHORS) {
      if (hasWord(q, ...f.words)) {
        slots.field = f.field;
        break;
      }
    }
    slots.field = slots.field || null;
    // The value is the owner's own words, never invented. Deterministic
    // extraction from the question itself; otherwise it arrives in a
    // follow-up turn (needsClarification).
    const m = q.match(/(?:update|change|fix|correct|edit)\s+my\s+\S[\s\S]*?\bto:?\s+(.+)$/);
    slots.value = m ? m[1].trim() : null;
  }
  return slots;
}

function requiredSlots(kind) {
  if (kind === "owner.update_field") return ["field", "value"];
  if (kind === "booking.request") return []; // "when" optional; missing -> ask inside the card
  return [];
}

function clarificationFor(kind, slots) {
  if (kind === "owner.update_field" && !slots.value) {
    const field = slots.field || "that field";
    return `What should the new ${field} be? Tell me the exact new value and I will draft it as a proposal.`;
  }
  return null;
}

/**
 * classify(question) -> IntentClassification[]
 * Returns one record per matched intent (multi-intent support).
 * Empty array means no anchor matched -> caller emits unknown.action.
 */
function classify(question) {
  const q = question.toLowerCase().trim();
  if (!q) return [];
  const matched = [];
  for (const def of INTENT_ANCHORS) {
    const strong = def.anchors.filter((a) => hasPhrase(q, a));
    const weak = strong.length === 0 ? def.weak.filter((w) => hasWord(q, w)) : [];
    if (strong.length > 0 || weak.length > 0) {
      matched.push({
        def,
        anchors: [...strong, ...weak],
        confidence: strong.length > 0 ? "anchor" : "anchor_weak",
      });
    }
  }
  // Weak-only matches that collide with a strong match of another kind lose.
  const strongKinds = new Set(matched.filter((m) => m.confidence === "anchor").map((m) => m.def.kind));
  const kept = matched.filter((m) => m.confidence === "anchor" || strongKinds.size === 0);
  return kept.map((m) => {
    const slots = detectSlots(q, m.def.kind);
    const missing = requiredSlots(m.def.kind).filter((s) => slots[s] == null);
    const clarificationQuestion = clarificationFor(m.def.kind, slots);
    return {
      question,
      kind: m.def.kind,
      confidence: m.confidence,
      anchors: m.anchors,
      slots,
      needsClarification: missing.length > 0,
      missingSlots: missing,
      clarificationQuestion,
      targetObjectId: null, // filled by the planner from the ask target
    };
  });
}

module.exports = { classify, hasWord };
