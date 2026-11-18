import type { ReactNode } from "react";

interface RingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  className?: string;
  label?: string;
}

/** Circular progress. Fills to 100% and stays full beyond the target. */
export function Ring({ value, max, size = 120, stroke = 10, children, className = "", label }: RingProps) {
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
          stroke={pct >= 1 ? "hsl(var(--d15-done))" : "hsl(var(--copper))"}
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

export function Bar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "hsl(var(--d15-done))" : "hsl(var(--copper))" }} />
    </div>
  );
}
