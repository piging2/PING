#!/usr/bin/env node
// permitted-social fixture lab, batch 3: case-soc-100..149 (missions ACQ-1351..ACQ-1400).
// Final wave: block-rule position independence, rule-order precedence, newline
// handling inside phrases, morphology edges, claim-shape invariants, and the
// last malformed shapes.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });

add("case-soc-100", "block phrase deep in benign text",
  "Block rules are position-independent.",
  { text: "Hi all, just sharing my morning routine: coffee, walk, journal. Oh and double your crypto with our program, totally legit. Anyway have a great day!" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:crypto-doubling"] });

add("case-soc-101", "block phrase repeated",
  "A block rule claims one signal even when matched twice.",
  { text: "Double your crypto! Double your crypto! Don't miss out!" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    exact_claims: { soc_signal: 1 }, required_signals: ["block:crypto-doubling"] });

add("case-soc-102", "rule-list order beats text order",
  "Precedence is by BLOCK_RULES list order, not by position in text.",
  { text: "First verify your wallet, then double your crypto gains" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    exact_claims: { soc_signal: 1 }, required_signals: ["block:crypto-doubling"],
    absent_signals: ["block:verify-wallet"] });

add("case-soc-103", "blocked emits no weight claim",
  "The harness returns before heuristic weighing on block.",
  { text: "Double your crypto now" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    absent_claims: ["soc_signal_weight"] });

add("case-soc-104", "block phrase across newline",
  "Whitespace-flexible rules span newlines.",
  { text: "double\nyour\ncrypto today" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:crypto-doubling"] });

add("case-soc-105", "block phrase across CRLF",
  "Whitespace-flexible rules span CRLF.",
  { text: "claim your\r\nairdrop now" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:airdrop"] });

add("case-soc-106", "doubles your crypto",
  "'doubles' needs a real word break: no block, heuristic crypto only.",
  { text: "He doubles your crypto holdings every year" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    exact_claims: { soc_signal: 1 }, required_signals: ["crypto-mention"],
    absent_signals: ["block:crypto-doubling"] });

add("case-soc-107", "undoubled your crypto",
  "Embedded 'double' without a break: no block.",
  { text: "My undoubled your crypto meme went viral" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    exact_claims: { soc_signal: 1 }, required_signals: ["crypto-mention"],
    absent_signals: ["block:crypto-doubling"] });

add("case-soc-108", "block phrase hyphenated in URL",
  "Hyphens are not whitespace for the block rule, but 'crypto' is still a standalone word for the heuristic: has-url(1)+crypto-mention(1)=2, permitted.",
  { text: "Read https://example.com/double-your-crypto for the story" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted", soc_signal_weight: 2 },
    exact_claims: { soc_signal: 2 }, required_signals: ["has-url", "crypto-mention"],
    absent_signals: ["block:crypto-doubling"] });

add("case-soc-109", "high weight plus block phrase",
  "Block precedence: explicit phrases outrank heuristic weight.",
  { text: "FREE $1000 GIVEAWAY DM me now https://x.example claim your airdrop!!!" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:airdrop"] });

add("case-soc-110", "freedom fries",
  "'freedom' is not 'free' + space.",
  { text: "Freedom fries are back on the menu" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["giveaway"] });

add("case-soc-111", "gifted a friend",
  "'gifted' has no word boundary after 'gift'.",
  { text: "I gifted a friend my old bike" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["giveaway"] });

add("case-soc-112", "DMme no space",
  "The dm rule needs whitespace before 'me'.",
  { text: "DMme for the secret menu" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["dm-solicit"] });

add("case-soc-113", "SEND 3 ETH NOW",
  "Uppercase send-crypto rule.",
  { text: "SEND 3 ETH NOW to participate" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:send-crypto"] });

add("case-soc-114", "guaranteed 100x",
  "Large multiplier variant.",
  { text: "This does guaranteed 100x, trust me" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:guaranteed-returns"] });

add("case-soc-115", "win cash plus limited time",
  "giveaway(2)+urgency(2)=4: review.",
  { text: "Win cash now, this is a limited time thing" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 4 },
    exact_claims: { soc_signal: 2 } });

add("case-soc-116", "giveaway ends Sunday",
  "giveaway(2) alone stays permitted.",
  { text: "Our giveaway ends Sunday, enter in store" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted", soc_signal_weight: 2 },
    exact_claims: { soc_signal: 1 } });

add("case-soc-117", "author null",
  "Null author fails the type check.",
  { text: "Fine post", author: null },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-author-type" });

add("case-soc-118", "author is an array",
  "Array author fails the type check.",
  { text: "Fine post", author: ["x"] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-author-type" });

add("case-soc-119", "string input",
  "A bare string is not a post object.",
  "hello",
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-soc-120", "boolean input",
  "A boolean is not a post object.",
  true,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-soc-121", "text that is only a URL",
  "One signal, still permitted.",
  { text: "https://example.com" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    exact_claims: { soc_signal: 1 }, required_signals: ["has-url"] });

add("case-soc-122", "block phrase at the far edge of the cap",
  "In-scope hostile content at char 4980 still blocks; no truncation flag.",
  { text: "x".repeat(4980) + "double your crypto!!" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:crypto-doubling"], truncated_absent: ["text"] });

add("case-soc-123", "soc_format on permitted",
  "The format claim is always present.",
  { text: "Just a normal Tuesday post" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted", soc_format: "social-post" } });

add("case-soc-124", "soc_format on blocked",
  "The format claim precedes the block verdict.",
  { text: "Double your crypto now" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked", soc_format: "social-post" } });

add("case-soc-125", "soc_format on review",
  "The format claim precedes the review verdict.",
  { text: "Act fast! $1000 free cash! Limited time!" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_format: "social-post" } });

add("case-soc-126", "four singles reach threshold",
  "many-emoji(1)+caps(1)+url(1)+money(1)=4: review.",
  { text: "🎉".repeat(11) + " SALE! https://E.CO $20" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 4 },
    exact_claims: { soc_signal: 4 } });

add("case-soc-127", "very long author",
  "Author length does not affect classification.",
  { text: "Normal post here", author: "a".repeat(5000) },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-128", "non-ascii author",
  "Unicode author names are fine.",
  { text: "Normal post here", author: "José García" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-129", "whitespace with newline and tab",
  "Still just whitespace: permitted, no signals.",
  { text: " \n\t " },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-130", "act fast win money expires",
  "urgency(2, once)+giveaway(2)=4: review.",
  { text: "Act fast! Win money today, expires soon" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 4 },
    exact_claims: { soc_signal: 2 } });

add("case-soc-131", "money url small emoji",
  "money(1)+url(1)=2 < 4: permitted; 2 emoji under threshold.",
  { text: "Lunch $12 https://e.co/menu 🎉🎉" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted", soc_signal_weight: 2 },
    exact_claims: { soc_signal: 2 } });

add("case-soc-132", "airdrop with extra spaces",
  "Whitespace-flexible airdrop rule.",
  { text: "claim  your   airdrop today" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:airdrop"] });

add("case-soc-133", "suspension across newlines",
  "Whitespace-flexible suspension rule.",
  { text: "Warning: your account\nwill be\nsuspended" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:suspension-phish"] });

add("case-soc-134", "today only alone",
  "urgency(2) alone stays permitted.",
  { text: "Sale ends today only at our store" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    exact_claims: { soc_signal: 1 }, required_signals: ["urgency"] });

add("case-soc-135", "author zero",
  "Numeric author fails the type check.",
  { text: "x", author: 0 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-author-type" });

add("case-soc-136", "text boolean",
  "Boolean text fails the type check.",
  { text: true },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-text-type" });

add("case-soc-137", "ETH/BTC pair",
  "Standalone coin tickers match crypto-mention once.",
  { text: "The ETH/BTC pair is volatile" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    exact_claims: { soc_signal: 1 }, required_signals: ["crypto-mention"] });

add("case-soc-138", "dm to win free cash",
  "dm(1)+giveaway(2)+money(1)=4: review.",
  { text: "DM me to win free cash $100" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 4 },
    exact_claims: { soc_signal: 3 } });

add("case-soc-139", "short shout",
  "Under the 10-letter minimum: no caps signal.",
  { text: "WOW!" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["excessive-caps"] });

add("case-soc-140", "verify wallet extra spaces",
  "Whitespace-flexible verify-wallet rule.",
  { text: "Please verify   your    wallet now" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:verify-wallet"] });

add("case-soc-141", "10x engineers",
  "Multiplier without 'guaranteed' is not the rule.",
  { text: "We hire 10x engineers only" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["block:guaranteed-returns"] });

add("case-soc-142", "free prize dm url shout",
  "giveaway(2)+url(1)+caps(1)=4: review.",
  { text: "FREE PRIZE! DM NOW! https://e.co/win" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 4 },
    exact_claims: { soc_signal: 3 } });

add("case-soc-143", "4999 chars benign",
  "Under the cap: no truncation flag.",
  { text: "q".repeat(4999) },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    truncated_absent: ["text"] });

add("case-soc-144", "author false",
  "Boolean author fails the type check.",
  { text: "fine", author: false },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-author-type" });

add("case-soc-145", "send 10 crypto",
  "Count + generic coin in the send-crypto rule.",
  { text: "Send 10 crypto to join the pool" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:send-crypto"] });

add("case-soc-146", "crypto winter",
  "Crypto mention alone stays permitted.",
  { text: "Crypto winter is coming, bundle up" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    exact_claims: { soc_signal: 1 }, required_signals: ["crypto-mention"] });

add("case-soc-147", "urgent money dm",
  "money(1)+urgency(2)+dm(1)=4: review.",
  { text: "$500 urgent, DM me ASAP" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 4 },
    exact_claims: { soc_signal: 3 } });

add("case-soc-148", "reply ASAP",
  "'ASAP' is not a documented urgency phrase.",
  { text: "Reply ASAP please" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 },
    absent_signals: ["urgency"] });

add("case-soc-149", "final hostile sink",
  "Block rule wins over every heuristic signal present.",
  { text: "🎉".repeat(15) + " DOUBLE YOUR CRYPTO https://evil.example send 1 btc $999 DM me act fast" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:crypto-doubling"], absent_claims: ["soc_signal_weight"] });

// ---- manifest: missions ACQ-1351..ACQ-1400 ----
const manifest = C.map((c, idx) => {
  const ser = JSON.stringify(c.input) ?? "undefined";
  const digest = createHash("sha256").update(ser).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1351 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: ser.length, expect: c.expect };
});
const manifestSoc3 = manifest;

export { C, manifest, manifestSoc3 };
export function getCase(id) { return C.find((c) => c.id === id); }
