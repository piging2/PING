"use client";

/**
 * MobileSheet: the mobile projection of the object layer.
 * (Nolan, 2026-09-22: do NOT emulate desktop margins on mobile.)
 *
 * Same object model, different spatial projection: a small edge tab
 * (no hover, no obscured article text, no horizontal overflow) opens a
 * bottom sheet listing the page's objects; tapping one shows the same
 * content as desktop in three steps: object list -> peek -> pinned rich
 * card. The peek card and the rich card are the exact same components
 * the desktop layer renders; the sheet only changes their spatial
 * projection (relative, full sheet width).
 */

import * as React from "react";
import { ChevronRight, X } from "lucide-react";
import { claimExpanded, subscribeExpanded, subscribeOpenRequest } from "./expansion";
import { BackButton, ObjectPeekCard, ObjectRichCard } from "./ObjectCircle";
import type { MarginObjectDescriptor } from "./types";

export function MobileSheet({
  objects,
  onClose,
}: {
  objects: MarginObjectDescriptor[];
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = objects.find((o) => o.objectId === selectedId) ?? null;
  const [sheetExpanded, setSheetExpanded] = React.useState(false);
  const [sheetAskOpen, setSheetAskOpen] = React.useState(false);

  // Selecting a different object resets to the peek step.
  React.useEffect(() => {
    setSheetExpanded(false);
    setSheetAskOpen(false);
  }, [selectedId]);

  // Peer jump: a related-object link in any card selects that object here.
  React.useEffect(
    () =>
      subscribeOpenRequest((id) => {
        if (objects.some((o) => o.objectId === id)) setSelectedId(id);
      }),
    [objects],
  );

  // Claim the sheet slot on mount (collapses any stray expanded card);
  // being superseded closes the sheet.
  React.useEffect(() => {
    claimExpanded("sheet");
    const unsub = subscribeExpanded((active) => {
      if (active !== "sheet") onClose();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unsub();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="pointer-events-auto fixed inset-0 z-50" data-testid="mobile-object-sheet">
      <div aria-hidden="true" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="PING objects on this page"
        className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-neutral-950 p-4 pb-8"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-widest text-honey">PING objects</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close object list"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {selected ? (
          <div>
            <div className="mb-3">
              <BackButton
                onBack={() => setSelectedId(null)}
                label="Back to object list"
              />
            </div>
            {sheetExpanded ? (
              <ObjectRichCard
                descriptor={selected}
                style={{ position: "relative", width: "100%" }}
                askOpen={sheetAskOpen}
              />
            ) : (
              <ObjectPeekCard
                descriptor={selected}
                style={{ position: "relative", width: "100%" }}
                onExpand={() => setSheetExpanded(true)}
                onAsk={() => {
                  setSheetAskOpen(true);
                  setSheetExpanded(true);
                }}
              />
            )}
            <p className="mt-3 text-center text-sm font-semibold text-white/80">{selected.name}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {objects.map((o) => (
              <li key={o.objectId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(o.objectId)}
                  aria-label={`View ${o.name}`}
                  className="flex min-h-[56px] w-full items-center gap-3 rounded-xl p-2 text-left text-white hover:bg-white/10"
                >
                  <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                    {o.imageSrc ? (
                      <img
                        src={o.imageSrc}
                        srcSet={o.imageSrcSet ?? undefined}
                        sizes="88px"
                        alt=""
                        aria-hidden="true"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white"
                        style={{
                          background:
                            "radial-gradient(circle at 35% 30%, #8a6f4d, #3a3226)",
                        }}
                      >
                        {o.name.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 flex-1 text-sm font-semibold leading-tight">
                    {o.name}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-white/50" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
