"""PROD-8: surface orphaned corrections in the customize panel. Edit 6: owner-panel.tsx"""

PATH = "/home/nolan/projects/ping/src/app/build/[siteId]/owner-panel.tsx"

src = open(PATH, encoding="utf-8").read()

# --- 1. import useEffect ---
old = 'import { useState } from "react";'
new = 'import { useEffect, useState } from "react";'
assert src.count(old) == 1, "react import anchor not found"
src = src.replace(old, new, 1)

# --- 2. orphan warning type + state ---
old = """interface Receipt {
  eventId: string | null;
  resultDigest: string;
  approvedAt: string;
  appliedPhone: string | null;
  appliedField: string | null;
}"""
new = """interface Receipt {
  eventId: string | null;
  resultDigest: string;
  approvedAt: string;
  appliedPhone: string | null;
  appliedField: string | null;
}

/**
 * PROD-8: an owner correction that is active in the journal but applies
 * to nothing in the current graph. Served by the overrides route GET;
 * the panel renders each as a warning so the owner knows the correction
 * is ineffective. The journal itself is never modified.
 */
interface OrphanedCorrectionWarning {
  target: string;
  reason: string;
  detail: string;
}"""
assert src.count(old) == 1, "receipt anchor not found"
src = src.replace(old, new, 1)

old = """  const [failure, setFailure] = useState<{ code?: string; message: string; stale: boolean } | null>(null);"""
new = """  const [failure, setFailure] = useState<{ code?: string; message: string; stale: boolean } | null>(null);
  const [orphans, setOrphans] = useState<OrphanedCorrectionWarning[]>([]);
  const [orphanError, setOrphanError] = useState<string | null>(null);"""
assert src.count(old) == 1, "state anchor not found"
src = src.replace(old, new, 1)

# --- 3. fetch the orphan check when the panel opens ---
old = """  const endpoint = "/api/fyd/objects/" + encodeURIComponent(siteId) + "/overrides";
  const busy = phase === "proposing" || phase === "approving";"""
new = """  const endpoint = "/api/fyd/objects/" + encodeURIComponent(siteId) + "/overrides";
  const busy = phase === "proposing" || phase === "approving";

  // PROD-8: when the customize panel loads, check for orphaned
  // corrections (active in the journal, applying to nothing) so the
  // owner sees a warning instead of a silently ineffective correction.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(endpoint);
        const data = (await res.json()) as {
          ok?: boolean;
          orphanedCorrections?: OrphanedCorrectionWarning[];
        };
        if (cancelled) return;
        if (data && data.ok === true && Array.isArray(data.orphanedCorrections)) {
          setOrphans(data.orphanedCorrections);
          setOrphanError(null);
        } else {
          setOrphanError("Could not check existing corrections.");
        }
      } catch (e) {
        if (!cancelled) setOrphanError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, endpoint]);"""
assert src.count(old) == 1, "endpoint anchor not found"
src = src.replace(old, new, 1)

# --- 4. render the warnings under the demo banner ---
old = """        <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          DEMO OWNER CONTEXT: changes here run as a seeded demo actor. No owner
          identity was verified. Not a production owner API.
        </p>"""
new = """        <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          DEMO OWNER CONTEXT: changes here run as a seeded demo actor. No owner
          identity was verified. Not a production owner API.
        </p>

        {orphanError ? (
          <p className="mt-3 text-xs text-neutral-500">
            Correction check unavailable: {orphanError}
          </p>
        ) : null}
        {orphans.map((o, i) => (
          <div
            key={o.target + "-" + i}
            role="alert"
            data-testid="orphan-warning"
            className="mt-3 rounded border border-amber-400 bg-amber-50 px-3 py-2"
          >
            <p className="text-sm font-semibold text-amber-900">
              A saved correction is not being applied
            </p>
            <p className="mt-1 text-sm text-amber-900">{o.detail}</p>
            <p className="mt-1 font-mono text-xs text-amber-700">
              target: {o.target} · reason: {o.reason}
            </p>
          </div>
        ))}"""
assert src.count(old) == 1, "banner anchor not found"
src = src.replace(old, new, 1)

open(PATH, "w", encoding="utf-8").write(src)
print("owner-panel.tsx edited OK")
