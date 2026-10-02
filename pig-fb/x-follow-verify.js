// x-follow-verify.js: pure post-click verification predicates for the X follow
// driver (x-follow.js). Deliberately side-effect free so it can be unit-tested
// anywhere node runs; it never touches the browser, the network, or the disk.
//
// Signal hierarchy (2026-09-29 architecture review):
//   PRIMARY: the accessibility tree shows a button named "Unfollow @<handle>".
//   SECONDARY (legacy): the DOM button label flipped to Following/Unfollow.
// A verdict of {ok:false} means genuinely not followed; the caller must log it
// as a failure, never reinterpret it as success.
'use strict';

/**
 * Search a Playwright accessibility snapshot tree for a button whose accessible
 * name is exactly "Unfollow @<handle>". Returns true on first match.
 * @param {object|null} snapshot - page.accessibility.snapshot() result (or null)
 * @param {string} handle - X handle without @
 */
function a11yShowsUnfollow(snapshot, handle) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const want = `unfollow @${String(handle).toLowerCase()}`;
  const stack = [snapshot];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (node.role === 'button' && typeof node.name === 'string' &&
        node.name.toLowerCase() === want) {
      return true;
    }
    const kids = node.children;
    if (Array.isArray(kids)) {
      for (const kid of kids) stack.push(kid);
    }
  }
  return false;
}

/**
 * Legacy DOM signal: the driver's post-click evaluate found a button with
 * data-testid "<handle>-unfollow" or innerText "Following".
 * @param {object} after - the object returned by the driver's post-click evaluate
 */
function domShowsFollowing(after) {
  return !!(after && after.following);
}

/**
 * Combine the two signals into a verdict. a11y is primary, DOM text is the
 * legacy fallback. Failure stays failure.
 * @returns {{ok:boolean, signal:'a11y'|'dom'|null}}
 */
function followVerdict({ a11yOk, domOk }) {
  if (a11yOk) return { ok: true, signal: 'a11y' };
  if (domOk) return { ok: true, signal: 'dom' };
  return { ok: false, signal: null };
}

module.exports = { a11yShowsUnfollow, domShowsFollowing, followVerdict };
