import { useEffect, useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

const REVEAL = 88; // width of the Delete button, px

/**
 * Swipe left to reveal Delete; swipe most of the way across to delete at once.
 * Vertical scrolling is left alone, and a tap after a swipe doesn't open the row.
 * With onDrag, pressing and holding picks the row up to drag it elsewhere.
 */
export interface DragHandlers {
  start: (x: number, y: number) => void;
  move: (x: number, y: number) => void;
  end: (x: number, y: number) => void;
}

export function SwipeRow({ children, onDelete, label = "Delete", bg = "bg-card", onDrag, disabled = false }: { children: ReactNode; onDelete: () => void; label?: string; bg?: string; onDrag?: DragHandlers; disabled?: boolean }) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(null);
  const moved = useRef(false);
  const width = useRef(320);
  const row = useRef<HTMLDivElement>(null);
  const hold = useRef<number>();
  const lifted = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  // While an item is lifted, stop the page scrolling under the finger (needs a non-passive listener on iOS).
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const block = (e: TouchEvent) => {
      if (lifted.current) e.preventDefault();
    };
    el.addEventListener("touchmove", block, { passive: false });
    return () => el.removeEventListener("touchmove", block);
  }, []);

  const down = (e: React.PointerEvent) => {
    if (disabled) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, base: x, horizontal: null };
    moved.current = false;
    width.current = row.current?.offsetWidth ?? 320;
    last.current = { x: e.clientX, y: e.clientY };
    if (onDrag && x === 0) {
      const target = e.currentTarget as HTMLElement;
      const id = e.pointerId;
      hold.current = window.setTimeout(() => {
        lifted.current = true;
        moved.current = true;
        try {
          target.setPointerCapture(id);
        } catch {
          /* pointer already gone */
        }
        try {
          navigator.vibrate?.(30);
        } catch {
          /* unsupported */
        }
        onDrag.start(last.current.x, last.current.y);
      }, 450);
    }
  };
  const move = (e: React.PointerEvent) => {
    last.current = { x: e.clientX, y: e.clientY };
    if (lifted.current) {
      onDrag?.move(e.clientX, e.clientY);
      return;
    }
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) window.clearTimeout(hold.current);
    if (s.horizontal === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.horizontal = Math.abs(dx) > Math.abs(dy);
      if (s.horizontal) {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
      }
    }
    if (!s.horizontal) return;
    moved.current = true;
    setX(Math.min(0, Math.max(-width.current, s.base + dx)));
  };
  const up = (e: React.PointerEvent) => {
    window.clearTimeout(hold.current);
    if (lifted.current) {
      lifted.current = false;
      start.current = null;
      onDrag?.end(e.clientX, e.clientY);
      return;
    }
    const s = start.current;
    start.current = null;
    setDragging(false);
    if (!s?.horizontal) return;
    if (x < -width.current * 0.55) {
      setX(-width.current);
      window.setTimeout(onDelete, 150);
    } else setX(x < -REVEAL / 2 ? -REVEAL : 0);
  };

  return (
    <div ref={row} className="relative overflow-hidden">
      <button
        type="button"
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-1 bg-destructive pr-4 text-sm font-medium text-destructive-foreground"
        style={{ width: Math.max(REVEAL, -x) }}
        aria-label={label}
        tabIndex={x < 0 ? 0 : -1}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
      <div
        className={`relative ${bg}`}
        style={{ transform: `translateX(${x}px)`, transition: dragging ? "none" : "transform 0.2s ease", touchAction: "pan-y", WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
        onContextMenu={(e) => onDrag && e.preventDefault()}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClickCapture={(e) => {
          // A swipe isn't a tap; a tap on an open row closes it.
          if (moved.current || x !== 0) {
            e.stopPropagation();
            e.preventDefault();
            moved.current = false;
            if (x !== 0 && x > -width.current) setX(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
