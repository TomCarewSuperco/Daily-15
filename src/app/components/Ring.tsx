import type { ReactNode } from "react";

/*
 * One meaning per colour, everywhere:
 *   dark grey = in progress   green = target met   copper = over a budget or limit
 * A target (steps, protein, water) turns green when reached and stays green.
 * A budget (calories, carbs, fat) turns green from 90% of it and copper once over.
 * A limit (saturated fat, salt, sugars, caffeine) stays grey and turns copper once over.
 */
const IN_PROGRESS = "hsl(var(--foreground) / 0.72)";
const MET = "hsl(var(--d15-done))";
const OVER = "hsl(var(--copper))";

export function progressColour(value: number, max: number, kind: "target" | "budget" | "limit" = "target"): string {
  const r = max > 0 ? value / max : 0;
  if (kind === "limit") return value > max ? OVER : "hsl(var(--muted-foreground) / 0.55)";
  if (kind === "budget") return value > max ? OVER : r >= 0.9 ? MET : IN_PROGRESS;
  return r >= 1 ? MET : IN_PROGRESS;
}

interface RingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  className?: string;
  label?: string;
  /** 'budget' for calories: over the target shows as over, not as met. */
  kind?: "target" | "budget";
}

/** Circular progress. Fills to 100% and stays full beyond the target. */
export function Ring({ value, max, size = 120, stroke = 10, children, className = "", label, kind = "target" }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(pct * 100)}% of target`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={progressColour(value, max, kind)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Progress bar, coloured by progressColour: targets, budgets and limits. */
export function Bar({ value, max, className = "", limit = false, budget = false }: { value: number; max: number; className?: string; limit?: boolean; budget?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colour = progressColour(value, max, limit ? "limit" : budget ? "budget" : "target");
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colour }} />
    </div>
  );
}
