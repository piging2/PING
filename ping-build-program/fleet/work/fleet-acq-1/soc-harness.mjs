#!/usr/bin/env node
// soc-harness.mjs — permitted-social boundary lab.
//
// A deterministic social-post classifier. Doctrine:
// - NEVER turn parser guess into fact. "blocked" fires only on documented
//   explicit hostile phrases. Heuristic signals never assert hostility;
//   they add weight, and weight >= threshold yields "needs-review".
// - Legitimate business content (links, prices, phone numbers, mild urgency,
//   emojis, giveaways without pressure) must stay "permitted": over-blocking
//   is a boundary failure too.
// - Malformed input gets typed lane-K INVALID_PAYLOAD. Over-long text is
//   truncated and flagged (lane-D), then classified.
export const SOC_PARSER_VERSION = "soc-harness/1.0.0";

const S_LIMITS = {
  maxTextChars: 5000,
};

// Block rules: explicit hostile phrases. A match BLOCKS (high confidence,
// documented). Case-insensitive, word-boundaried.
const BLOCK_RULES = [
  { id: "block:crypto-doubling", re: /double\s+your\s+(crypto|bitcoin|btc|ethereum|eth)\b/i,
    why: "explicit crypto-doubling scam phrasing" },
  { id: "block:send-crypto", re: /\bsend\s+\d[\d.]*\s*(btc|bitcoin|eth|ethereum|crypto)\b/i,
    why: "explicit instruction to send crypto" },
  { id: "block:guaranteed-returns", re: /\bguaranteed\s+\d+\s*x\b/i,
    why: "guaranteed multiplier returns (investment scam marker)" },
  { id: "block:verify-wallet", re: /\bverify\s+your\s+wallet\b/i,
    why: "wallet-verification phishing phrasing" },
  { id: "block:airdrop", re: /\bclaim\s+your\s+airdrop\b/i,
    why: "airdrop-claim phishing phrasing" },
  { id: "block:suspension-phish", re: /\baccount\s+will\s+be\s+suspended\b/i,
    why: "suspension-threat phishing phrasing" },
];

// Suspicious signals: heuristic weights. Never block alone; weight >=
// REVIEW_THRESHOLD yields needs-review (quarantine, not a verdict).
const SIGNAL_RULES = [
  { id: "has-url", w: 1, re: /https?:\/\/\S+/i, why: "contains a URL" },
  { id: "excessive-caps", w: 1, test: (t) => { const l = t.replace(/[^A-Za-z]/g, ""); return l.length >= 10 && l.replace(/[^A-Z]/g, "").length / l.length > 0.5; }, why: ">50% capital letters" },
  { id: "many-emoji", w: 1, test: (t) => (t.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu) || []).length > 10, why: ">10 emoji" },
  { id: "money", w: 1, re: /\$\s?\d|\b\d+\s?(usd|dollars)\b/i, why: "mentions money amounts" },
  { id: "dm-solicit", w: 1, re: /\b(dm|message|inbox)\s+me\b/i, why: "solicits private messages" },
  { id: "crypto-mention", w: 1, re: /\b(bitcoin|btc|ethereum|eth|crypto)\b/i, why: "mentions crypto" },
  { id: "giveaway", w: 2, re: /\bgiveaway\b|\bfree\s+(money|cash|prize|gift)\b|\bwin\s+(money|cash)\b/i, why: "giveaway / free-money framing" },
  { id: "urgency", w: 2, re: /\bact\s+fast\b|\blimited\s+time\b|\btoday\s+only\b|\bexpires?\b|\burgent\w*\b|\brunning\s+out\b/i, why: "pressure/urgency framing" },
];
const REVIEW_THRESHOLD = 4;

function runSocCase(input, sourceRef) {
  const R = { outcome: "bounded_success", claims: [], quarantined: [], truncated: {}, failure: null };
  const put = (field, value, locator) =>
    R.claims.push({ field, value, provenance: [{ source: "post-bytes", locator }], parser: SOC_PARSER_VERSION });
  const fail = (signal, detail) => ({
    outcome: "typed_failure", claims: [], quarantined: [], truncated: {},
    failure: {
      record_type: "ping.connector.failure.v1",
      class: "INVALID_PAYLOAD", retryable: false, terminal: true,
      provider_signal: { native_code: signal, detail: String(detail).slice(0, 500) },
      evidence_refs: [sourceRef],
    },
  });

  if (!input || typeof input !== "object" || Array.isArray(input))
    return fail("not-an-object", "input must be an object with a text field");
  const { text, author } = input;
  if (typeof text !== "string") return fail("bad-text-type", "text must be a string");
  if (author !== undefined && typeof author !== "string") return fail("bad-author-type", "author must be a string");
  if (text.length === 0) return fail("empty-text", "empty posts carry no classifiable content");

  let t = text;
  if (t.length > S_LIMITS.maxTextChars) {
    t = t.slice(0, S_LIMITS.maxTextChars);
    R.truncated.text = true;
  }

  put("soc_format", "social-post", "input shape {text, author?}");

  // Block rules first: explicit hostile phrasing.
  for (const r of BLOCK_RULES) {
    if (r.re.test(t)) {
      put("soc_signal", r.id, `rule ${r.id}: ${r.why}`);
      put("soc_verdict", "blocked", `rule ${r.id} matched; no heuristic guessing involved`);
      return R;
    }
  }

  // Heuristic signals: weighed, never decisive alone.
  let weight = 0;
  for (const s of SIGNAL_RULES) {
    const hit = s.re ? s.re.test(t) : s.test(t);
    if (hit) {
      put("soc_signal", s.id, `rule ${s.id} (w=${s.w}): ${s.why}`);
      weight += s.w;
    }
  }
  put("soc_signal_weight", weight, `sum of matched heuristic weights (threshold ${REVIEW_THRESHOLD})`);
  put("soc_verdict", weight >= REVIEW_THRESHOLD ? "needs-review" : "permitted",
    weight >= REVIEW_THRESHOLD
      ? `weight ${weight} >= ${REVIEW_THRESHOLD}: quarantined for human review, hostility NOT asserted`
      : `weight ${weight} < ${REVIEW_THRESHOLD}: no block phrases, low heuristic weight`);
  return R;
}

export { runSocCase };
