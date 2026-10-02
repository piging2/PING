#!/usr/bin/env node
// permitted-social fixture lab, batch 2: case-soc-50..99 (missions ACQ-1301..ACQ-1350).
// Second wave: regex edges, threshold boundaries, obfuscation that must NOT
// match literal rules, truncation interplay, and more malformed shapes.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });

// ---- benign/signal edges ----
add("case-soc-50", "extra fields ignored",
  "Unknown fields are not claims and not failures.",
  { text: "Nice day for a hike!", author: "sam", foo: 1, bar: [2] },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-51", "empty author string",
  "Author is optional; empty string is a string.",
  { text: "Nice day for a hike!", author: "" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-52", "whitespace-only text",
  "Not empty, not hostile: permitted with no signals.",
  { text: "   " },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-53", "50 USD",
  "Word-form currency matches the money rule.",
  { text: "Tune-up special, 50 USD this week" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 },
    required_signals: ["money"] });

add("case-soc-54", "dollar with space",
  "'$ 50' matches the money rule.",
  { text: "Sandwiches $ 50 for the whole crew platter" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 },
    required_signals: ["money"] });

add("case-soc-55", "expires tomorrow",
  "'expires' matches urgency framing.",
  { text: "Coupon expires tomorrow, don't forget" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 },
    required_signals: ["urgency"] });

add("case-soc-56", "expiration is not expires",
  "Word boundaries: 'expiration' must not match 'expires?'.",
  { text: "Check the expiration date on your coupon" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["urgency"] });

add("case-soc-57", "message me",
  "DM-solicit variant.",
  { text: "Message me for the wedding package details" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 },
    required_signals: ["dm-solicit"] });

add("case-soc-58", "inbox me",
  "DM-solicit variant.",
  { text: "Inbox me if you want the last slot" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 },
    required_signals: ["dm-solicit"] });

add("case-soc-59", "free gift",
  "Giveaway framing (w=2) alone stays permitted.",
  { text: "Every oil change comes with a free gift this month" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted", soc_signal_weight: 2 },
    exact_claims: { soc_signal: 1 }, required_signals: ["giveaway"] });

add("case-soc-60", "free gifts plural",
  "Boundary: 'gifts' does not match 'gift'.",
  { text: "Free gifts for all kids at the parade" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["giveaway"] });

add("case-soc-61", "win cash prize",
  "'win cash' matches giveaway framing.",
  { text: "You could win cash prize in our raffle" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted", soc_signal_weight: 2 },
    exact_claims: { soc_signal: 1 }, required_signals: ["giveaway"] });

add("case-soc-62", "cryptocurrency news",
  "Boundary: 'cryptocurrency' must not match 'crypto'.",
  { text: "Interesting cryptocurrency news today" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["crypto-mention"] });

add("case-soc-63", "exactly 10 emoji",
  "Boundary: 10 is not > 10.",
  { text: "🎉".repeat(10) },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["many-emoji"] });

add("case-soc-64", "11 emoji",
  "Boundary: 11 > 10 fires, still permitted alone.",
  { text: "🎉".repeat(11) },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 },
    required_signals: ["many-emoji"] });

add("case-soc-65", "caps exactly 50 percent",
  "Boundary probe: 10 letters, exactly 5 caps (ratio 0.50, must EXCEED 0.5).",
  { text: "AAABBccddd" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["excessive-caps"] });

add("case-soc-66", "caps 70 percent",
  "7/10 caps fires the signal, still permitted alone.",
  { text: "AAABBBcccD LOOK" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 },
    required_signals: ["excessive-caps"] });

add("case-soc-67", "two URLs count once",
  "A rule fires at most once per post; weight counts once.",
  { text: "See https://a.example and https://b.example for details" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted", soc_signal_weight: 1 },
    exact_claims: { soc_signal: 1 }, required_signals: ["has-url"] });

add("case-soc-68", "weight exactly 3 stays permitted",
  "Threshold boundary: 3 < 4.",
  { text: "See https://example.com/shop, prices from $10, DM me!" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted", soc_signal_weight: 3 },
    exact_claims: { soc_signal: 3 } });

add("case-soc-69", "weight exactly 4 via four singles",
  "dm(1)+url(1)+crypto(1)+money(1)=4: review.",
  { text: "DM me about https://example.com, bitcoin accepted, $50 min" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 4 },
    exact_claims: { soc_signal: 4 } });

add("case-soc-70", "tab-separated block phrase",
  "Whitespace-flexible rules still block.",
  { text: "DOUBLE\tYOUR\tCRYPTO with our program" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:crypto-doubling"] });

add("case-soc-71", "first block rule wins",
  "Two block phrases: the earliest-listed rule claims the signal.",
  { text: "Claim your airdrop! Also double your crypto today" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    exact_claims: { soc_signal: 1 }, required_signals: ["block:crypto-doubling"],
    absent_signals: ["block:airdrop"] });

add("case-soc-72", "block phrase cut by truncation",
  "Truncation is honest about scope: partial phrases do not block.",
  { text: "x".repeat(4985) + " double your crypto" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    required_truncated: ["text"], absent_signals: ["block:crypto-doubling"] });

add("case-soc-73", "in-scope block plus over-long tail",
  "Truncation does not hide in-scope hostile content.",
  { text: "double your crypto! " + "y".repeat(6000) },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_truncated: ["text"], required_signals: ["block:crypto-doubling"] });

add("case-soc-74", "over-long review",
  "Truncated, flagged, then classified on the visible window.",
  { text: "Win free cash! Act fast! ".repeat(300) },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review" },
    required_truncated: ["text"] });

// ---- malformed shapes ----
add("case-soc-75", "null input",
  "Null is not a post object.",
  null,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-soc-76", "undefined input",
  "Undefined is not a post object.",
  undefined,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-soc-77", "text null",
  "Null text fails the type check.",
  { text: null },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-text-type" });

add("case-soc-78", "text is an array",
  "Arrays are not text.",
  { text: ["hello"] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-text-type" });

add("case-soc-79", "numeric input",
  "Numbers are not posts.",
  42,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

// ---- obfuscation and remaining edges ----
add("case-soc-80", "leet-speak block attempt",
  "'d0uble' does not match the literal rule; heuristic crypto signal only.",
  { text: "d0uble your crypto with this trick" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    exact_claims: { soc_signal: 1 }, required_signals: ["crypto-mention"],
    absent_signals: ["block:crypto-doubling"] });

add("case-soc-81", "fullwidth block attempt",
  "Fullwidth glyphs do not match ASCII rules: no signals at all.",
  { text: "ＤＯＵＢＬＥ ＹＯＵＲ ＣＲＹＰＴＯ today" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-82", "double spaces still block",
  "Whitespace-flexible matching: 'DOUBLE  YOUR  CRYPTO' blocks.",
  { text: "DOUBLE  YOUR  CRYPTO guaranteed" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:crypto-doubling"] });

add("case-soc-83", "mixed-case verify-wallet",
  "Case-insensitive block rule.",
  { text: "Please VERIFY your WALLET to continue" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:verify-wallet"] });

add("case-soc-84", "guaranteed 5x",
  "Multiplier variant of the guaranteed-returns rule.",
  { text: "Our fund does guaranteed 5x returns yearly" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:guaranteed-returns"] });

add("case-soc-85", "send 2 bitcoin",
  "Word-form coin in the send-crypto rule.",
  { text: "Send 2 bitcoin to this address to join" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:send-crypto"] });

add("case-soc-86", "suspension with period",
  "Trailing punctuation does not save it.",
  { text: "Warning: your account will be suspended." },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:suspension-phish"] });

add("case-soc-87", "caps giveaway pressure",
  "caps(1)+giveaway(2)+urgency(2)=5: review.",
  { text: "FREE GIFT! ACT FAST, LIMITED TIME!" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 5 },
    exact_claims: { soc_signal: 3 } });

add("case-soc-88", "running club",
  "Boundary: 'running club' must not match 'running out'.",
  { text: "Running club meets Tuesdays at 6am" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["urgency"] });

add("case-soc-89", "running out of stock",
  "'running out' matches urgency framing.",
  { text: "We are running out of stock, sale ends soon" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 },
    required_signals: ["urgency"] });

add("case-soc-90", "100 dollars",
  "Word-form amount matches money.",
  { text: "100 dollars for the pair, firm price" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 },
    required_signals: ["money"] });

add("case-soc-91", "ETH price update",
  "Standalone ETH matches crypto-mention.",
  { text: "ETH price update: steady this week" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 },
    required_signals: ["crypto-mention"] });

add("case-soc-92", "bet on the game",
  "Boundary: 'bet' must not match 'btc'.",
  { text: "I bet on the game last night" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["crypto-mention"] });

add("case-soc-93", "tab in dm solicit",
  "Whitespace-flexible dm rule matches tabs.",
  { text: "DM\tme for info" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 },
    required_signals: ["dm-solicit"] });

add("case-soc-94", "kitchen sink review",
  "url(1)+money(1)+giveaway(2)+urgency(2)=6: review.",
  { text: "https://example.com/win Win free cash $500, act fast, limited time!" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 6 } });

add("case-soc-95", "kitchen sink benign",
  "Phone, mention, hashtag: no signals at all.",
  { text: "Thanks @reader! Call (970) 555-0100 #shoplocal" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-96", "uppercase scheme URL",
  "Case-insensitive URL detection; surrounding lowercase keeps caps ratio under 0.5.",
  { text: "Click here to see: HTTPS://EXAMPLE.COM/DEAL for more info today" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 },
    required_signals: ["has-url"] });

add("case-soc-97", "exactly at cap",
  "5000 chars: no truncation flag.",
  { text: "z".repeat(4999) + "!" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    truncated_absent: ["text"] });

add("case-soc-98", "block phrase at start",
  "Leading block phrase blocks immediately.",
  { text: "double your crypto now with our system" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:crypto-doubling"] });

add("case-soc-99", "emoji url money dm",
  "many-emoji(1)+url(1)+money(1)+dm(1)=4: review.",
  { text: "🎉".repeat(11) + " Sale https://example.com $20 DM me" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 4 } });

// ---- manifest: missions ACQ-1301..ACQ-1350 ----
const manifest = C.map((c, idx) => {
  const ser = JSON.stringify(c.input) ?? "undefined";
  const digest = createHash("sha256").update(ser).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1301 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: ser.length, expect: c.expect };
});
const manifestSoc2 = manifest;

export { C, manifest, manifestSoc2 };
export function getCase(id) { return C.find((c) => c.id === id); }
