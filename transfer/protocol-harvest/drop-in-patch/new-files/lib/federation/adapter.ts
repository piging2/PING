// lib/federation/adapter.ts
//
// ActivityPubProjectionAdapter: PING canonical object graph -> ActivityStreams.
//
// This module is pure projection logic. It reads validated PING projections
// and returns Fedify vocabulary objects. It performs NO I/O, writes NO
// canonical state, and holds NO keys. The single security-critical function
// here is the publicity gate: only PUBLIC objects project. Review it first.
//
// PING schema -> ActivityStreams map (full table in fedify-adapter-design.md):
//   ping.social.profile@1 (person) -> Person
//   ping.business.profile@1        -> Service (future; gate defaults off)
//   ping.social.post@1 (PUBLIC)    -> Note, wrapped in Create/Update/Delete
//   follows/active relationship    -> Accept(Follow)   (after canonical accept)
//   likes/active relationship      -> Like

import { Temporal } from "@js-temporal/polyfill";
import type { Context } from "@fedify/fedify";
import {
  Accept,
  Create,
  Delete,
  Follow,
  Image,
  Note,
  Person,
  Service,
  Update,
} from "@fedify/vocab";
import type { PINGProfile } from "./profile-source";

export const ACTIVITY_STREAMS_PUBLIC = new URL(
  "https://www.w3.org/ns/activitystreams#Public",
);

/** The key pairs Fedify serves for an actor (RSA + Ed25519 transport keys). */
export type ActorKeyPairs = Awaited<
  ReturnType<Context<void>["getActorKeyPairs"]>
>;

/**
 * Publicity gate. The ONLY condition under which a PING profile projects to
 * a federated actor. PRIVATE and PING_ONLY never project. federate defaults
 * to false, so every identity is dark to the fediverse until explicitly
 * opted in. Revoked identities do not project as actors (the dispatcher
 * returns a Tombstone for those instead).
 */
export function isProjectable(profile: PINGProfile): boolean {
  return (
    profile.status === "active" &&
    profile.visibility === "PUBLIC" &&
    profile.federate === true
  );
}

function baseActorFields(
  ctx: Context<void>,
  identifier: string,
  profile: PINGProfile,
  keys: ActorKeyPairs,
) {
  return {
    id: ctx.getActorUri(identifier),
    preferredUsername: identifier,
    name: profile.displayName,
    summary: profile.bio,
    inbox: ctx.getInboxUri(identifier),
    outbox: ctx.getOutboxUri(identifier),
    followers: ctx.getFollowersUri(identifier),
    following: ctx.getFollowingUri(identifier),
    liked: ctx.getLikedUri(identifier),
    publicKey: keys[0]?.cryptographicKey ?? null,
    assertionMethods: keys.map((k) => k.multikey),
    ...(profile.avatarUrl
      ? { icon: new Image({ url: new URL(profile.avatarUrl) }) }
      : {}),
    ...(profile.profileUrl ? { url: new URL(profile.profileUrl) } : {}),
  };
}

/** Project a PING person profile to an ActivityStreams Person actor. */
export function projectPersonActor(
  ctx: Context<void>,
  identifier: string,
  profile: PINGProfile,
  keys: ActorKeyPairs,
): Person {
  return new Person(baseActorFields(ctx, identifier, profile, keys));
}

/** Project a PING business node to an ActivityStreams Service actor. */
export function projectServiceActor(
  ctx: Context<void>,
  identifier: string,
  profile: PINGProfile,
  keys: ActorKeyPairs,
): Service {
  return new Service(baseActorFields(ctx, identifier, profile, keys));
}

// ---------------------------------------------------------------------------
// Outbound object projection (used by Lane B's projection worker via
// ctx.sendActivity; included here so the mapping is reviewed in one place).
// ---------------------------------------------------------------------------

export interface PINGPostProjection {
  id: string; // canonical PING object id
  authorIdentifier: string;
  content: string;
  publishedAt: string; // ISO date-time
  visibility: "PUBLIC" | "PRIVATE" | "PING_ONLY";
  inReplyToObjectId?: string;
}

function postNoteId(origin: string, post: PINGPostProjection): URL {
  return new URL(`${origin}/objects/${encodeURIComponent(post.id)}`);
}

/**
 * Project a PING post to Create(Note). Returns null for non-PUBLIC posts:
 * the publicity gate for objects. Callers must treat null as "do not send".
 */
export function projectPostCreate(
  ctx: Context<void>,
  origin: string,
  post: PINGPostProjection,
): Create | null {
  if (post.visibility !== "PUBLIC") return null;
  const actorUri = ctx.getActorUri(post.authorIdentifier);
  const noteFields: Record<string, unknown> = {
    id: postNoteId(origin, post),
    attributedTo: actorUri,
    content: post.content,
    published: Temporal.Instant.from(post.publishedAt),
    to: ACTIVITY_STREAMS_PUBLIC,
    cc: ctx.getFollowersUri(post.authorIdentifier),
  };
  if (post.inReplyToObjectId) {
    noteFields["inReplyTo"] = new URL(
      `${origin}/objects/${encodeURIComponent(post.inReplyToObjectId)}`,
    );
  }
  const note = new Note(noteFields);
  return new Create({
    id: new URL(`${origin}/activities/${encodeURIComponent(post.id)}/create`),
    actor: actorUri,
    object: note,
    to: ACTIVITY_STREAMS_PUBLIC,
    cc: ctx.getFollowersUri(post.authorIdentifier),
  });
}

/** Project a post edit to Update(Note). Null when the post is not PUBLIC. */
export function projectPostUpdate(
  ctx: Context<void>,
  origin: string,
  post: PINGPostProjection,
): Update | null {
  const created = projectPostCreate(ctx, origin, post);
  if (!created) return null;
  const note = created.object as Note;
  return new Update({
    id: new URL(`${origin}/activities/${encodeURIComponent(post.id)}/update`),
    actor: ctx.getActorUri(post.authorIdentifier),
    object: note,
    to: ACTIVITY_STREAMS_PUBLIC,
    cc: ctx.getFollowersUri(post.authorIdentifier),
  });
}

/** Project a post revocation to Delete. Null when the post is not PUBLIC. */
export function projectPostDelete(
  ctx: Context<void>,
  origin: string,
  post: PINGPostProjection,
): Delete | null {
  if (post.visibility !== "PUBLIC") return null;
  const actorUri = ctx.getActorUri(post.authorIdentifier);
  return new Delete({
    id: new URL(`${origin}/activities/${encodeURIComponent(post.id)}/delete`),
    actor: actorUri,
    object: postNoteId(origin, post),
    to: ACTIVITY_STREAMS_PUBLIC,
    cc: ctx.getFollowersUri(post.authorIdentifier),
  });
}

/**
 * Build Accept(Follow) for an inbound follow that the canonical pipeline has
 * accepted. Sent only after RELATIONSHIP_CREATED follows/active exists.
 * Shape follows the Fedify documented Follow/Accept pattern.
 */
export function projectFollowAccept(follow: Follow): Accept {
  if (follow.objectId == null) {
    throw new Error("projectFollowAccept: Follow has no object");
  }
  return new Accept({ actor: follow.objectId, object: follow });
}
