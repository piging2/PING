/**
 * Lane T spike: policy evaluator.
 * Cedar-style semantics hand-rolled in pure JS: principal / action /
 * resource / context, explicit deny wins, every decision carries a reason.
 * Speaks the existing FydGrant vocabulary. No new grant strings.
 */
"use strict";

/** Absolute refusals. Deny wins over everything, including grants. */
const FORBIDDEN = {
  impersonate: "Never pose as a customer, job applicant, or any principal other than the actual viewer.",
  fabricate_contact: "Never invent, complete, or correct a phone number, email, address, or booking link. Only evidence-resolved capability values.",
  silent_mutation: "No canonical-object change without a digest-bound proposal approved by the controlling principal.",
  publish_without_approval: "site.publish is never a direct gate.",
  unsafe_link: "Contact or booking values that fail the safe-link gate are refused, never rendered.",
  stale_or_vanished: "Contact, booking, or payment candidates on stale or vanished capabilities are refused or downgraded, never silently substituted.",
  injected_value: "Contact-value slots filled from untrusted content (descriptions, reviews, post text) are refused. Only capability records fill contact slots.",
  grant_missing: "The required grant for this action is absent for this viewer.",
  not_owner: "Only the controlling identity of this object may perform owner actions.",
  anonymous_identity_action: "This action must be performed as someone. Sign in first.",
};

/** Builtin routes: governed, reversible, no capability record needed. */
const BUILTIN_DIRECT = new Set(["open", "reference", "ask", "open_website", "like", "follow", "unfollow", "unlike", "directions_link"]);

/** Intent kind -> default route template per capability kind. */
const ROUTE_FOR = {
  phone: "fyd_contact_flow",
  email: "fyd_contact_flow",
  contact_form: "deep_link",
  booking: "deep_link",
  directions: "deep_link",
  fyd_message: "proposal",
};

/** Fixed tiebreak for contact.request ranking (never a coin flip). */
const CONTACT_RANK = { phone: 1, email: 2, contact_form: 3, fyd_message: 4 };

function evidenceRank(state) {
  return { observed: 0, inferred: 1, unverified: 2, withheld: 3, unavailable: 4 }[state] ?? 5;
}

/**
 * evaluateCandidate({capability, intent, principal, grants, forbiddenEffects})
 * -> { gate: "direct"|"propose"|"refuse", reason, route }
 */
function evaluateCandidate({ capability, intent, principal, grants, forbiddenEffects }) {
  const isOwner = principal.kind === "owner";
  const kind = capability ? capability.kind : null;

  // 1. Absolute deny: forbidden effects for this viewer.
  if (capability && capability.grantRequired && forbiddenEffects.includes(capability.grantRequired)) {
    return { gate: "refuse", reason: `Refused: ${FORBIDDEN.grant_missing} (${capability.grantRequired} is forbidden for this viewer).`, route: null };
  }

  // 2. Owner intents: ownership gate before anything else.
  if (intent.kind.startsWith("owner.")) {
    if (!isOwner) {
      return { gate: "refuse", reason: `Refused: ${FORBIDDEN.not_owner}`, route: null };
    }
    if (intent.kind === "owner.publish") {
      return { gate: "propose", reason: "Publishing changes the public site. Review the exact digest before it goes live.", route: "proposal" };
    }
    return { gate: "propose", reason: "Owner changes are drafted as proposals. Nothing changes until you approve the exact digest.", route: "proposal" };
  }

  // 3. Vanished / stale capabilities.
  if (capability && capability.status === "vanished") {
    const fb = kind === "booking" ? { fallback: "contact.request" } : {};
    return { gate: "refuse", reason: `Refused: this ${kind} capability no longer resolves (last verified ${capability.lastChecked}). It was not replaced.`, route: null, ...fb };
  }
  const stale = capability && capability.status === "stale";
  if (capability && capability.evidence.state === "withheld") {
    return { gate: "refuse", reason: `Refused: the business owner hid this ${kind}.`, route: null };
  }

  // 4. Grant check for capability-bound actions.
  if (capability && capability.grantRequired && !grants.includes(capability.grantRequired)) {
    return { gate: "refuse", reason: `Refused: ${FORBIDDEN.grant_missing} Needs ${capability.grantRequired}.`, route: null };
  }

  // 5. Intent-specific gates.
  const route = kind ? ROUTE_FOR[kind] || "deep_link" : "builtin";

  switch (intent.kind) {
    case "contact.request":
    case "contact.call":
    case "contact.email": {
      if (!capability) return { gate: "refuse", reason: "Refused: no verified contact capability exists for this channel.", route: null };
      if (capability.evidence.state === "unverified" || stale) {
        return { gate: "propose", reason: `This ${kind} was last verified ${capability.lastChecked} and is ${capability.evidence.state}. Confirm before using it.`, route };
      }
      return { gate: "direct", reason: `Verified ${kind}: ${capability.evidence.receipt || "evidence on file"}.`, route };
    }
    case "visit.navigate": {
      if (!capability) return { gate: "refuse", reason: "Refused: no verified address or directions capability.", route: null };
      return { gate: "direct", reason: "Directions open the verified map link.", route };
    }
    case "booking.request": {
      if (!capability) {
        return { gate: "refuse", reason: "Refused: this business has no booking capability FYD can verify. Use the contact plan instead.", route: null, fallback: "contact.request" };
      }
      return { gate: "propose", reason: "Booking leaves FYD for the provider page. Review the request before continuing.", route };
    }
    case "quote.request": {
      // Quotes are never fabricated; route to contact.
      return { gate: "refuse", reason: "FYD does not invent prices. Route to the contact plan to ask the business directly.", route: null, fallback: "contact.request" };
    }
    case "message.business": {
      if (principal.kind === "anonymous") {
        return { gate: "refuse", reason: `Refused: ${FORBIDDEN.anonymous_identity_action}`, route: null };
      }
      return { gate: "propose", reason: "The message sends as you. Review the exact text before it goes.", route: "proposal" };
    }
    default:
      return { gate: "refuse", reason: "Refused: no policy rule covers this intent.", route: null };
  }
}

module.exports = { evaluateCandidate, FORBIDDEN, CONTACT_RANK, evidenceRank, BUILTIN_DIRECT };
