// ig-observation.js -- pure observation-status vocabulary for Instagram discovery.
// No dependencies: safe to load on the Pig (inside ig-discover.js) and locally
// (tests, follow-up runner). The DOM is an acquisition method, not the truth:
// a method that cannot observe posts is not evidence posts do not exist.
'use strict';

const OBS_STATUS = {
  OBSERVED_EMPTY: 'OBSERVED_EMPTY',
  OBSERVED_EXCLUDE: 'OBSERVED_EXCLUDE',
  FOLLOWUP_REQUIRED: 'FOLLOWUP_REQUIRED',
  DEPENDENCY_FAILURE: 'DEPENDENCY_FAILURE',
};

// nearMiss: build a near-miss record with explicit observation status.
function nearMiss(handle, reason, observationStatus, method) {
  return {
    account: '@' + handle,
    reason,
    observation_status: observationStatus,
    method: method || 'cdp-dom',
    observed_at: new Date().toISOString(),
  };
}

// reasonToStatus: the semantic boundary. Maps a DOM-side rejection reason to
// its observation status. "no post link found" maps to FOLLOWUP_REQUIRED
// because the current IG DOM does not render post anchors in this CDP session
// (surface drift, 2026-09-21): absence of the anchor is extraction failure,
// not evidence of an empty feed.
function reasonToStatus(reason) {
  switch (reason) {
    case 'private': return OBS_STATUS.OBSERVED_EXCLUDE;
    case 'no posts': return OBS_STATUS.OBSERVED_EMPTY;
    case 'franchise': return OBS_STATUS.OBSERVED_EXCLUDE;
    case 'non-business category': return OBS_STATUS.OBSERVED_EXCLUDE;
    case 'no business keywords in profile': return OBS_STATUS.OBSERVED_EXCLUDE;
    case 'location not Western CO': return OBS_STATUS.OBSERVED_EXCLUDE;
    case 'stale feed': return OBS_STATUS.OBSERVED_EXCLUDE;
    case 'reel without visible comments': return OBS_STATUS.OBSERVED_EXCLUDE;
    case 'promo/hiring post': return OBS_STATUS.OBSERVED_EXCLUDE;
    case 'no post link found': return OBS_STATUS.FOLLOWUP_REQUIRED;
    default: return OBS_STATUS.DEPENDENCY_FAILURE;
  }
}

module.exports = { OBS_STATUS, nearMiss, reasonToStatus };
