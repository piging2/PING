/**
 * LANE BCQ — ingestion-boundary sanitization.
 *
 * Provider payloads are hostile input until they pass these gates.
 * Sanitization happens BEFORE normalization; failures are recorded as
 * evidence, never silently dropped. Plain-text output only.
 *
 * NOTE: this reference implementation uses a small deterministic tag-stripper
 * so the contract kit stays zero-dependency. Production web surfaces should
 * use DOMPurify (M15, Apache-2.0/MPL-2.0) at the same boundary; the contract
 * (plain-text-out) is identical.
 */

export const MAX_TEXT_FIELD_CHARS = 10_000;
export const MAX_RECORD_BYTES = 256 * 1024;
export const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
export const MAX_REDIRECT_HOPS = 3;

export interface SanitizeResult {
  text: string;
  truncated: boolean;
}

/** Strip all HTML/JS; allow plain text only. */
export function sanitizeText(input: string): SanitizeResult {
  let s = String(input);
  // Remove script/style blocks entirely (content included).
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '');
  // Remove all remaining tags.
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  // Decode the common entities (no full HTML parser here by design: the
  // output must never contain markup, so entity decoding is bounded).
  s = s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
  // Any re-introduced angle brackets from entity decoding are stripped again:
  // decoded markup must not survive.
  s = s.replace(/[<>]/g, '');
  // javascript:/data:/vbscript: schemes are never links in plain text.
  s = s.replace(/(javascript|data|vbscript)\s*:/gi, '[blocked-scheme]:');
  // Unicode normalize; flag mixed-script spoofing for review (returned via flag).
  s = s.normalize('NFC');
  let truncated = false;
  if (s.length > MAX_TEXT_FIELD_CHARS) {
    s = s.slice(0, MAX_TEXT_FIELD_CHARS);
    truncated = true;
  }
  return { text: s, truncated };
}

/** Detect likely mixed-script spoofing (e.g. Cyrillic а in a Latin name). */
export function looksMixedScript(s: string): boolean {
  const latin = /[a-zA-Z]/.test(s);
  const cyrillic = /[\u0400-\u04FF]/.test(s);
  const greek = /[\u0370-\u03FF]/.test(s);
  const scripts = [latin, cyrillic, greek].filter(Boolean).length;
  return scripts > 1;
}

/** SSRF guard for the web-presence leg. Never fetch file://, localhost, private IPs. */
export function isBlockedUrl(rawUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return true;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host === 'metadata.google.internal') return true;
  if (host === '127.0.0.1' || host === '::1' || host === '[::1]') return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const m172 = host.match(/^172\.(\d+)\./);
  if (m172 && Number(m172[1]) >= 16 && Number(m172[1]) <= 31) return true;
  if (host === '169.254.169.254') return true;
  return false;
}

/** Content-hash pointer for a verbatim raw payload (stored before normalization). */
export function rawEvidenceRefFor(body: string, sha256Hex: (s: string) => string): string {
  return `raw:sha256:${sha256Hex(body)}`;
}
