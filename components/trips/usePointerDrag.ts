"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Movement, in px, before a press counts as a drag rather than a tap. */
const MOVE_THRESHOLD = 6;
/** How near the viewport edge the pointer must get before the page scrolls. */
const EDGE_BAND = 84;
/** Peak auto-scroll speed, in px per frame, right at the edge. */
const EDGE_SPEED = 16;

interface Point {
  x: number;
  y: number;
}

/**
 * Drag-and-drop that works with a finger as well as a mouse.
 *
 * The HTML5 drag events this replaces never fire on touch — there is no
 * `dragstart` behind a tap — so the drag path on this page worked on desktop
 * only. Pointer events cover mouse, pen and touch through one API, so this
 * drives all three and finds the drop target itself, by hit-testing for a
 * `data-drop-id` under the pointer rather than leaning on the browser's own
 * drop plumbing.
 *
 * Touch drags must start from an element carrying {@link handleProps}, which
 * sets `touch-action: none`. Without a dedicated handle the browser claims the
 * gesture as a scroll and cancels the drag mid-way; confining the opt-out to
 * the grip means the list still scrolls normally everywhere else.
 */
export function usePointerDrag(onDrop: (dragId: string, dropId: string) => void) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [point, setPoint] = useState<Point | null>(null);

  /** A press that has happened but has not yet moved far enough to be a drag. */
  const armed = useRef<{ id: string; origin: Point; immediate: boolean } | null>(null);
  const active = useRef(false);
  const pointRef = useRef<Point | null>(null);
  const overRef = useRef<string | null>(null);
  const frame = useRef<number | null>(null);

  // Kept in a ref so the window listeners below never close over a stale one.
  const onDropRef = useRef(onDrop);
  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  const stop = useCallback(() => {
    armed.current = null;
    active.current = false;
    pointRef.current = null;
    overRef.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    document.body.style.removeProperty("user-select");
    setDragId(null);
    setOverId(null);
    setPoint(null);
  }, []);

  /** Asks which drop target, if any, sits under the pointer. */
  const hitTest = useCallback((p: Point) => {
    const el = document.elementFromPoint(p.x, p.y);
    const target = el?.closest<HTMLElement>("[data-drop-id]")?.dataset.dropId ?? null;
    if (target !== overRef.current) {
      overRef.current = target;
      setOverId(target);
    }
  }, []);

  /**
   * Runs while a drag is live: scrolls the page near the edges, then re-tests
   * what is underneath. Repeating the hit test here as well as on move is what
   * keeps the highlight right while the page auto-scrolls under a finger that
   * is being held still.
   */
  const track = useCallback(() => {
    const p = pointRef.current;
    if (p) {
      if (p.y < EDGE_BAND) {
        window.scrollBy(0, -EDGE_SPEED * (1 - p.y / EDGE_BAND));
      } else if (p.y > window.innerHeight - EDGE_BAND) {
        window.scrollBy(0, EDGE_SPEED * (1 - (window.innerHeight - p.y) / EDGE_BAND));
      }
      hitTest(p);
    }
    frame.current = requestAnimationFrame(track);
  }, [hitTest]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const pending = armed.current;
      if (!pending) return;

      const here = { x: e.clientX, y: e.clientY };

      if (!active.current) {
        const far =
          Math.abs(here.x - pending.origin.x) > MOVE_THRESHOLD ||
          Math.abs(here.y - pending.origin.y) > MOVE_THRESHOLD;
        if (!pending.immediate && !far) return;

        active.current = true;
        // Stops the drag from painting a text selection across the page behind
        // the ghost, which a mouse drag otherwise does.
        document.body.style.setProperty("user-select", "none");
        setDragId(pending.id);
        frame.current = requestAnimationFrame(track);
      }

      e.preventDefault();
      pointRef.current = here;
      setPoint(here);
      // Also tested here, not just in the frame loop, so a drag that ends
      // within a frame of starting still knows what it was dropped on.
      hitTest(here);
    }

    function onUp() {
      const pending = armed.current;
      const target = overRef.current;
      const wasActive = active.current;
      stop();
      if (wasActive && pending && target) onDropRef.current(pending.id, target);
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", stop);
    };
  }, [stop, track, hitTest]);

  useEffect(() => stop, [stop]);

  /**
   * Arms a drag for `id`. From a handle the drag begins on the first move;
   * from the row body a mouse has to travel a few pixels first, so an ordinary
   * click still reads as a click.
   */
  const begin = useCallback(
    (e: React.PointerEvent, id: string, fromHandle: boolean) => {
      // Leave the row's own buttons alone — a tap on "Add to trip" is not a drag.
      if (!fromHandle && (e.target as HTMLElement).closest("button")) return;
      if (!fromHandle && e.pointerType !== "mouse") return;
      if (e.button !== 0 && e.pointerType === "mouse") return;

      armed.current = {
        id,
        origin: { x: e.clientX, y: e.clientY },
        immediate: fromHandle,
      };
    },
    []
  );

  return {
    /** Set once the press has turned into a real drag. */
    dragId,
    /** The `data-drop-id` currently under the pointer. */
    overId,
    /** Where to paint the drag ghost, in viewport coordinates. */
    point,
    /** Spread on the row itself — starts a mouse drag after a few pixels. */
    rowProps: (id: string) => ({
      onPointerDown: (e: React.PointerEvent) => begin(e, id, false),
    }),
    /**
     * Spread on the grip. Whatever carries this must also set
     * `touch-action: none` (Tailwind's `touch-none`), or the browser will
     * treat a touch drag as a scroll and cancel it.
     */
    handleProps: (id: string) => ({
      onPointerDown: (e: React.PointerEvent) => {
        e.stopPropagation();
        begin(e, id, true);
      },
    }),
  };
}
