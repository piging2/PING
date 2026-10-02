// ig-disposition.js -- pure disposition logic for Instagram near-miss follow-up.
// Decides, given a near-miss record (with observation_status from ig-discover.js)
// plus instagram-cli evidence, whether a DURABLE skip entry is allowed.
// Rule: UNKNOWN > FICTION > FALSE REJECTION. Only terminal states grounded in
// real evidence may produce a permanent skip entry.
'use strict';

const STALENESS_DAYS = 120;

const DISPOSITION = {
  RECOVERED_CANDIDATE: 'RECOVERED_CANDIDATE', // verified business, fresh posts -> candidate pool
  RECOVERED_REVIEW: 'RECOVERED_REVIEW',       // passes gates but needs human/A2 review (e.g. personal acct type)
  CONFIRMED_EXCLUDE: 'CONFIRMED_EXCLUDE',     // skip-eligible: exclusion confirmed by evidence
  CONFIRMED_EMPTY: 'CONFIRMED_EMPTY',         // skip-eligible: account provably empty or gone
  STILL_UNKNOWN: 'STILL_UNKNOWN',             // NOT skip-eligible: keep in reconciliation, retry later
};

function daysAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  return ms / (24 * 3600 * 1000);
}

// decide(nearMiss, cli): nearMiss has { account, reason, observation_status }.
// cli is null when the follow-up could not run, otherwise
// { profile: {...}|null, newestPost: {url, created_at}|null, postsFailed: bool }.
function decide(nearMiss, cli) {
  const nm = nearMiss || {};
  const status = nm.observation_status;
  const account = nm.account || '?';

  // OBSERVED_EXCLUDE: the DOM affirmatively observed an exclusion criterion
  // (private, franchise, wrong geography, stale feed, promo content). This is
  // skip-eligible on DOM evidence alone; no follow-up needed.
  if (status === 'OBSERVED_EXCLUDE') {
    return { disposition: DISPOSITION.CONFIRMED_EXCLUDE, reason: nm.reason || 'dom-observed exclusion', account };
  }

  // A missing or failed follow-up can never authorize a durable skip for the
  // remaining statuses.
  if (!cli || cli.failed) {
    return { disposition: DISPOSITION.STILL_UNKNOWN, reason: 'follow-up unavailable', account };
  }
  const prof = cli.profile || null;

  // ---------- FOLLOWUP_REQUIRED: the DOM could not observe. ----------
  if (status === 'FOLLOWUP_REQUIRED') {
    if (!prof) {
      // Profile lookup returned nothing: the account may be gone, renamed, or
      // the lookup failed transiently. A failed lookup is not proof of
      // emptiness by itself; but "no such account" from the provider is the
      // closest thing to affirmative empty evidence we can get.
      if (cli.profileNotFound) return { disposition: DISPOSITION.CONFIRMED_EMPTY, reason: 'account not found via follow-up', account };
      return { disposition: DISPOSITION.STILL_UNKNOWN, reason: 'profile lookup failed', account };
    }
    if (prof.is_private) return { disposition: DISPOSITION.CONFIRMED_EXCLUDE, reason: 'private account (confirmed)', account };
    if (prof.country && prof.country !== 'US') {
      return { disposition: DISPOSITION.CONFIRMED_EXCLUDE, reason: 'wrong country: ' + prof.country, account };
    }
    const postCount = (prof.post_count == null) ? null : Number(prof.post_count);
    if (postCount === 0) return { disposition: DISPOSITION.CONFIRMED_EMPTY, reason: 'post_count 0 via follow-up', account };
    const np = cli.newestPost || null;
    if (!np) {
      // Profile metadata disagrees with the posts API (post_count > 0 but no
      // post returned). Inconclusive extraction: keep recoverable, never skip.
      if (postCount > 0 || postCount == null) {
        return { disposition: DISPOSITION.STILL_UNKNOWN, reason: 'posts API returned no items while profile shows posts', account };
      }
      return { disposition: DISPOSITION.CONFIRMED_EMPTY, reason: 'no posts observable via follow-up', account };
    }
    if (daysAgo(np.created_at) > STALENESS_DAYS) {
      return { disposition: DISPOSITION.CONFIRMED_EXCLUDE, reason: 'stale feed (newest post ' + String(np.created_at).slice(0, 10) + ')', account };
    }
    const acctType = (prof.account_type || '').toLowerCase();
    const evidence = {
      account_type: prof.account_type, country: prof.country, post_count: postCount,
      newest_post_url: np.url, newest_post_date: String(np.created_at).slice(0, 10),
      name: prof.name, bio: (prof.bio || '').slice(0, 200),
    };
    if (acctType === 'business' || acctType === 'creator') {
      return { disposition: DISPOSITION.RECOVERED_CANDIDATE, reason: 'verified business account with fresh posts', account, evidence };
    }
    // Personal-type accounts (or unknown type) that otherwise pass: do not
    // skip, do not auto-candidate; route to review.
    return { disposition: DISPOSITION.RECOVERED_REVIEW, reason: 'account_type=' + (prof.account_type || 'unknown') + ' needs review', account, evidence };
  }

  // ---------- OBSERVED_EMPTY: DOM saw a 0 post count. Confirm before skip. ----------
  if (status === 'OBSERVED_EMPTY') {
    if (!prof || cli.profileNotFound) {
      return { disposition: DISPOSITION.CONFIRMED_EMPTY, reason: 'empty confirmed: account gone or unreachable', account };
    }
    const postCount = Number(prof.post_count);
    if (postCount === 0) return { disposition: DISPOSITION.CONFIRMED_EMPTY, reason: 'post_count 0 confirmed via follow-up', account };
    if (postCount > 0) {
      // DOM count disagreed with the provider: the observation was wrong.
      return { disposition: DISPOSITION.STILL_UNKNOWN, reason: 'DOM 0-post count contradicted by follow-up', account };
    }
    return { disposition: DISPOSITION.STILL_UNKNOWN, reason: 'follow-up inconclusive', account };
  }

  // ---------- Anything else (DEPENDENCY_FAILURE, unknown): never skip. ----------
  return { disposition: DISPOSITION.STILL_UNKNOWN, reason: 'no evidence for durable decision', account };
}

// skipEligible: the single gate for writing a durable skip entry.
function skipEligible(decision) {
  return decision.disposition === DISPOSITION.CONFIRMED_EXCLUDE ||
         decision.disposition === DISPOSITION.CONFIRMED_EMPTY;
}

function isTerminal(disposition) {
  return disposition === DISPOSITION.RECOVERED_CANDIDATE ||
         disposition === DISPOSITION.CONFIRMED_EXCLUDE ||
         disposition === DISPOSITION.CONFIRMED_EMPTY;
}

// Positive-controls gate (Nolan 2026-09-24): a pass that cannot rediscover its
// known-good controls may not conclude GENUINE_EMPTY. Downgrades CONFIRMED_EMPTY
// to STILL_UNKNOWN when controls fail. Other dispositions are unaffected.
function gateDisposition(disposition, controlsPassed, priorReason) {
  if (disposition === DISPOSITION.CONFIRMED_EMPTY && controlsPassed === false) {
    return { disposition: DISPOSITION.STILL_UNKNOWN, reason: 'controls failed: empty conclusion untrusted this run' };
  }
  return { disposition, reason: priorReason || (controlsPassed ? 'controls passed' : 'no controls') };
}

module.exports = { DISPOSITION, STALENESS_DAYS, decide, skipEligible, isTerminal, gateDisposition };
