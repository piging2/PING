/**
 * Path-containment guard for identifier-derived filesystem paths.
 *
 * Several read seams resolve a caller-supplied identifier to a file under
 * an operator-controlled root (projection JSON, media manifests). Node's
 * path.join() normalizes ".." segments, so an unvalidated identifier can
 * escape the root. Every such seam must call assertSafeSiteId() BEFORE
 * joining the identifier into a path.
 *
 * The pattern is intentionally the same discipline the write stores
 * already use (claim/store.ts, object/owner-events.ts):
 * lowercase alnum + dash only, bounded length. A site id that cannot
 * match this pattern can never be a safe path segment, so refusal is
 * fail-closed, never a behavior change for legitimate ids.
 */
export const SITE_ID_PATTERN = /^[a-z0-9-]{1,64}$/;

/** Throw unless the site id is safe to embed in a filesystem path. */
export function assertSafeSiteId(siteId: string): void {
  if (!SITE_ID_PATTERN.test(siteId)) {
    throw new Error(
      `refusing to resolve a filesystem path for unsafe site id ${JSON.stringify(
        siteId,
      )}`,
    );
  }
}
