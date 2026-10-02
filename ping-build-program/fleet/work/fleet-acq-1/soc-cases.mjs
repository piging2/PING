#!/usr/bin/env node
// permitted-social fixture lab, batch 1: case-soc-0..49 (missions ACQ-1251..ACQ-1300).
// The family tests BOTH sides of the boundary: hostile content must be
// blocked/caught, and legitimate business content must NOT be over-blocked.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });

// ---- benign basics: must stay permitted ----
add("case-soc-0", "baseline happy post",
  "No signals at all.",
  { text: "Love this new coffee shop downtown! Great latte art.", author: "patron42" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-1", "post with a normal URL",
  "One heuristic signal (has-url, w=1) must not block or review.",
  { text: "New menu is up https://example.com/menu come hungry!" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-2", "all-caps excitement",
  "Caps alone are enthusiasm, not hostility.",
  { text: "SO HAPPY WITH MY NEW ROOF!! The crew was amazing!!" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-3", "emoji-heavy birthday",
  "12 emoji: many-emoji (w=1) alone stays permitted.",
  { text: "Happy birthday!! 🎂🎉🎈🎁🥳🎊🍰🧁🍦🍩🍪🥂" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-4", "legitimate giveaway without pressure",
  "Giveaway framing (w=2) with no urgency/money stays permitted.",
  { text: "We're doing a giveaway! Follow and tag a friend to enter. Winner picked Friday." },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-5", "business promo with price",
  "Money signal (w=1) alone stays permitted.",
  { text: "Oil change $49.99 this week only at Main St Auto. Walk-ins welcome!" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-6", "dm solicitation from a business",
  "dm-solicit (w=1) alone stays permitted.",
  { text: "DM me for the full price list and availability this month." },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-7", "post with phone number",
  "Phone numbers are not a hostile signal.",
  { text: "Call us at (970) 589-3309 for same-day service!" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-8", "free estimate",
  "'Free estimate' is not giveaway framing.",
  { text: "We offer free estimates on all roofing jobs. No obligation." },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-9", "mild urgency alone",
  "'Call now' urgency (w=2) alone stays permitted.",
  { text: "Call now! This limited time deal ends Friday, book your spring tune-up slot!" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-10", "crypto mention benign",
  "Crypto mention (w=1) alone stays permitted.",
  { text: "I bought some bitcoin back in 2020 and forgot about it." },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

// ---- blocked: explicit hostile phrases ----
add("case-soc-11", "crypto doubling scam",
  "Block rule fires; no guessing needed.",
  { text: "DOUBLE YOUR CRYPTO! Send 1 BTC to 1AbC... and get 2 back GUARANTEED!" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:crypto-doubling"] });

add("case-soc-12", "suspension phishing",
  "Threat-based phishing phrasing blocks.",
  { text: "Your account will be suspended in 24 hours. Verify now at http://bit.ly/xyz" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:suspension-phish"] });

add("case-soc-13", "airdrop phishing",
  "Airdrop claim phrasing blocks.",
  { text: "Claim your airdrop before it expires! Connect your wallet to receive 500 tokens." },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:airdrop"] });

add("case-soc-14", "guaranteed returns scam",
  "Multiplier-guarantee phrasing blocks.",
  { text: "This token will do guaranteed 10x returns this month. Send wallet address to join." },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:guaranteed-returns"] });

add("case-soc-15", "wallet verification phishing",
  "Wallet-verify phrasing blocks.",
  { text: "To receive your prize you must verify your wallet on our secure portal." },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:verify-wallet"] });

// ---- needs-review: heuristic weight, never asserted hostile ----
add("case-soc-16", "scam-shaped giveaway",
  "giveaway(2)+money(1)+dm(1)=4 >= 4: review, not blocked. (Caps ratio 0.46, below the 0.5 line, so no caps signal.)",
  { text: "GIVEAWAY! FREE $500 NOW! DM me immediately to claim!!!" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 4 } });

add("case-soc-17", "pressure + free cash",
  "urgency(2)+money(1)+giveaway(2)=5: review.",
  { text: "Act fast! $1000 free cash! Limited time offer, don't miss out!" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 5 } });

add("case-soc-18", "shouty deal with link and deadline",
  "url(1)+money(1)+urgency(2)=4: review. (Caps ratio 0.43: the URL's lowercase letters dilute it below 0.5, so no caps signal.)",
  { text: "AMAZING DEAL https://deals.example/x $99 ONLY TODAY, today only!!" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 4 } });

// ---- malformed input: typed failures ----
add("case-soc-19", "empty text",
  "Empty posts carry no classifiable content.",
  { text: "" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-text" });

add("case-soc-20", "missing text field",
  "Input shape violation.",
  { author: "someone" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-text-type" });

add("case-soc-21", "text not a string",
  "Type violation, not a guess.",
  { text: 12345 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-text-type" });

add("case-soc-22", "non-object input",
  "Arrays are not posts.",
  ["not", "a", "post"],
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-soc-23", "author not a string",
  "Author type violation.",
  { text: "Fine post", author: 7 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-author-type" });

// ---- benign edges that must not be over-blocked ----
add("case-soc-24", "block phrase as substring",
  "Word boundaries: 'adouble your cryptox' is not the phrase.",
  { text: "I saw a site called adouble your cryptox which was weird." },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    absent_signals: ["block:crypto-doubling"] });

add("case-soc-25", "mixed-case block phrase",
  "Case-insensitive matching still blocks.",
  { text: "DoUbLe YoUr CrYpTo with our new program today" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:crypto-doubling"] });

add("case-soc-26", "send-crypto phrasing",
  "'Send 0.5 ETH' matches the send-crypto rule.",
  { text: "Send 0.5 ETH to 0xABC and receive double tokens back" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:send-crypto"] });

add("case-soc-27", "url plus price stays permitted",
  "has-url(1)+money(1)=2 < 4: a normal business post.",
  { text: "New menu https://example.com/menu starting at $9.99" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 2 } });

add("case-soc-28", "hashtags and mentions",
  "No signals fire.",
  { text: "Thanks @mainstauto for the great work! #shoplocal #grandjunction" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-29", "spanish text",
  "Non-english benign content stays permitted.",
  { text: "¡Gran servicio! Muy recomendado, llegaron a tiempo." },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" } });

add("case-soc-30", "multiline post",
  "Newlines are formatting, not signals.",
  { text: "Sunday service times:\n9am and 11am\nSee you there!" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-31", "emoji-only post",
  "20 emoji: many-emoji (w=1) alone stays permitted.",
  { text: "🎂🎉🎈🎁🥳🎊🍰🧁🍦🍩🍪🥂🎂🎉🎈🎁🥳🎊🍰🧁" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-32", "ceo-fraud shape",
  "money(1)+urgency(2)=3 < 4: suspicious but under threshold, permitted.",
  { text: "Wire $5000 urgently, boss needs it today" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 2 } });

add("case-soc-33", "giveaway plus pressure",
  "giveaway(2)+urgency(2)=4: threshold reached, review.",
  { text: "Big giveaway! Act fast, entries close tonight!" },
  { outcome: "bounded_success", claims: { soc_verdict: "needs-review", soc_signal_weight: 4 } });

add("case-soc-34", "exactly 5000 chars",
  "Boundary: at the cap, no truncation, classified.",
  { text: "a".repeat(4990) + " fine post" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    truncated_absent: ["text"] });

add("case-soc-35", "5001 chars truncated",
  "Over the cap: truncated, flagged, then classified.",
  { text: "b".repeat(5001) },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    required_truncated: ["text"] });

add("case-soc-36", "truncated tail cannot create a block",
  "Block phrase beyond the cap is not seen: truncation is honest about scope.",
  { text: "c".repeat(4990) + " double your crypto scam here" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" },
    required_truncated: ["text"], absent_signals: ["block:crypto-doubling"] });

add("case-soc-37", "limited time offer alone",
  "urgency(2) alone stays permitted.",
  { text: "Limited time offer on snow tires, ends Sunday." },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-38", "question to followers",
  "No signals.",
  { text: "What's your favorite pizza topping? Asking for a friend." },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-39", "business hours update",
  "No signals.",
  { text: "Holiday hours: closed Dec 25, open 9-5 Dec 26." },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-40", "review request",
  "No signals.",
  { text: "Had a great experience? Leave us a review, it really helps!" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-41", "job posting",
  "Hiring posts are normal business content.",
  { text: "We're hiring! Full-time tech wanted. DM me for details." },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-42", "price list post",
  "money(1) alone stays permitted.",
  { text: "Haircut $25, color $80, kids $15. Book online!" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-43", "event announcement",
  "No signals.",
  { text: "Join us Saturday for the downtown parade, 10am start on Main St." },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 0 } });

add("case-soc-44", "crypto analysis post",
  "crypto(1)+urgency(2)=3 < 4: permitted.",
  { text: "Bitcoin is crashing, act fast to read my analysis before the close" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 2 } });

add("case-soc-45", "win money phrasing",
  "giveaway(2) alone stays permitted.",
  { text: "Win money in our monthly drawing, no purchase necessary." },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-46", "dm plus url",
  "dm(1)+url(1)=2 < 4: permitted.",
  { text: "Full catalog https://example.com/shop, DM me with questions!" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 2 } });

add("case-soc-47", "caps plus url",
  "caps(1)+url(1)=2 < 4: permitted.",
  { text: "CHECK OUT OUR NEW SITE https://example.com, IT LOOKS GREAT" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 2 } });

add("case-soc-48", "kitchen sink benign",
  "url(1)+emoji(0, only 5)+mention(0): weight 1, permitted.",
  { text: "New blog post https://example.com/blog 🎉 Thanks @reader for the tip! #news" },
  { outcome: "bounded_success", claims: { soc_verdict: "permitted" }, exact_claims: { soc_signal: 1 } });

add("case-soc-49", "kitchen sink hostile",
  "Block rule wins even with benign signals present.",
  { text: "FREE $1000 giveaway https://x.example claim your airdrop now!!!" },
  { outcome: "bounded_success", claims: { soc_verdict: "blocked" },
    required_signals: ["block:airdrop"] });

// ---- manifest: missions ACQ-1251..ACQ-1300 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1251 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: JSON.stringify(c.input).length, expect: c.expect };
});
const manifestSoc = manifest;

export { C, manifest, manifestSoc };
export function getCase(id) { return C.find((c) => c.id === id); }
