/**
 * One-expanded coordination for the object layer.
 *
 * Module-level on purpose: every expandable on the page (margin circle,
 * cluster popover, mobile sheet card) shares the rule no matter where it
 * renders. Claim ids are plain strings: object ids for objects,
 * "cluster:<id>" for cluster popovers, "sheet" for the mobile sheet.
 * Generic; no per-object logic.
 */

type Listener = (activeId: string | null) => void;

const listeners = new Set<Listener>();
let activeId: string | null = null;

/** Claim the expanded slot (or pass null to release it). Collapses others. */
export function claimExpanded(id: string | null): void {
  activeId = id;
  listeners.forEach((fn) => fn(id));
}

export function subscribeExpanded(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function currentExpandedId(): string | null {
  return activeId;
}
