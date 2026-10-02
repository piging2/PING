"use client";

/**
 * ObjectCircle: the generic PING object projection for the margin object
 * layer (Nolan, 2026-09-22: "Margins Are the Object Layer").
 *
 * ONE visual object, ONE interaction boundary:
 * - rest:     64px circle (48px on the tablet edge rail) with the object's
 *             image. Small, quiet, recognizable. No satellites.
 * - expanded: a 216px circle rendered as a FIXED overlay in the margin /
 *             overlay layer. It never reflows the publisher document:
 *             expansion is transient UI state, not document structure.
 *             Inside are the object name and exactly three actions
 *             (FOLLOW, LIKE, WEBSITE), all clipped inside the circular
 *             boundary. No control protrudes. No part of the circle is a
 *             secret link.
 *
 * Interaction:
 * - desktop: hover or keyboard focus expands; moving away collapses after
 *   a short forgiving delay (300ms); Escape collapses and returns focus
 *   to the trigger.
 * - touch (tablet edge rail): tap toggles; tap outside or the card
 *   background collapses. No hover assumption.
 * - keyboard: the rest trigger is a real button; focusing it opens the
 *   card and moves focus to the first enabled action; blur outside the
 *   object or Escape closes.
 *
 * Generic: takes object data as props. No per-customer logic lives here.
 * One-expanded coordination comes from ./expansion (module-level claim
 * registry shared by circles, cluster popovers, and the mobile sheet).
 */

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, Heart, UserCheck, UserPlus } from "lucide-react";
import { spring } from "@/motion/motionTokens";
import { claimExpanded, subscribeExpanded } from "./expansion";
import { useObjectActions } from "./use-object-actions";
import type { MarginObjectDescriptor } from "./types";

/** Resting diameter on desktop rails: compact, quiet, recognizable. */
export const REST_D = 64;
/** Expanded diameter: fits the three actions with 44px touch targets. */
export const EXPANDED_D = 216;
/** Forgiving collapse delay so the pointer can reach the controls. */
const COLLAPSE_DELAY_MS = 300;

const springTx = { type: "spring", ...spring.gentle } as const;
const instantTx = { duration: 0.01 } as const;

/**
 * Local open state for one claim id. Opening claims the global slot
 * (collapsing everyone else); being superseded collapses locally.
 * Closing is local-only: a close never releases another claimant's slot.
 */
export function useClaim(claimId: string, onSuperseded?: () => void) {
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  React.useEffect(() => clearTimer, [clearTimer]);

  const supersededRef = React.useRef(onSuperseded);
  supersededRef.current = onSuperseded;
  React.useEffect(
    () =>
      subscribeExpanded((active) => {
        if (active !== claimId) {
          clearTimer();
          setOpen(false);
          supersededRef.current?.();
        }
      }),
    [claimId, clearTimer],
  );

  const requestOpen = React.useCallback(() => {
    clearTimer();
    claimExpanded(claimId);
    setOpen(true);
  }, [claimId, clearTimer]);

  const requestClose = React.useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  const requestCloseSoon = React.useCallback(
    (focusInside?: () => boolean) => {
      clearTimer();
      timer.current = setTimeout(() => {
        // Never strand keyboard focus: if focus is inside, the blur
        // handler owns the close instead.
        if (!focusInside || !focusInside()) setOpen(false);
      }, COLLAPSE_DELAY_MS);
    },
    [clearTimer],
  );

  return { open, requestOpen, requestClose, requestCloseSoon, clearTimer };
}

interface CircleActionProps {
  label: string;
  stateLabel: string;
  pressed: boolean;
  disabled: boolean;
  onAction: () => void;
  buttonRef?: { current: HTMLButtonElement | null };
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

function ObjectFace({
  name,
  imageSrc,
  imageSrcSet,
  sizes,
  initialClassName,
}: {
  name: string;
  imageSrc: string | null;
  imageSrcSet: string | null;
  sizes: string;
  initialClassName: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <>
      {imageSrc ? (
        <img
          src={imageSrc}
          srcSet={imageSrcSet ?? undefined}
          sizes={sizes}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center font-bold text-white ${initialClassName}`}
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
    </>
  );
}

/** Mutable holder for an action button element (structural: no React-version coupling). */
interface ActionRefs {
  follow: { current: HTMLButtonElement | null };
  like: { current: HTMLButtonElement | null };
  web: { current: HTMLButtonElement | null };
}

/** The 216px circle interior: name + exactly three actions. No positioning. */
function ObjectCardInner({
  descriptor,
  actionRefs,
  onActionsSettled,
}: {
  descriptor: MarginObjectDescriptor;
  actionRefs: ActionRefs;
  /** Fires when follow/like state first resolves (actions become usable). */
  onActionsSettled?: () => void;
}) {
  const { following, liked, toggleFollow, toggleLike, openSite } = useObjectActions(
    descriptor.objectId,
    descriptor.websiteUrl,
  );
  const settled = following !== null || liked !== null;
  const settledCb = React.useRef(onActionsSettled);
  settledCb.current = onActionsSettled;
  React.useEffect(() => {
    if (settled) settledCb.current?.();
  }, [settled]);
  return (
    <div className="relative h-full w-full overflow-hidden rounded-full bg-neutral-900">
      <ObjectFace
        name={descriptor.name}
        imageSrc={descriptor.imageSrc}
        imageSrcSet={descriptor.imageSrcSet}
        sizes={`${EXPANDED_D}px`}
        initialClassName="text-5xl"
      />
      {/* Controlled contrast: dark scrims top (name) and bottom (actions). */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.76) 0%, rgba(0,0,0,0.32) 30%, rgba(0,0,0,0) 46%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.86) 100%)",
        }}
      />
      <div className="absolute inset-0">
        <div className="absolute inset-x-0 top-0 px-8 pt-5 text-center">
          <p className="line-clamp-2 text-[13px] font-bold leading-tight text-white">
            {descriptor.name}
          </p>
        </div>
        <div className="absolute inset-x-6 bottom-6 flex gap-1.5">
          <CircleAction
            label="Follow"
            stateLabel="Following"
            pressed={!!following}
            disabled={following === null}
            onAction={toggleFollow}
            buttonRef={actionRefs.follow}
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
            buttonRef={actionRefs.like}
          >
            <Heart
              className="h-3.5 w-3.5"
              aria-hidden="true"
              fill={liked ? "currentColor" : "none"}
            />
          </CircleAction>
          {descriptor.websiteUrl ? (
            <CircleAction
              label="Website"
              stateLabel="Website"
              pressed={false}
              disabled={false}
              onAction={openSite}
              buttonRef={actionRefs.web}
            >
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </CircleAction>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * One margin object: rest button at the slot + fixed overlay card when
 * expanded. The card is a sibling of the trigger (never inside a
 * transformed element) so position:fixed stays viewport-relative.
 */
export function MarginObject({
  descriptor,
  slotStyle,
  cardStyle,
  restD = REST_D,
}: {
  descriptor: MarginObjectDescriptor;
  /** Fixed-position slot style from the placement layer. */
  slotStyle: React.CSSProperties;
  /** Fixed-position card style (viewport-clamped) from the layer. */
  cardStyle: React.CSSProperties;
  restD?: number;
}) {
  const { objectId, name } = descriptor;
  const reduceMotion = useReducedMotion();
  const tx = reduceMotion ? instantTx : springTx;
  const { open, requestOpen, requestClose, requestCloseSoon, clearTimer } = useClaim(objectId);

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const actionRefs: ActionRefs = {
    follow: React.useRef<HTMLButtonElement | null>(null),
    like: React.useRef<HTMLButtonElement | null>(null),
    web: React.useRef<HTMLButtonElement | null>(null),
  };
  const openedVia = React.useRef<"pointer" | "focus" | null>(null);
  // Escape returns focus to the trigger; the focus handler must not
  // treat that programmatic focus as a fresh keyboard open.
  const suppressFocusOpen = React.useRef(false);

  const focusInside = React.useCallback(
    () => !!wrapRef.current?.contains(document.activeElement),
    [],
  );

  // Keyboard open: move focus into the first enabled action so the
  // trigger (which hides while open) never strands focus. Re-runs when
  // the actions settle (they start disabled until the server confirms).
  const tryFocusFirstAction = React.useCallback(() => {
    if (openedVia.current !== "focus") return;
    openedVia.current = null;
    const first = [actionRefs.follow.current, actionRefs.like.current, actionRefs.web.current].find(
      (b) => b && !b.disabled,
    );
    first?.focus({ preventScroll: true });
  }, []);

  React.useEffect(() => {
    if (open) tryFocusFirstAction();
  }, [open, tryFocusFirstAction]);

  // While open: Escape collapses (focus returns to the trigger);
  // a pointerdown outside the object collapses. Deferred so the
  // opening tap never instantly dismisses.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        suppressFocusOpen.current = true;
        requestClose();
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        requestClose();
      }
    };
    const t = setTimeout(() => document.addEventListener("pointerdown", onDown), 80);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, requestClose]);

  const handleFocus = () => {
    if (suppressFocusOpen.current) {
      suppressFocusOpen.current = false;
      return;
    }
    openedVia.current = "focus";
    requestOpen();
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) {
      requestCloseSoon(focusInside);
    }
  };

  const handleCardBackground = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    requestClose();
  };

  return (
    <div
      ref={wrapRef}
      data-testid="margin-object"
      data-object-id={objectId}
      className="pointer-events-auto"
      style={{ ...slotStyle, position: "fixed" }}
      onMouseEnter={() => {
        openedVia.current = "pointer";
        requestOpen();
      }}
      onMouseLeave={() => requestCloseSoon(focusInside)}
      onFocus={clearTimer}
      onBlur={handleBlur}
    >
      {/* Rest state: one compact trigger button. Hidden while open. */}
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) requestClose();
          else {
            openedVia.current = "pointer";
            requestOpen();
          }
        }}
        onFocus={handleFocus}
        aria-expanded={open}
        aria-label={`${name}. ${open ? "Collapse." : "Expand to show follow, like, and website actions."}`}
        aria-hidden={open || undefined}
        tabIndex={open ? -1 : 0}
        className="absolute inset-0 cursor-pointer overflow-hidden rounded-full"
        style={{
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.20), 0 0 22px rgba(232,180,90,0.18), 0 8px 24px rgba(0,0,0,0.45)",
        }}
        initial={false}
        animate={{ opacity: open ? 0 : 1, scale: open ? 0.7 : 1 }}
        transition={tx}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      >
        <ObjectFace
          name={name}
          imageSrc={descriptor.imageSrc}
          imageSrcSet={descriptor.imageSrcSet}
          sizes={`${restD}px`}
          initialClassName="text-xl"
        />
      </motion.button>

      {/* Expanded state: fixed overlay in the margin layer. Never reflows. */}
      {open && (
        <motion.div
          data-testid="object-circle-card"
          role="group"
          aria-label={`${name}: follow, like, website actions`}
          onClick={handleCardBackground}
          className="rounded-full bg-neutral-900"
          style={{
            ...cardStyle,
            position: "fixed",
            width: EXPANDED_D,
            height: EXPANDED_D,
            zIndex: 60,
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.22), 0 0 44px rgba(232,180,90,0.20), 0 18px 50px rgba(0,0,0,0.55)",
          }}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={tx}
        >
          <ObjectCardInner
            descriptor={descriptor}
            actionRefs={actionRefs}
            onActionsSettled={tryFocusFirstAction}
          />
        </motion.div>
      )}
    </div>
  );
}

/**
 * Static 216px object card for the mobile sheet: same interior, no
 * fixed positioning, no claim registry (the sheet owns visibility).
 */
export function ObjectCardStatic({ descriptor }: { descriptor: MarginObjectDescriptor }) {
  const actionRefs: ActionRefs = {
    follow: React.useRef<HTMLButtonElement | null>(null),
    like: React.useRef<HTMLButtonElement | null>(null),
    web: React.useRef<HTMLButtonElement | null>(null),
  };
  return (
    <div
      data-testid="object-card-static"
      role="group"
      aria-label={`${descriptor.name}: follow, like, website actions`}
      className="mx-auto overflow-hidden rounded-full bg-neutral-900"
      style={{
        width: EXPANDED_D,
        height: EXPANDED_D,
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.22), 0 0 44px rgba(232,180,90,0.20), 0 18px 50px rgba(0,0,0,0.55)",
      }}
    >
      <ObjectCardInner descriptor={descriptor} actionRefs={actionRefs} />
    </div>
  );
}

/**
 * ClusterSlot: a "+N" trigger for a compact cluster of nearby objects.
 * Click expands a small member list in the overlay layer; picking a
 * member opens that member's card. Generic; no per-customer logic.
 */
export function ClusterSlot({
  clusterId,
  members,
  slotStyle,
  popoverStyle,
  cardStyleFor,
  restD = REST_D,
}: {
  clusterId: string;
  members: MarginObjectDescriptor[];
  slotStyle: React.CSSProperties;
  popoverStyle: React.CSSProperties;
  cardStyleFor: (member: MarginObjectDescriptor) => React.CSSProperties;
  restD?: number;
}) {
  const claimId = `cluster:${clusterId}`;
  const { open, requestOpen, requestClose } = useClaim(claimId);
  const [selected, setSelected] = React.useState<MarginObjectDescriptor | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // While the popover is open: Escape or outside pointerdown closes.
  React.useEffect(() => {
    if (!open || selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) requestClose();
    };
    const t = setTimeout(() => document.addEventListener("pointerdown", onDown), 80);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, selected, requestClose]);

  const pickMember = (m: MarginObjectDescriptor) => {
    // The member card claims its object id on mount, which collapses
    // this popover through the shared registry.
    setSelected(m);
  };

  return (
    <div
      ref={wrapRef}
      data-testid="margin-cluster"
      data-cluster-id={clusterId}
      className="pointer-events-auto"
      style={{ ...slotStyle, position: "fixed" }}
    >
      <button
        type="button"
        onClick={() => (open && !selected ? requestClose() : (setSelected(null), requestOpen()))}
        aria-expanded={open}
        aria-label={`${members.length} nearby objects. Expand to choose one.`}
        className="absolute inset-0 cursor-pointer overflow-hidden rounded-full"
        style={{
          background: "rgba(20,16,10,0.92)",
          boxShadow:
            "0 0 0 1px rgba(232,180,90,0.55), 0 8px 24px rgba(0,0,0,0.45)",
          color: "#f3c96b",
        }}
      >
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
          +{members.length}
        </span>
      </button>

      {open && !selected && (
        <div
          role="menu"
          aria-label="Nearby objects"
          className="rounded-2xl bg-neutral-950 p-2"
          style={{
            ...popoverStyle,
            position: "fixed",
            zIndex: 60,
            boxShadow: "0 18px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.14)",
            minWidth: 220,
            maxWidth: 280,
          }}
        >
          {members.map((m) => (
            <button
              key={m.objectId}
              type="button"
              role="menuitem"
              onClick={() => pickMember(m)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left text-white hover:bg-white/10"
            >
              <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full">
                <ObjectFace
                  name={m.name}
                  imageSrc={m.imageSrc}
                  imageSrcSet={m.imageSrcSet}
                  sizes="80px"
                  initialClassName="text-base"
                />
              </span>
              <span className="line-clamp-2 text-sm font-semibold leading-tight">{m.name}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ClusterMemberCard
          descriptor={selected}
          cardStyle={cardStyleFor(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/** One member's expanded card, opened from a cluster popover. */
function ClusterMemberCard({
  descriptor,
  cardStyle,
  onClose,
}: {
  descriptor: MarginObjectDescriptor;
  cardStyle: React.CSSProperties;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const tx = reduceMotion ? instantTx : springTx;
  const actionRefs: ActionRefs = {
    follow: React.useRef<HTMLButtonElement | null>(null),
    like: React.useRef<HTMLButtonElement | null>(null),
    web: React.useRef<HTMLButtonElement | null>(null),
  };
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Claim on mount: collapses the popover (and anything else) through
  // the shared registry. Being superseded later closes this card.
  const { requestOpen } = useClaim(descriptor.objectId, onClose);
  React.useEffect(() => {
    requestOpen();
  }, [requestOpen]);

  const handleClose = React.useCallback(() => {
    claimExpanded(null);
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    const onDown = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) handleClose();
    };
    const t = setTimeout(() => document.addEventListener("pointerdown", onDown), 80);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [handleClose]);

  return (
    <motion.div
      data-testid="object-circle-card"
      ref={cardRef}
      role="group"
      aria-label={`${descriptor.name}: follow, like, website actions`}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button")) handleClose();
      }}
      className="rounded-full bg-neutral-900"
      style={{
        ...cardStyle,
        position: "fixed",
        width: EXPANDED_D,
        height: EXPANDED_D,
        zIndex: 61,
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.22), 0 0 44px rgba(232,180,90,0.20), 0 18px 50px rgba(0,0,0,0.55)",
      }}
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={tx}
    >
      <ObjectCardInner descriptor={descriptor} actionRefs={actionRefs} />
    </motion.div>
  );
}

/** Back chevron used by the mobile sheet card view. Exported for reuse. */
export function BackButton({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label={label}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white"
      style={{ background: "rgba(255,255,255,0.08)" }}
    >
      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
