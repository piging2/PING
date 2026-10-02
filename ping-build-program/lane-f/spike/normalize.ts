/**
 * Lane F spike: normalization.
 *
 * ADAPTED from PING's resolve spike
 * (src/fyd/resolve/spike/normalize.ts on the Pig, /home/nolan/projects/ping).
 * Same documented choices, re-implemented here so the spike is standalone:
 * - URLs: scheme, www., query, fragment, trailing slash, and trailing
 *   punctuation artifacts are dropped. The PATH is kept: "/contact" and "/"
 *   are different strings and do NOT exact-match.
 * - Phones: digits only; a leading US country code is stripped; exactly 10
 *   digits or empty. Anything else (extensions, short codes) is UNKNOWN,
 *   never coerced.
 * - Names: lowercase, diacritics stripped, "&" -> "and", punctuation
 *   removed, legal-entity suffixes dropped (llc, inc, co, corp, ltd, pllc,
 *   pa, dba, company). No stemming: "plumbing" and "plumber" stay distinct;
 *   the fuzzy tier owns that ambiguity.
 */

export const NORMALIZER_VERSION = "lane-f-spike-v1";

const LEGAL_SUFFIXES = new Set([
  "llc", "inc", "co", "corp", "corporation", "ltd", "pllc", "pa", "dba", "company",
]);

function stripDiacritics(s: string): string {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeUrl(raw: string | null | undefined): string {
  if (!raw) return "";
  let u = raw.trim().toLowerCase();
  u = u.replace(/[;.,]+$/, "");
  u = u.replace(/^https?:\/\//, "");
  u = u.replace(/^www\./, "");
  const hash = u.indexOf("#");
  if (hash >= 0) u = u.slice(0, hash);
  const q = u.indexOf("?");
  if (q >= 0) u = u.slice(0, q);
  if (u.endsWith("/") && u.length > 1) u = u.slice(0, -1);
  return u;
}

export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : "";
}

export function normalizeName(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = stripDiacritics(raw.toLowerCase());
  s = s.replace(/&/g, " and ");
  s = s.replace(/[^a-z0-9 ]/g, " ");
  const tokens = s.split(/\s+/).filter((t) => t.length > 0 && !LEGAL_SUFFIXES.has(t));
  return tokens.join(" ");
}

/** Tokenizer for Tier 1 text retrieval. Same normalizer family, no stemming. */
export function tokenize(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let s = stripDiacritics(raw.toLowerCase());
  s = s.replace(/&/g, " and ");
  s = s.replace(/[^a-z0-9]+/g, " ");
  return s.split(" ").filter((t) => t.length > 1);
}

export function normalizeSourceIdentity(
  provider: string | null | undefined,
  providerId: string | null | undefined,
): string {
  if (!provider || !providerId) return "";
  return `${provider.trim().toLowerCase()}|${providerId.trim()}`;
}
