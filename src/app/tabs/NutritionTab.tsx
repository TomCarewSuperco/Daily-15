import { useEffect, useState } from "react";
import { BookmarkPlus, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "../notify";
import { SwipeRow } from "../components/SwipeRow";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addDays, ALCOHOL_UNITS_PER_WEEK, alcoholUnits, coverage, FIVE_A_DAY, fiveADayOn, foodsOn, formatDay, lastNDays, limitsFor, sumNutrients, todayKey, uid } from "../calc";
import { AddFoodSheet, entryFromPending, MEALS, NutrientGrid, PortionPicker, type Pending } from "../components/AddFoodSheet";
import { Choice, Field, NumField } from "../components/Field";
import { Bar, Ring } from "../components/Ring";
import { Card, CardHeading, Estimate } from "../components/Section";
import type { Intent } from "../nav";
import { useDaily15 } from "../store";
import type { FoodEntry, Meal, Nutrients } from "../types";
import { CAFFEINE_LIMIT_MG, caffeineOn, flagsForFood, lifeStageOf } from "../pregnancy";
import { TriangleAlert } from "lucide-react";

export function NutritionTab({ intent, clearIntent }: { intent: Intent; clearIntent: () => void }) {
  const { state, update } = useDaily15();
  const t = state.profile!.targets;
  const limits = limitsFor(state.profile!);
  const focus = new Set(state.profile!.focus ?? []);
  const stage = lifeStageOf(state.profile);
  const [date, setDate] = useState(todayKey());
  const [sheet, setSheet] = useState<{ open: boolean; meal?: Meal }>({ open: false });
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const deleteEntry = (f: FoodEntry) => {
    update((s) => ({ ...s, foods: s.foods.filter((x) => x.id !== f.id) }));
    toast.undo(`${f.name} deleted`, () => update((s) => (s.foods.some((x) => x.id === f.id) ? s : { ...s, foods: [...s.foods, f] })));
  };

  useEffect(() => {
    if (intent === "add-food") setSheet({ open: true });
    if (intent) clearIntent();
  }, [intent, clearIntent]);

  const foods = foodsOn(state, date);
  const total = sumNutrients(foods);
  const remaining = t.calories - total.kcal;
  const water = state.water[date] ?? 0;
  const isToday = date === todayKey();
  const fiveADay = fiveADayOn(state, date);
  const weekUnits = alcoholUnits(state, lastNDays(7, date));

  const saveMealGroup = (meal: Meal, items: FoodEntry[]) => {
    const n = sumNutrients(items);
    const name = `${formatDay(date, { day: "numeric", month: "short" })} ${meal}`;
    update((s) => ({ ...s, savedMeals: [...s.savedMeals, { id: uid(), name: items.map((i) => i.name).slice(0, 3).join(", ") || name, portion: "1 meal", ...n }] }));
    toast.success("Meal saved for quick logging");
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between pt-2">
        <h1 className="text-4xl">Nutrition</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[5.5rem] text-center text-sm">{isToday ? "Today" : formatDay(date, { weekday: "short", day: "numeric", month: "short" })}</span>
          <Button variant="ghost" size="icon" disabled={isToday} onClick={() => setDate(addDays(date, 1))} aria-label="Next day"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </header>

      <Card>
        <div className="flex items-center gap-4">
          <Ring value={stage ? 0 : total.kcal} max={t.calories} size={128} label={stage ? "Calories eaten" : "Calories eaten against target"}>
            <div className="text-2xl font-semibold tabular-nums">{(stage ? total.kcal : Math.abs(remaining)).toLocaleString("en-GB")}</div>
            <div className="text-[11px] text-muted-foreground">{stage ? "kcal eaten" : remaining >= 0 ? "kcal left" : "kcal over"}</div>
          </Ring>
          {stage ? (
            <p className="flex-1 text-sm text-muted-foreground">Calorie targets are off while you're {stage.kind === "pregnant" ? "pregnant" : "breastfeeding"}. Eat to appetite and follow your midwife's advice.</p>
          ) : (
          <div className="flex-1 space-y-1 text-sm tabular-nums">
            <div className="flex justify-between"><span className="text-muted-foreground">Target</span><span>{t.calories.toLocaleString("en-GB")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Eaten</span><span>{total.kcal.toLocaleString("en-GB")}</span></div>
            <div className="flex justify-between font-medium"><span>Remaining</span><span>{remaining.toLocaleString("en-GB")}</span></div>
          </div>
          )}
        </div>
        <div className="mt-4 space-y-2.5 text-sm">
          {([
            ["Protein", total.protein, t.proteinG],
            ["Carbohydrate", total.carbs, t.carbsG],
            ["Fat", total.fat, t.fatG],
            ["Fibre", total.fibre, t.fibreG],
          ] as const).map(([label, v, max]) =>
            stage && label !== "Fibre" ? (
              <div key={label} className="flex justify-between"><span>{label}</span><span className="tabular-nums text-muted-foreground">{Math.round(v)} g</span></div>
            ) : (
              <div key={label}>
                <div className="mb-1 flex justify-between"><span>{label}</span><span className="tabular-nums text-muted-foreground">{Math.round(v)} / {max} g</span></div>
                <Bar value={v} max={max} />
              </div>
            ),
          )}
          <div className="space-y-2.5 border-t pt-3">
            {([
              ["Saturated fat", total.satFat, limits.satFatG, "satFat", "cholesterol"],
              ["Sugars", total.sugars, limits.sugarsG, "sugars", "sugar"],
              ["Salt", total.salt, limits.saltG, "salt", "salt"],
            ] as const).map(([label, v, max, field, goal]) => {
              const known = coverage(foods, field);
              return (
                <div key={label}>
                  <div className="mb-1 flex justify-between">
                    <span className={focus.has(goal) ? "font-medium" : ""}>{label}{focus.has(goal) && <span className="ml-1.5 rounded bg-copper/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-copper">Focus</span>}</span>
                    <span className="tabular-nums text-muted-foreground">{(v ?? 0).toFixed(field === "salt" ? 1 : 0)} / {max} g limit</span>
                  </div>
                  <Bar value={v ?? 0} max={max} limit />
                  {foods.length > 0 && known < 0.9 && <p className="mt-0.5 text-[11px] text-muted-foreground">Not known for some of today's food, so the real figure may be higher.</p>}
                </div>
              );
            })}
            <div>
              <div className="mb-1 flex justify-between">
                <span className={focus.has("fruit-veg") ? "font-medium" : ""}>Fruit and veg</span>
                <span className="tabular-nums text-muted-foreground">{fiveADay} / {FIVE_A_DAY} portions</span>
              </div>
              <Bar value={fiveADay} max={FIVE_A_DAY} />
            </div>
            {stage && (
              <div>
                <div className="mb-1 flex justify-between">
                  <span className="font-medium">Caffeine</span>
                  <span className={`tabular-nums ${caffeineOn(state, date) > CAFFEINE_LIMIT_MG ? "text-destructive" : "text-muted-foreground"}`}>{caffeineOn(state, date)} / {CAFFEINE_LIMIT_MG} mg limit</span>
                </div>
                <Bar value={caffeineOn(state, date)} max={CAFFEINE_LIMIT_MG} limit />
              </div>
            )}
            {(weekUnits > 0 || focus.has("alcohol")) && (
              <div className="flex justify-between">
                <span className={focus.has("alcohol") ? "font-medium" : ""}>Alcohol, last seven days</span>
                <span className={`tabular-nums ${weekUnits > ALCOHOL_UNITS_PER_WEEK ? "text-destructive" : "text-muted-foreground"}`}>{weekUnits} / {ALCOHOL_UNITS_PER_WEEK} units</span>
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 flex justify-between"><span>Water</span><span className="tabular-nums text-muted-foreground">{(water / 1000).toFixed(2)} / {(t.waterMl / 1000).toFixed(1)} L</span></div>
            <Bar value={water} max={t.waterMl} />
            <div className="mt-2 flex gap-2">
              {[250, 500].map((ml) => (
                <Button key={ml} variant="outline" size="sm" className="h-8 flex-1 text-xs" onClick={() => update((s) => ({ ...s, water: { ...s.water, [date]: (s.water[date] ?? 0) + ml } }))}>+ {ml} ml</Button>
              ))}
              {water > 0 && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => update((s) => ({ ...s, water: { ...s.water, [date]: Math.max(0, (s.water[date] ?? 0) - 250) } }))}>Undo</Button>}
            </div>
          </div>
        </div>
        {total.kcal > 0 && <MacroSplit n={total} />}
      </Card>

      {MEALS.map(({ value: meal, label }) => {
        const items = foods.filter((f) => f.meal === meal);
        const n = sumNutrients(items);
        return (
          <Card key={meal}>
            <CardHeading
              action={
                <div className="flex items-center gap-1">
                  <span className="text-sm tabular-nums text-muted-foreground">{n.kcal} kcal</span>
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => saveMealGroup(meal, items)} aria-label={`Save ${label} as a meal`}>
                      <BookmarkPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              }
            >
              {label}
            </CardHeading>
            {items.length > 0 && (
              <ul className="mb-2 divide-y">
                {items.map((f) => (
                  <li key={f.id}>
                    <SwipeRow label={`Delete ${f.name}`} onDelete={() => deleteEntry(f)}>
                    <button className="flex w-full items-center justify-between py-2 text-left" onClick={() => setEditing(f)}>
                      <div>
                        <div className="text-sm">
                          {flagsForFood(stage, f).length > 0 && <TriangleAlert className="mr-1 inline h-3.5 w-3.5 text-destructive" aria-label="Not usually advised" />}
                          {f.name}{f.estimated && <Estimate />}
                        </div>
                        <div className="text-xs text-muted-foreground">{f.portion} · P {Math.round(f.protein)} g</div>
                      </div>
                      <span className="text-sm tabular-nums">{f.kcal}</span>
                    </button>
                    </SwipeRow>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setSheet({ open: true, meal })}>
              <Plus className="mr-1 h-3.5 w-3.5" />Add to {label.toLowerCase()}
            </Button>
          </Card>
        );
      })}

      <p className="px-1 text-[11px] text-muted-foreground">
        Values marked Est. come from the built-in list or Open Food Facts and may differ from your product. Tap any item to correct it.
      </p>

      <AddFoodSheet open={sheet.open} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))} date={date} meal={sheet.meal} />
      <EditFoodDialog entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function MacroSplit({ n }: { n: Nutrients }) {
  const p = n.protein * 4;
  const c = n.carbs * 4;
  const f = n.fat * 9;
  const sum = p + c + f || 1;
  const parts = [
    { label: "Protein", v: p, cls: "bg-foreground" },
    { label: "Carbs", v: c, cls: "bg-copper" },
    { label: "Fat", v: f, cls: "bg-muted-foreground/50" },
  ];
  return (
    <div className="mt-4">
      <div className="flex h-2.5 overflow-hidden rounded-full">
        {parts.map((x) => <div key={x.label} className={x.cls} style={{ width: `${(x.v / sum) * 100}%` }} />)}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        {parts.map((x) => (
          <span key={x.label} className="flex items-center gap-1"><span className={`inline-block h-2 w-2 rounded-full ${x.cls}`} />{x.label} {Math.round((x.v / sum) * 100)}%</span>
        ))}
      </div>
    </div>
  );
}

function EditFoodDialog({ entry, onClose }: { entry: FoodEntry | null; onClose: () => void }) {
  const { update } = useDaily15();
  const [e, setE] = useState<FoodEntry | null>(entry);
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => {
    setE(entry);
    setPending(entry?.source ? { ...entry.source } : null);
  }, [entry]);
  if (!e || !entry) return null;
  const set = (k: keyof Nutrients, v: number | "") => setE({ ...e, [k]: typeof v === "number" ? v : k === "satFat" || k === "sugars" || k === "salt" ? undefined : 0 });
  const recalculated = pending ? { ...e, ...entryFromPending(pending) } : null;

  const save = () => {
    if (recalculated) {
      update((s) => ({ ...s, foods: s.foods.map((f) => (f.id === e.id ? recalculated : f)) }));
    } else {
      const changed = (["kcal", "protein", "carbs", "fat", "fibre", "satFat", "sugars", "salt"] as const).some((k) => e[k] !== entry[k]);
      update((s) => ({ ...s, foods: s.foods.map((f) => (f.id === e.id ? { ...e, estimated: changed ? false : e.estimated } : f)) }));
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{e.name}</DialogTitle>
          <DialogDescription>{pending ? "Change the amount or move it to another meal." : "Change the meal, or correct the values from the label."}</DialogDescription>
        </DialogHeader>
        <Field label="Meal">
          <Choice columns={4} value={e.meal} onChange={(m) => setE({ ...e, meal: m })} options={MEALS} />
        </Field>
        {pending && recalculated ? (
          <>
            <PortionPicker pending={pending} setPending={setPending} />
            <NutrientGrid n={recalculated} />
          </>
        ) : (
          <>
            <Field label="Name"><Input value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} /></Field>
            <Field label="Portion" hint="Changing this text doesn't change the values below. To log a different amount, delete this entry and add it again.">
              <Input value={e.portion} onChange={(x) => setE({ ...e, portion: x.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Calories" value={e.kcal} onChange={(v) => set("kcal", v)} suffix="kcal" />
              <NumField label="Protein" value={e.protein} onChange={(v) => set("protein", v)} suffix="g" step={0.1} />
              <NumField label="Carbohydrate" value={e.carbs} onChange={(v) => set("carbs", v)} suffix="g" step={0.1} />
              <NumField label="Fat" value={e.fat} onChange={(v) => set("fat", v)} suffix="g" step={0.1} />
              <NumField label="Fibre" value={e.fibre} onChange={(v) => set("fibre", v)} suffix="g" step={0.1} />
              <NumField label="Saturates" value={e.satFat ?? ""} onChange={(v) => set("satFat", v)} suffix="g" step={0.1} />
              <NumField label="Sugars" value={e.sugars ?? ""} onChange={(v) => set("sugars", v)} suffix="g" step={0.1} />
              <NumField label="Salt" value={e.salt ?? ""} onChange={(v) => set("salt", v)} suffix="g" step={0.01} />
            </div>
            <NutrientGrid n={e} />
          </>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { update((s) => ({ ...s, foods: s.foods.filter((f) => f.id !== e.id) })); onClose(); }}>
            <Trash2 className="mr-1 h-4 w-4" />Delete
          </Button>
          <Button className="flex-1" onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
