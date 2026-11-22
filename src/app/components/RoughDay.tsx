import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDay, todayKey } from "../calc";
import { toast } from "../notify";
import { ROUGH_LEVELS, roughEntries, typicalDay } from "../rough";
import { useDaily15 } from "../store";
import type { RoughLevel } from "../types";

/**
 * One-tap estimate for a day (or the rest of a day) that wasn't logged.
 * compact: the Home prompt, without the drinks counter or the explanation.
 */
export function RoughDay({ date, scope, compact = false, onDone }: { date: string; scope: "day" | "rest"; compact?: boolean; onDone?: () => void }) {
  const { state, update } = useDaily15();
  const [units, setUnits] = useState(0);
  const typical = typicalDay(state, date);

  const choose = (level: RoughLevel) => {
    const entries = roughEntries(state, date, level, scope, units);
    if (!entries.length) return;
    const ids = new Set(entries.map((e) => e.id));
    update((s) => ({ ...s, foods: [...s.foods, ...entries] }));
    const kcal = entries.reduce((t, e) => t + e.kcal, 0);
    toast.undo(`Estimated ${kcal.toLocaleString("en-GB")} kcal for ${date === todayKey() ? "today" : formatDay(date, { weekday: "long" })}`, () =>
      update((s) => ({ ...s, foods: s.foods.filter((f) => !ids.has(f.id)) })),
    );
    onDone?.();
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {ROUGH_LEVELS.map((l) => (
          <Button key={l.value} variant="outline" className="h-auto whitespace-normal py-2.5 text-sm" onClick={() => choose(l.value)}>
            {l.label}
          </Button>
        ))}
      </div>
      {!compact && (
        <>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span>Drinks, if any</span>
            <span className="flex items-center gap-2">
              <button className="h-8 w-8 rounded-full border" onClick={() => setUnits((u) => Math.max(0, u - 1))} aria-label="Fewer units"><Minus className="mx-auto h-3.5 w-3.5" /></button>
              <span className="w-16 text-center tabular-nums">{units} {units === 1 ? "unit" : "units"}</span>
              <button className="h-8 w-8 rounded-full border" onClick={() => setUnits((u) => Math.min(30, u + 1))} aria-label="More units"><Plus className="mx-auto h-3.5 w-3.5" /></button>
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">A pint of ordinary beer is about 2 units, a 175 ml glass of wine about 2, a single spirit 1.</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {typical.days
              ? `Based on your typical day: ${Math.round(typical.kcal).toLocaleString("en-GB")} kcal, the average of ${typical.days} completed days in the last four weeks.`
              : `Based on your calorie target (${Math.round(typical.kcal).toLocaleString("en-GB")} kcal) until you've marked a few days complete. Then it uses your own typical day.`}{" "}
            {typical.realityKcal > 0 && `Includes about ${typical.realityKcal} kcal added because your weight trend suggests you eat a little more than you log. `}
            Shown as an estimate; the weekly review counts it as such.
          </p>
        </>
      )}
    </div>
  );
}
