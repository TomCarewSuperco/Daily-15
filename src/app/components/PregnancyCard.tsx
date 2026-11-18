import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { todayKey } from "../calc";
import { CAFFEINE_LIMIT_MG, caffeineOn, guidanceFor, lifeStageOf, NHS_LINKS, pregnancyWeek, supplementsFor, supplementsTaken, trimester } from "../pregnancy";
import { useDaily15 } from "../store";
import { Bar } from "./Ring";
import { Card, CardHeading } from "./Section";

export function PreviewBadge() {
  return <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Preview</span>;
}

/** Today's supplements, caffeine and a link to the guidance. Home tab, pregnancy or breastfeeding only. */
export function PregnancyCard() {
  const { state, update } = useDaily15();
  const stage = lifeStageOf(state.profile);
  const [open, setOpen] = useState(false);
  if (!stage) return null;
  const today = todayKey();
  const week = pregnancyWeek(stage.dueDate);
  const tri = trimester(week);
  const taken = supplementsTaken(state, today);
  const caffeine = caffeineOn(state, today);

  const toggle = (id: string) =>
    update((s) => {
      const cur = s.supplements?.[today] ?? [];
      return { ...s, supplements: { ...s.supplements, [today]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } };
    });

  return (
    <Card>
      <CardHeading action={<button className="text-xs underline" onClick={() => setOpen(true)}>What to eat and avoid</button>}>
        {stage.kind === "pregnant" ? (week ? `Week ${week}${tri ? ` · trimester ${tri}` : ""}` : "Pregnancy") : "Breastfeeding"}
        <PreviewBadge />
      </CardHeading>
      <div className="space-y-2">
        {supplementsFor(stage).map((sup) => {
          const done = taken.includes(sup.id);
          return (
            <button key={sup.id} role="checkbox" aria-checked={done} onClick={() => toggle(sup.id)} className="flex w-full items-center gap-3 rounded-xl border p-2.5 text-left">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${done ? "border-transparent bg-[hsl(var(--d15-done))] text-white" : ""}`}>{done && <Check className="h-4 w-4" />}</span>
              <span className="flex-1">
                <span className="block text-sm font-medium">{sup.label}</span>
                <span className="block text-xs text-muted-foreground">{sup.detail}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-sm">
        <div className="mb-1 flex justify-between">
          <span>Caffeine today</span>
          <span className={`tabular-nums ${caffeine > CAFFEINE_LIMIT_MG ? "text-destructive" : "text-muted-foreground"}`}>{caffeine} / {CAFFEINE_LIMIT_MG} mg</span>
        </div>
        <Bar value={caffeine} max={CAFFEINE_LIMIT_MG} limit />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Calorie targets and weight-loss advice are off. Your midwife is the best person to advise on your diet and weight.</p>
      <GuidanceSheet open={open} onOpenChange={setOpen} />
    </Card>
  );
}

export function GuidanceSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state } = useDaily15();
  const stage = lifeStageOf(state.profile);
  if (!stage) return null;
  const links =
    stage.kind === "pregnant"
      ? [
          ["Healthy diet in pregnancy", NHS_LINKS.pregnantDiet],
          ["Foods to avoid in pregnancy", NHS_LINKS.foodsToAvoid],
          ["Vitamins and supplements", NHS_LINKS.supplements],
          ["Exercise in pregnancy", NHS_LINKS.exercise],
        ]
      : [["Your diet while breastfeeding", NHS_LINKS.breastfeedingDiet]];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-md overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{stage.kind === "pregnant" ? "Eating well in pregnancy" : "Eating well while breastfeeding"}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-5 pb-6 text-sm">
          <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            A summary of general NHS guidance. It's a preview that hasn't yet been checked by a midwife or dietitian. Follow your midwife's advice, and read the full NHS pages below.
          </p>
          {guidanceFor(stage).map((sec) => (
            <section key={sec.title}>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{sec.title}</h4>
              <ul className="list-disc space-y-1 pl-5">{sec.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
            </section>
          ))}
          <section>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">NHS website</h4>
            <ul className="space-y-1.5">
              {links.map(([label, href]) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline">
                    {label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
