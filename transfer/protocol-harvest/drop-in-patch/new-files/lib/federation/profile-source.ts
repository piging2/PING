// lib/federation/profile-source.ts
//
// How the ActivityPub projection adapter reads PING profile projections.
// The adapter never reads the canonical journal. It reads PUBLIC profile
// projections through one of two sources:
//
//   HttpPINGProfileSource  production: reads the PING gateway's federation
//                          profile endpoint (contract, see README).
//   DevFixtureProfileSource dev only: reads the checked-in fixture file.
//                          Refuses to run in production.
//
// Nolan's identity is NEVER hardcoded here and NEVER comes from fixtures.
// It resolves only through the HTTP source, and only when a PUBLIC,
// federate=true profile exists.

import devFixtures from "./dev-fixtures/federation-profiles.json";

export type ProfileVisibility = "PUBLIC" | "PRIVATE" | "PING_ONLY";

export interface PINGProfile {
  identifier: string; // e.g. "alice", "nolan", "acme-plumbing"
  kind: "person" | "service";
  pingIdentityId: string; // canonical PING identity id; never projected
  displayName: string;
  bio: string;
  avatarUrl?: string;
  profileUrl?: string;
  visibility: ProfileVisibility;
  federate: boolean; // explicit opt-in; default false
  status: "active" | "revoked";
  revokedAt?: string; // ISO date-time, required when status is "revoked"
}

export interface ProfileSource {
  getProfile(identifier: string): Promise<PINGProfile | null>;
}

function normalizeProfile(raw: unknown): PINGProfile {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("profile source returned a non-object");
  }
  const r = raw as Record<string, unknown>;
  for (const field of ["identifier", "kind", "pingIdentityId", "displayName"]) {
    if (typeof r[field] !== "string" || (r[field] as string).length === 0) {
      throw new Error(`profile source: missing or invalid field ${field}`);
    }
  }
  if (r["kind"] !== "person" && r["kind"] !== "service") {
    throw new Error("profile source: kind must be person or service");
  }
  if (!["PUBLIC", "PRIVATE", "PING_ONLY"].includes(r["visibility"] as string)) {
    throw new Error("profile source: invalid visibility");
  }
  if (typeof r["bio"] !== "string") {
    throw new Error("profile source: bio must be a string");
  }
  return {
    identifier: r["identifier"] as string,
    kind: r["kind"] as "person" | "service",
    pingIdentityId: r["pingIdentityId"] as string,
    displayName: r["displayName"] as string,
    bio: r["bio"] as string,
    avatarUrl: typeof r["avatarUrl"] === "string" ? r["avatarUrl"] : undefined,
    profileUrl:
      typeof r["profileUrl"] === "string" ? r["profileUrl"] : undefined,
    visibility: r["visibility"] as ProfileVisibility,
    federate: r["federate"] === true,
    status: r["status"] === "revoked" ? "revoked" : "active",
    revokedAt: typeof r["revokedAt"] === "string" ? r["revokedAt"] : undefined,
  };
}

export class HttpPINGProfileSource implements ProfileSource {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async getProfile(identifier: string): Promise<PINGProfile | null> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/api/federation/profiles/${encodeURIComponent(identifier)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { authorization: `Bearer ${this.token}` },
      });
    } catch (err) {
      throw new Error(
        `profile source fetch failed for ${identifier}: ${(err as Error).message}`,
      );
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`profile source HTTP ${res.status} for ${identifier}`);
    }
    return normalizeProfile(await res.json());
  }
}

export class DevFixtureProfileSource implements ProfileSource {
  private readonly fixtures: Record<string, PINGProfile>;

  constructor(fixtures: Record<string, unknown>) {
    const normalized: Record<string, PINGProfile> = {};
    for (const [key, raw] of Object.entries(fixtures)) {
      normalized[key] = normalizeProfile(raw);
    }
    this.fixtures = normalized;
  }

  async getProfile(identifier: string): Promise<PINGProfile | null> {
    return this.fixtures[identifier] ?? null;
  }
}

let singleton: ProfileSource | null = null;

export function getProfileSource(): ProfileSource {
  if (singleton) return singleton;
  const baseUrl = process.env.PING_GATEWAY_URL;
  const token = process.env.PING_GATEWAY_TOKEN;
  if (baseUrl && token) {
    singleton = new HttpPINGProfileSource(baseUrl, token);
    return singleton;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PING_GATEWAY_URL and PING_GATEWAY_TOKEN must be set in production; refusing dev fixture profile source.",
    );
  }
  console.warn(
    "[federation] PING_GATEWAY_URL unset: using DEV FIXTURE profile source. Dev only, never in production.",
  );
  singleton = new DevFixtureProfileSource(
    devFixtures as Record<string, unknown>,
  );
  return singleton;
}

/** Test seam: reset the cached source between tests. */
export function __resetProfileSourceForTests(): void {
  singleton = null;
}
