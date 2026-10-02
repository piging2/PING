"use client";

/**
 * InlineObjectCircle: one PING object living beside web content.
 *
 * Redesign (Nolan, 2026-09-22): the Circle behaves like an intelligent
 * inline object, not a modal centerpiece. ONE visual object, ONE
 * interaction boundary:
 *
 * - rest:     64px circle with the object's image. Small, quiet, beside
 *             the paragraph. No satellites, no external hint chips.
 * - expanded: the same circle morphs in place to 216px (one calm
 *             transform + opacity morph; instant under
 *             prefers-reduced-motion). Everything is clipped inside the
 *             circular boundary (overflow hidden, border-radius 50%):
 *             the image, a controlled dark overlay for contrast, the
 *             object name, and exactly three actions (FOLLOW, LIKE,
 *             WEBSITE) integrated into the lower part. No control
 *             protrudes. No part of the circle is a secret link.
 *
 * Interaction:
 * - desktop: hover or keyboard focus expands; moving away collapses
 *   after a short forgiving delay (300ms); Escape collapses.
 * - mobile: tap expands; tap an action to act; tap outside (or the
 *   circle background) collapses. No hover assumption.
 * - keyboard: the rest trigger is a real button; focusing it opens the
 *   circle and moves focus to the first enabled action; blur outside
 *   the circle or Escape closes and returns focus to the trigger.
 *
 * Generic: takes object data (id, name, image, website URL) as props.
 * No per-customer logic lives here.
 *
 * FOLLOW / LIKE write path: executeFollow / executeLike from
 * @/fyd/capabilities/runtime, which POST to /api/fyd/follow and
 * /api/fyd/like. Those routes write to the server-side stores in
 * src/fyd/object/follows.ts and src/fyd/object/likes.ts (atomic JSON
 * files, single local demo viewer until real identity exists).
 * Fail-closed: the UI only ever reflects server-confirmed state.
 * CANONICAL WRITE SEAM NOTE: the PING gateway envelope path in
 * src/fyd/social/actions.ts (signed RELATIONSHIP_CREATED) is the
 * canonical social write seam, but it is NOT wired into the
 * /api/fyd/follow and /api/fyd/like routes used here; wiring it in
 * requires a real viewer identity, which the homepage does not have.
 * Do not present these toggles as gateway-journaled follows.
 *
 * WEBSITE: opens the evidence-backed website URL through openWebsite,
 * which enforces the https-only URL safety seam (isSafeWebHref).
 */

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Heart, UserCheck, UserPlus } from "lucide-react";
import { spring } from "@/motion/motionTokens";
import {
  executeFollow,
  executeLike,
  openWebsite,
} from "@/fyd/capabilities/runtime";

export interface InlineObjectCircleProps {
  /** PING object id (e.g. "happy-place"). Keys follow/like state. */
  objectId: string;
  /** Evidence-backed display name. */
  name: string;
  /** Identity image (website snapshot). Decorative; the name is the label. */
  imageSrc?: string | null;
  imageSrcSet?: string | null;
  /** Evidence-backed canonical public website URL, or null (fail closed). */
  websiteUrl: string | null;
}

/** Resting diameter: compact, beside the paragraph, not dominating reading. */
const REST_D = 64;
/**
 * Expanded diameter. The prior engaged circle defaulted to 320px with a
 * 200..480px geometry clamp; fyd-circle used ~208px. 216px exposes the
 * three actions with usable 44px touch targets and keeps the image
 * recognizable, without expanding beyond what the actions need.
 */
const EXPANDED_D = 216;
const REST_SCALE = REST_D / EXPANDED_D;
/** Forgiving collapse delay so the pointer can reach the controls. */
const COLLAPSE_DELAY_MS = 300;

interface CircleActionProps {
  label: string;
  stateLabel: string;
  pressed: boolean;
  disabled: boolean;
  onAction: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
}

/**
 * One in-circle action. Visual footprint is compact (icon over a short
 * label); the hit target is always at least 44px tall.
 */
function CircleAction({
  label,
  stateLabel,
  pressed,
  disabled,
  onAction,
  buttonRef,
  children,
}: CircleActionProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={pressed ? stateLabel : label}
      title={pressed ? stateLabel : label}
      onClick={(e) => {
        e.stopPropagation();
        onAction();
      }}
      className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-white transition-colors disabled:opacity-50"
      style={{
        background: "rgba(0,0,0,0.62)",
        boxShadow: pressed
          ? "0 0 0 1px rgba(232,180,90,0.85), 0 2px 10px rgba(0,0,0,0.5)"
          : "0 0 0 1px rgba(255,255,255,0.30), 0 2px 10px rgba(0,0,0,0.5)",
        color: pressed ? "#f3c96b" : "#ffffff",
        backdropFilter: "blur(2px)",
      }}
    >
      {children}
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}

export function InlineObjectCircle(props: InlineObjectCircleProps) {
  const { objectId, name, imageSrc, imageSrcSet, websiteUrl } = props;
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = React.useState(false);
  const [following, setFollowing] = React.useState<boolean | null>(null);
  const [liked, setLiked] = React.useState<boolean | null>(null);

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const followRef = React.useRef<HTMLButtonElement>(null);
  const likeRef = React.useRef<HTMLButtonElement>(null);
  const webRef = React.useRef<HTMLButtonElement>(null);
  const collapseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const openVia = React.useRef<"pointer" | "focus" | null>(null);

  const springTx = { type: "spring", ...spring.gentle } as const;
  const instantTx = { duration: 0.01 } as const;
  const tx = reduceMotion ? instantTx : springTx;

  const clearCollapseTimer = React.useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  }, []);

  React.useEffect(() => clearCollapseTimer, [clearCollapseTimer]);

  const requestOpen = React.useCallback(
    (via: "pointer" | "focus") => {
      clearCollapseTimer();
      openVia.current = via;
      setOpen(true);
    },
    [clearCollapseTimer],
  );

  const requestClose = React.useCallback(
    (immediate: boolean) => {
      clearCollapseTimer();
      if (immediate) {
        setOpen(false);
        return;
      }
      collapseTimer.current = setTimeout(() => {
        // Never strand keyboard focus: if focus is inside the circle,
        // the blur handler owns the close instead.
        if (!wrapRef.current?.contains(document.activeElement)) {
          setOpen(false);
        }
      }, COLLAPSE_DELAY_MS);
    },
    [clearCollapseTimer],
  );

  // Follow / like state: fetched once, fail closed (null = unknown,
  // actions stay disabled until the server confirms).
  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/fyd/follow?objectId=${encodeURIComponent(objectId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d && d.ok === true) setFollowing(!!d.following);
      })
      .catch(() => {});
    fetch(`/api/fyd/like?objectId=${encodeURIComponent(objectId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d && d.ok === true) setLiked(!!d.liked);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [objectId]);

  // Keyboard open: move focus into the first enabled action so the
  // trigger (which hides while open) never strands focus.
  React.useEffect(() => {
    if (!open || openVia.current !== "focus") return;
    openVia.current = null;
    const first = [followRef.current, likeRef.current, webRef.current].find(
      (b) => b && !b.disabled,
    );
    first?.focus({ preventScroll: true });
  }, [open, following, liked]);

  // While open: Escape collapses (focus returns to the trigger);
  // tapping outside the circle collapses. The outside listener is
  // deferred so the opening tap never instantly dismisses.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearCollapseTimer();
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        clearCollapseTimer();
        setOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("pointerdown", onDown), 80);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, clearCollapseTimer]);

  const toggleOpen = () => {
    if (open) {
      clearCollapseTimer();
      setOpen(false);
    } else {
      requestOpen("pointer");
    }
  };

  // Tapping the circle background (not an action) collapses. No part
  // of the circle navigates on its own.
  const handleExpandedClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    clearCollapseTimer();
    setOpen(false);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) {
      requestClose(false);
    }
  };

  const toggleFollow = async () => {
    if (following === null) return;
    setFollowing(await executeFollow(objectId, following));
  };

  const toggleLike = async () => {
    if (liked === null) return;
    setLiked(await executeLike(objectId, liked));
  };

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      ref={wrapRef}
      data-testid="inline-object-circle"
      className="relative"
      style={{ width: EXPANDED_D, height: EXPANDED_D, maxWidth: "100%" }}
      onMouseEnter={() => requestOpen("pointer")}
      onMouseLeave={() => requestClose(false)}
      onFocus={clearCollapseTimer}
      onBlur={handleBlur}
    >
      {/* Rest state: one compact trigger button. Hidden while open. */}
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        onFocus={() => requestOpen("focus")}
        aria-expanded={open}
        aria-label={`${name}. ${open ? "Collapse." : "Expand to show follow, like, and website actions."}`}
        aria-hidden={open || undefined}
        tabIndex={open ? -1 : 0}
        className="absolute left-1/2 top-1/2 cursor-pointer overflow-hidden rounded-full"
        style={{
          width: REST_D,
          height: REST_D,
          x: "-50%",
          y: "-50%",
          pointerEvents: open ? "none" : "auto",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.20), 0 0 22px rgba(232,180,90,0.18), 0 8px 24px rgba(0,0,0,0.45)",
        }}
        initial={false}
        animate={{ opacity: open ? 0 : 1, scale: open ? 0.7 : 1 }}
        transition={tx}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            srcSet={imageSrcSet ?? undefined}
            sizes={`${REST_D}px`}
            alt=""
            aria-hidden="true"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white"
            style={{ background: "radial-gradient(circle at 35% 30%, #8a6f4d, #3a3226)" }}
          >
            {initial}
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.30), transparent 55%)" }}
        />
      </motion.button>

      {/* Expanded state: the same circle, morphed in place. All visual
          information is clipped inside the circular boundary. */}
      <motion.div
        role="group"
        aria-label={`${name}: follow, like, website actions`}
        aria-hidden={!open || undefined}
        onClick={handleExpandedClick}
        className="absolute left-1/2 top-1/2 overflow-hidden rounded-full bg-neutral-900"
        style={{
          width: EXPANDED_D,
          height: EXPANDED_D,
          x: "-50%",
          y: "-50%",
          pointerEvents: open ? "auto" : "none",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.22), 0 0 44px rgba(232,180,90,0.20), 0 18px 50px rgba(0,0,0,0.55)",
        }}
        initial={false}
        animate={{ scale: open ? 1 : REST_SCALE, opacity: open ? 1 : 0 }}
        transition={tx}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            srcSet={imageSrcSet ?? undefined}
            sizes={`${EXPANDED_D}px`}
            alt=""
            aria-hidden="true"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-white"
            style={{ background: "radial-gradient(circle at 35% 30%, #8a6f4d, #3a3226)" }}
          >
            {initial}
          </span>
        )}
        {/* Controlled contrast: dark scrims top (name) and bottom
            (actions) so screenshot text never competes with FYD
            controls; the image stays recognizable in the middle band. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.76) 0%, rgba(0,0,0,0.32) 30%, rgba(0,0,0,0) 46%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.86) 100%)",
          }}
        />
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduceMotion ? { duration: 0.01 } : { duration: 0.16, delay: 0.06 }}
            className="absolute inset-0"
          >
            <div className="absolute inset-x-0 top-0 px-8 pt-5 text-center">
              <p className="line-clamp-2 text-[13px] font-bold leading-tight text-white">{name}</p>
            </div>
            <div className="absolute inset-x-6 bottom-6 flex gap-1.5">
              <CircleAction
                label="Follow"
                stateLabel="Following"
                pressed={!!following}
                disabled={following === null}
                onAction={toggleFollow}
                buttonRef={followRef}
              >
                {following ? (
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </CircleAction>
              <CircleAction
                label="Like"
                stateLabel="Liked"
                pressed={!!liked}
                disabled={liked === null}
                onAction={toggleLike}
                buttonRef={likeRef}
              >
                <Heart
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                  fill={liked ? "currentColor" : "none"}
                />
              </CircleAction>
              {websiteUrl ? (
                <CircleAction
                  label="Website"
                  stateLabel="Website"
                  pressed={false}
                  disabled={false}
                  onAction={() => openWebsite(websiteUrl)}
                  buttonRef={webRef}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </CircleAction>
              ) : null}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
