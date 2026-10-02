#!/usr/bin/env python3
"""Follow/Like buttons: wire the existing APIs into the /o action row."""
import sys

P = "/home/nolan/projects/ping/"

follow_btn = '''"use client";

/**
 * FollowButton: follow/unfollow this object via /api/fyd/follow.
 * The button reflects real state (GET on mount) and toggles via POST.
 * Never a dead button: it only renders for capabilities the schema
 * granted, and it talks to the real follows store.
 */

import { useCallback, useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function FollowButton({
  objectId,
  className,
}: {
  objectId: string;
  className?: string;
}) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/fyd/follow?objectId=" + encodeURIComponent(objectId))
      .then((r) => r.json())
      .then((d) => {
        if (live && typeof d.following === "boolean") setFollowing(d.following);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [objectId]);

  const toggle = useCallback(async () => {
    if (busy || following === null) return;
    setBusy(true);
    try {
      const res = await fetch("/api/fyd/follow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          objectId,
          action: following ? "unfollow" : "follow",
        }),
      });
      const d = await res.json();
      if (d.ok && typeof d.following === "boolean") setFollowing(d.following);
    } catch {
      // Network failure: leave state unchanged, never fake it.
    } finally {
      setBusy(false);
    }
  }, [busy, following, objectId]);

  return (
    <button
      type="button"
      className={cn(className)}
      onClick={toggle}
      disabled={busy || following === null}
      aria-pressed={following === true}
    >
      {following === true ? (
        <UserCheck className="h-5 w-5" aria-hidden="true" />
      ) : (
        <UserPlus className="h-5 w-5" aria-hidden="true" />
      )}
      {following === true ? "Following" : "Follow"}
    </button>
  );
}
'''
open(P + "src/fyd/ui/follow-button.tsx", "w").write(follow_btn)
print("OK follow-button")

like_btn = '''"use client";

/**
 * LikeButton: like/unlike this object via /api/fyd/like.
 * Real state from GET on mount, toggled via POST. Only rendered where
 * the schema grants the like capability (posts).
 */

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function LikeButton({
  objectId,
  className,
}: {
  objectId: string;
  className?: string;
}) {
  const [liked, setLiked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/fyd/like?objectId=" + encodeURIComponent(objectId))
      .then((r) => r.json())
      .then((d) => {
        if (live && typeof d.liked === "boolean") setLiked(d.liked);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [objectId]);

  const toggle = useCallback(async () => {
    if (busy || liked === null) return;
    setBusy(true);
    try {
      const res = await fetch("/api/fyd/like", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ objectId, action: liked ? "unlike" : "like" }),
      });
      const d = await res.json();
      if (d.ok && typeof d.liked === "boolean") setLiked(d.liked);
    } catch {
      // Network failure: leave state unchanged, never fake it.
    } finally {
      setBusy(false);
    }
  }, [busy, liked, objectId]);

  return (
    <button
      type="button"
      className={cn(className)}
      onClick={toggle}
      disabled={busy || liked === null}
      aria-pressed={liked === true}
    >
      <Heart
        className="h-5 w-5"
        aria-hidden="true"
        fill={liked === true ? "currentColor" : "none"}
      />
      {liked === true ? "Liked" : "Like"}
    </button>
  );
}
'''
open(P + "src/fyd/ui/like-button.tsx", "w").write(like_btn)
print("OK like-button")

def replace_once(path, old, new, label):
    full = P + path
    s = open(full).read()
    n = s.count(old)
    if n != 1:
        print(f"FAIL {label}: found {n}, expected 1")
        sys.exit(1)
    open(full, "w").write(s.replace(old, new, 1))
    print(f"OK {label}")

PAGE = "src/app/o/[objectId]/page.tsx"

# import the buttons
old_imp = 'import { ReferenceButton } from "@/fyd/ui/reference-button";'
new_imp = '''import { ReferenceButton } from "@/fyd/ui/reference-button";
import { FollowButton } from "@/fyd/ui/follow-button";
import { LikeButton } from "@/fyd/ui/like-button";'''
replace_once(PAGE, old_imp, new_imp, "page-imports-2")

# render follow + like in ActionButtons (before the ask case)
old_ask = """      case "ask":"""
new_ask = """      case "follow":
        return <FollowButton key={i} objectId={view.id} className={cls + " border border-stone-300 bg-white text-stone-800 hover:bg-stone-100"} />;
      case "like":
        return <LikeButton key={i} objectId={view.id} className={cls + " border border-stone-300 bg-white text-stone-800 hover:bg-stone-100"} />;
      case "ask":"""
replace_once(PAGE, old_ask, new_ask, "page-follow-like")

# evidence-chrome: render follow/like via the real buttons
EC = "src/fyd/object/evidence-chrome.tsx"
full_ec = P + EC
s_ec = open(full_ec).read()
old_def = """    default:
      // follow/like: no static affordance on these surfaces, exactly as in
      // the existing Circle primitive. Never a dead button.
      return null;"""
new_def = """    case "follow":
      return <FollowButton objectId={nodeObjectId} className={QUIET_BTN} />;
    case "like":
      return <LikeButton objectId={nodeObjectId} className={QUIET_BTN} />;
    default:
      return null;"""
if s_ec.count(old_def) != 1:
    print("FAIL ec-default")
    sys.exit(1)
s_ec = s_ec.replace(old_def, new_def, 1)

# thread the object id through CapabilityActions -> CapabilityAction
old_sig = """function CapabilityAction({
  cap,
  nodeHref,
}: {
  cap: ObjectCapability;
  nodeHref: string;
}) {"""
new_sig = """function CapabilityAction({
  cap,
  nodeHref,
  nodeObjectId,
}: {
  cap: ObjectCapability;
  nodeHref: string;
  nodeObjectId: string;
}) {"""
if s_ec.count(old_sig) != 1:
    print("FAIL ec-sig")
    sys.exit(1)
s_ec = s_ec.replace(old_sig, new_sig, 1)

old_actions = """export function CapabilityActions({
  capabilities,
  nodeHref,
  className,
}: {
  capabilities: ObjectCapability[];
  nodeHref: string;
  className?: string;
}) {
  if (capabilities.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {capabilities.map((cap, i) => (
        <CapabilityAction key={cap.kind + ":" + i} cap={cap} nodeHref={nodeHref} />
      ))}
    </div>
  );
}"""
new_actions = """export function CapabilityActions({
  capabilities,
  nodeHref,
  nodeObjectId,
  className,
}: {
  capabilities: ObjectCapability[];
  nodeHref: string;
  nodeObjectId: string;
  className?: string;
}) {
  if (capabilities.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {capabilities.map((cap, i) => (
        <CapabilityAction
          key={cap.kind + ":" + i}
          cap={cap}
          nodeHref={nodeHref}
          nodeObjectId={nodeObjectId}
        />
      ))}
    </div>
  );
}"""
if s_ec.count(old_actions) != 1:
    print("FAIL ec-actions")
    sys.exit(1)
s_ec = s_ec.replace(old_actions, new_actions, 1)

# imports for the buttons
s_ec = s_ec.replace(
    'import { ReferenceButton } from "@/fyd/ui/reference-button";',
    'import { ReferenceButton } from "@/fyd/ui/reference-button";\nimport { FollowButton } from "@/fyd/ui/follow-button";\nimport { LikeButton } from "@/fyd/ui/like-button";',
    1,
)
open(full_ec, "w").write(s_ec)
print("OK ec-follow-like")

print("ALL EDITS APPLIED")
