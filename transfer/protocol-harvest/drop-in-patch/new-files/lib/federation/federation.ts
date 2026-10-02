// lib/federation/federation.ts
//
// The Fedify Federation instance for the PING Social website.
//
// Fedify is the federation WIRE LAYER. It owns protocol serialization,
// WebFinger serving, signature verification, and delivery. It never stores
// canonical PING state. Dispatchers below read PING projections through the
// adapter; inbox listeners emit PING provider observations. Nothing here
// writes canonical state.
//
// Feature flag: PING_FEDERATION_ENABLED=1. Default OFF. When off, the
// middleware passes every request through and the explicit routes 404.

import {
  createFederation,
  MemoryKvStore,
  type Federation,
} from "@fedify/fedify";
import { Create, Follow, Like, Tombstone, Undo } from "@fedify/vocab";
import {
  isProjectable,
  projectFollowAccept,
  projectPersonActor,
  projectServiceActor,
} from "./adapter";
import { getTransportKeyPairs } from "./keys";
import { getProfileSource } from "./profile-source";

const ENABLED = process.env.PING_FEDERATION_ENABLED === "1";
const ORIGIN = process.env.FEDIFY_ORIGIN ?? "";

if (ENABLED && !ORIGIN) {
  throw new Error(
    "FEDIFY_ORIGIN must be set when PING_FEDERATION_ENABLED=1. It is pinned, never derived from the request host.",
  );
}

export const federation: Federation<void> = createFederation<void>({
  // Dev defaults. Production: @fedify/postgres PostgresKvStore +
  // PostgresMessageQueue on the Oracle DB in a separate schema
  // (federation_*), plus manuallyStartQueue with a dedicated worker.
  kv: new MemoryKvStore(),
  origin: ORIGIN || "https://federation-disabled.invalid",
  allowPrivateAddress: process.env.NODE_ENV !== "production",
});

// ---------------------------------------------------------------------------
// NodeInfo
// ---------------------------------------------------------------------------

federation.setNodeInfoDispatcher("/nodeinfo/2.1", async () => ({
  version: "2.1",
  software: {
    name: "ping-social-federation-adapter",
    version: "0.1.0",
  },
  protocols: ["activitypub"],
  services: { inbound: [], outbound: [] },
  openRegistrations: false,
  usage: {
    users: { total: 0, activeHalfyear: 0, activeMonth: 0 },
    localPosts: 0,
    localComments: 0,
  },
  metadata: {},
}));

// ---------------------------------------------------------------------------
// WebFinger: served automatically by Fedify at /.well-known/webfinger.
// Do not hand-implement. Extra links only.
// ---------------------------------------------------------------------------

federation.setWebFingerLinksDispatcher(async (ctx, resource) => {
  void ctx;
  void resource;
  return [];
});

// ---------------------------------------------------------------------------
// Transport keys: RSA (HTTP signatures) + Ed25519 (Object Integrity Proofs).
// NOT PING identity keys. See lib/federation/keys.ts.
// ---------------------------------------------------------------------------

federation.setKeyPairsDispatcher(async (_ctx, identifier) => {
  return getTransportKeyPairs(identifier);
});

// ---------------------------------------------------------------------------
// Actor projection: PING profile -> Person / Service.
// Unknown identifiers return null (pass through). Non-projectable profiles
// return null (404, never leak). Revoked identities return Tombstone (410).
// ---------------------------------------------------------------------------

federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
  const profile = await getProfileSource().getProfile(identifier);
  if (profile == null) return null;
  if (profile.status === "revoked") {
    return new Tombstone({
      id: ctx.getActorUri(identifier),
      deleted: profile.revokedAt ? new Date(profile.revokedAt) : new Date(),
    });
  }
  if (!isProjectable(profile)) return null;
  const keys = await ctx.getActorKeyPairs(identifier);
  return profile.kind === "service"
    ? projectServiceActor(ctx, identifier, profile, keys)
    : projectPersonActor(ctx, identifier, profile, keys);
});

// ---------------------------------------------------------------------------
// Provider observations: the ONLY thing inbox listeners do besides
// protocol replies. Inbound activities become OBSERVATION_CREATED events for
// the PING pipeline. The pipeline decides; the adapter never writes
// canonical state directly.
// ---------------------------------------------------------------------------

interface ObservationPayload {
  kind: string;
  [key: string]: unknown;
}

async function emitProviderObservation(payload: ObservationPayload): Promise<void> {
  const baseUrl = process.env.PING_GATEWAY_URL;
  const token = process.env.PING_GATEWAY_TOKEN;
  if (!baseUrl || !token) {
    console.warn(
      `[federation] observation not delivered (PING_GATEWAY_URL unset): ${JSON.stringify(payload)}`,
    );
    return;
  }
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/observations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ provider: "activitypub", ...payload }),
    });
    if (!res.ok) {
      console.error(`[federation] observation POST failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(
      `[federation] observation POST threw: ${(err as Error).message}`,
    );
  }
}

function isSelfActor(actorId: URL): boolean {
  try {
    return actorId.origin === new URL(ORIGIN).origin;
  } catch {
    return false;
  }
}

federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, async (ctx, follow) => {
    if (follow.objectId == null) return;
    const parsed = ctx.parseUri(follow.objectId);
    if (parsed?.type !== "actor") return;
    const targetIdentifier = parsed.identifier;
    if (follow.actorId && isSelfActor(follow.actorId)) return;
    const follower = await follow.getActor(ctx);
    if (follower == null) return;
    const profile = await getProfileSource().getProfile(targetIdentifier);
    await emitProviderObservation({
      kind: "activitypub.follow.received",
      followerActorUri: follow.actorId?.href ?? null,
      targetIdentifier,
      targetProjectable: profile ? isProjectable(profile) : false,
      activityId: follow.id?.href ?? null,
    });
    // Dev-only auto-accept. Production accepts only after the canonical
    // pipeline emits RELATIONSHIP_CREATED follows/active (see design doc).
    if (
      process.env.PING_AUTO_ACCEPT_FOLLOWS === "1" &&
      profile &&
      isProjectable(profile)
    ) {
      await ctx.sendActivity(
        { identifier: targetIdentifier },
        follower,
        projectFollowAccept(follow),
      );
    }
  })
  .on(Like, async (_ctx, like) => {
    const actorId = like.actorId;
    const objectId = like.objectId;
    if (!actorId || !objectId || isSelfActor(actorId)) return;
    await emitProviderObservation({
      kind: "activitypub.like.received",
      likerActorUri: actorId.href,
      objectUri: objectId.href,
      activityId: like.id?.href ?? null,
    });
  })
  .on(Undo, async (_ctx, undo) => {
    const actorId = undo.actorId;
    if (!actorId || isSelfActor(actorId)) return;
    await emitProviderObservation({
      kind: "activitypub.undo.received",
      actorUri: actorId.href,
      undoneObjectId: undo.objectId?.href ?? null,
      activityId: undo.id?.href ?? null,
    });
  })
  .on(Create, async (_ctx, create) => {
    const actorId = create.actorId;
    if (!actorId || isSelfActor(actorId)) return;
    await emitProviderObservation({
      kind: "activitypub.create.received",
      actorUri: actorId.href,
      objectId: create.objectId?.href ?? null,
      activityId: create.id?.href ?? null,
    });
  });
