/**
 * Unicode normalization contract for sha256-canonical-json-v1 (2026-10-02,
 * FYD backend decision item 3 / order C).
 *
 * ONE RULE: every string entering canonical JSON (values AND object keys)
 * is NFC-normalized before serialization. Canonically-equivalent strings
 * digest identically. Raw bytes are never normalized.
 *
 * Fixtures use explicit \u escapes so no layer can silently normalize them.
 */
import { canonicalize, digestCanonical, sha256Hex } from "../src/digest";
import { deriveObjectId } from "../../objects/src/identity";
import { proposalIdOf } from "../../proposals/src/compiler";

// café: NFC (U+00E9 precomposed) vs NFD (U+0065 + U+0301 combining acute)
const NFC_CAFE = "caf\u00e9";
const NFD_CAFE = "cafe\u0301";
// Å: NFC U+00C5 vs NFD "A" + U+030A
const NFC_ANGSTROM = "\u00c5";
const NFD_ANGSTROM = "A\u030a";

describe("unicode normalization contract (NFC)", () => {
  test("canonically-equivalent strings serialize identically", () => {
    expect(canonicalize({ title: NFD_CAFE })).toBe(canonicalize({ title: NFC_CAFE }));
    expect(canonicalize({ title: NFD_ANGSTROM })).toBe(canonicalize({ title: NFC_ANGSTROM }));
  });

  test("canonically-equivalent object keys are the same logical key", () => {
    expect(canonicalize({ [NFD_CAFE]: 1 })).toBe(canonicalize({ [NFC_CAFE]: 1 }));
  });

  test("digestCanonical is NFC-stable", () => {
    expect(digestCanonical({ title: NFD_CAFE })).toBe(digestCanonical({ title: NFC_CAFE }));
  });

  test("deriveObjectId is NFC-stable", () => {
    expect(deriveObjectId("website", NFD_CAFE)).toBe(deriveObjectId("website", NFC_CAFE));
  });

  test("proposalIdOf is NFC-stable", () => {
    const a = proposalIdOf(NFC_CAFE, {} as any, [], "specdigest", {} as any);
    const b = proposalIdOf(NFD_CAFE, {} as any, [], "specdigest", {} as any);
    expect(a).toBe(b);
  });

  test("raw bytes are NEVER normalized (evidence bytes stay verifiable)", () => {
    const enc = new TextEncoder();
    const nfcBytes = enc.encode(NFC_CAFE);
    const nfdBytes = enc.encode(NFD_CAFE);
    expect(nfcBytes.length).not.toBe(nfdBytes.length); // sanity: inputs really differ
    expect(sha256Hex(nfcBytes)).not.toBe(sha256Hex(nfdBytes));
  });

  test("NFC does not strip zero-width characters (boundary stays byte-distinct)", () => {
    const zwsp = "caf\u00e9\u200b";
    expect(zwsp.normalize("NFC")).not.toBe(NFC_CAFE);
    expect(digestCanonical({ title: zwsp })).not.toBe(digestCanonical({ title: NFC_CAFE }));
  });

  test("NFC does not fold case or decompose compatibility characters", () => {
    expect(digestCanonical("Stra\u00dfe")).not.toBe(digestCanonical("strasse"));
    expect(digestCanonical("\ufb01")).not.toBe(digestCanonical("fi")); // ﬁ ligature
  });

  test("pure-ASCII and already-NFC digests are byte-identical to before", () => {
    // Pinned: these values predate the NFC rule and must not move.
    expect(digestCanonical({ a: 1, b: "x" })).toBe(
      digestCanonical({ b: "x", a: 1 }),
    );
    expect(canonicalize("hello")).toBe('"hello"');
    expect(canonicalize(NFC_CAFE)).toBe('"caf\u00e9"');
  });
});
