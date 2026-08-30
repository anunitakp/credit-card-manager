"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A popover panel anchored to a trigger element, rendered into `document.body`.
 *
 * The portal is not decoration — it is the fix for the whole class of
 * "the dropdown is hidden behind the next card" bugs. Every glass surface
 * sets `backdrop-filter`, and that creates a stacking context. A panel
 * absolutely positioned inside one card can therefore never paint above a
 * later sibling card, no matter what z-index it is given: the browser paints
 * whole cards in order, children and all. Escaping to the body puts the panel
 * in the root stacking context, where its z-index actually means something.
 *
 * Position is recomputed on scroll and resize so the panel stays glued to its
 * trigger.
 */

interface Props {
  open: boolean;
  /** The element the panel hangs from. */
  anchorRef: React.RefObject<HTMLElement>;
  onDismiss: () => void;
  /** Which edge of the trigger the panel lines up with. */
  align?: "left" | "right";
  /** Panel matches the trigger's width instead of sizing to its content. */
  matchWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface Position {
  top: number;
  left: number;
  minWidth: number;
}

const GAP = 6;
/** Keeps a clamped panel from touching the very edge of the window. */
const MARGIN = 12;

export default function Popover({
  open,
  anchorRef,
  onDismiss,
  align = "left",
  matchWidth = false,
  className,
  children,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    function place() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();

      // Clamp into the viewport. Without this a wide panel anchored to a
      // control near the right edge — the month picker on Statistics, say —
      // runs off the side of the window and loses its last column.
      const panelWidth = panelRef.current?.offsetWidth ?? rect.width;
      const ideal = align === "left" ? rect.left : rect.right - panelWidth;
      const maxLeft = Math.max(MARGIN, window.innerWidth - panelWidth - MARGIN);

      setPosition({
        top: rect.bottom + GAP,
        left: Math.min(Math.max(ideal, MARGIN), maxLeft),
        minWidth: rect.width,
      });
    }

    place();
    // The first pass runs before the panel exists, so its width is unknown and
    // the clamp above has nothing to work with. One more pass on the next
    // frame — once it has been measured — settles the final position.
    const frame = requestAnimationFrame(place);

    // `true` catches scrolling inside any ancestor, not just the window.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, align, anchorRef]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      // The panel lives outside the trigger's DOM subtree now, so both have
      // to be checked before treating a click as "outside".
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onDismiss();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onDismiss, anchorRef]);

  if (!mounted || !open || !position) return null;

  return createPortal(
    <div
      ref={panelRef}
      className={className}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        minWidth: matchWidth ? position.minWidth : undefined,
        maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
        // Above every card and the navigation, below modals (z-50).
        zIndex: 45,
        maxHeight: `calc(100vh - ${position.top + 12}px)`,
      }}
    >
      {children}
    </div>,
    document.body
  );
}
