import type { MeasurementEntry } from "../types";

export type MeasureKey = keyof Pick<MeasurementEntry, "waistCm" | "chestCm" | "hipsCm" | "armCm" | "thighCm">;

/** Where to put the tape, one line each. */
export const MEASURE_HOW: Record<MeasureKey, string> = {
  waistCm: "Waist: at your belly button, standing relaxed, after breathing out. Don't pull your stomach in.",
  chestCm: "Chest: around the fullest part, just under the armpits, arms by your sides.",
  hipsCm: "Hips: around the widest part of your bottom, feet together.",
  armCm: "Upper arm: halfway between shoulder and elbow, arm hanging loose. Same arm each time.",
  thighCm: "Thigh: around the widest part, just below your bottom. Same leg each time.",
};

/** Tape lines on a simple front-view outline: [x1, y1, x2, y2]. */
const LINES: Record<MeasureKey, [number, number, number, number]> = {
  chestCm: [38, 58, 82, 58],
  waistCm: [40, 80, 80, 80],
  hipsCm: [37, 100, 83, 100],
  armCm: [84.5, 70, 92, 70],
  thighCm: [38.5, 125, 57.5, 125],
};

const BODY =
  "M52,32 L68,32 L70,38 L84,42 Q90,44 90,52 L95,94 L88,96 L83,62 L81,64 L80,80 L83,100 L78,186 L66,186 L62,112 L58,112 L54,186 L42,186 L37,100 L40,80 L39,64 L37,62 L32,96 L25,94 L30,52 Q30,44 36,42 L50,38 Z";

export function MeasureDiagram({ active }: { active: MeasureKey }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
      <svg viewBox="20 6 80 184" className="h-48 w-auto shrink-0" role="img" aria-label="Where to measure">
        <circle cx="60" cy="20" r="11" className="fill-background stroke-muted-foreground" strokeWidth="1.2" />
        <path d={BODY} className="fill-background stroke-muted-foreground" strokeWidth="1.2" strokeLinejoin="round" />
        {(Object.keys(LINES) as MeasureKey[]).map((k) => {
          const [x1, y1, x2, y2] = LINES[k];
          const on = k === active;
          // Torso lines run a little past the body, like a tape; limb lines stay on the limb.
          const over = k === "armCm" || k === "thighCm" ? 0.5 : 2;
          return (
            <line
              key={k}
              x1={x1 - over}
              y1={y1}
              x2={x2 + over}
              y2={y2}
              strokeLinecap="round"
              strokeWidth={on ? 3 : 1.5}
              strokeDasharray={on ? undefined : "2 2.5"}
              className={on ? "stroke-copper" : "stroke-muted-foreground/50"}
            />
          );
        })}
      </svg>
      <p className="text-sm" aria-live="polite">{MEASURE_HOW[active]}</p>
    </div>
  );
}
