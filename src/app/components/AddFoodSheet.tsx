import { SwipeRow } from "./SwipeRow";
import { useEffect, useMemo, useRef, useState } from "react";
import { Barcode, Camera, ChefHat, Globe, Minus, PenLine, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "../notify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { scaleNutrients, sumNutrients, uid } from "../calc";
import { extrasFor, FOOD_DB, formatQty, type FoodItem, type FoodUnit } from "../foods";
import { useDaily15 } from "../store";
import { COFID_CREDIT, householdUnitsFor, loadCofid, loadCofidByCode, matchesAll, searchFoods, sumComponents, type Row } from "../cofid";
import { CUISINES, MEALS_OUT, SIZES, type EatingOutMeal } from "../eatingOut";
import { flagsForFood, lifeStageOf } from "../pregnancy";
import type { CustomFood, FiveADayKind, FoodEntry, Meal, Nutrients } from "../types";
import { cameraAvailable, lookupBarcode, scanWithCamera, searchProducts, type OffProduct } from "./barcode";
import { Choice, Field, NumField } from "./Field";
import { Estimate } from "./Section";

export const MEALS: { value: Meal; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snacks", label: "Snacks" },
];

type Mode = "search" | "out" | "barcode" | "manual" | "recipe";

export interface Pending {
  name: string;
  /** Nutrients per `per` of `baseUnit`. */
  base: Nutrients;
  per: number;
  baseUnit: "g" | "ml" | "serving";
  /** Everyday measures. Index -1 means weigh in grams or millilitres. */
  units: FoodUnit[];
  unitIdx: number;
  qty: number;
  estimated: boolean;
  fiveADay?: FiveADayKind;
  abv?: number;
  caffeine?: number;
}

const SERVING: FoodUnit = { name: "serving", plural: "servings", g: 1 };

function fromItem(f: FoodItem | CustomFood, estimated: boolean): Pending {
  if (f.unit === "serving") return { name: f.name, base: f, per: f.per, baseUnit: "serving", units: [SERVING], unitIdx: 0, qty: 1, estimated };
  const hasUnits = f.units.length > 0;
  const extra = "typical" in f ? { fiveADay: f.fiveADay, abv: f.abv, caffeine: f.caffeine } : {};
  return { name: f.name, base: f, per: f.per, baseUnit: f.unit, units: f.units, unitIdx: hasUnits ? 0 : -1, qty: hasUnits ? 1 : "typical" in f ? f.typical : 100, estimated, ...extra };
}

function fromOff(p: OffProduct): Pending {
  const units: FoodUnit[] = [];
  if (p.servingG) units.push({ name: "serving", plural: "servings", g: p.servingG });
  units.push(...householdUnitsFor(p.name));
  const pack = p.quantity?.match(/^(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
  if (pack && Number(pack[1]) > 0) units.push({ name: `pack (${p.quantity})`, plural: `packs (${p.quantity})`, g: Number(pack[1]) });
  return { name: p.name, base: p, per: 100, baseUnit: "g", units, unitIdx: units.length ? 0 : -1, qty: units.length ? 1 : 100, estimated: true };
}

/** Amount in the food's base unit, and a readable portion label. */
function portionOf(p: Pending): { amount: number; label: string } {
  const unit = p.unitIdx >= 0 ? p.units[p.unitIdx] : null;
  if (!unit) return { amount: p.qty, label: `${p.qty} ${p.baseUnit}` };
  const amount = p.qty * unit.g;
  if (p.baseUnit === "serving") return { amount, label: formatQty(p.qty, unit) };
  return { amount, label: `${formatQty(p.qty, unit)} (${Math.round(amount)} ${p.baseUnit})` };
}

function unitHint(f: FoodItem | CustomFood): string {
  const first = f.units[0];
  if (f.unit === "serving") return `${Math.round(f.kcal)} kcal per serving`;
  if (!first) return `${Math.round(f.kcal)} kcal per ${f.per} ${f.unit}`;
  return `${Math.round((f.kcal * first.g) / f.per)} kcal per ${first.name} (${first.g} ${f.unit})`;
}

function defaultMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 17) return "snacks";
  return "dinner";
}

export function AddFoodSheet({ open, onOpenChange, date, meal: initialMeal }: { open: boolean; onOpenChange: (o: boolean) => void; date: string; meal?: Meal }) {
  const { state, update } = useDaily15();
  const [mode, setMode] = useState<Mode>("search");
  const [meal, setMeal] = useState<Meal>(defaultMeal());
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [online, setOnline] = useState<{ query: string; status: "idle" | "loading" | "done" | "error"; results: OffProduct[] }>({ query: "", status: "idle", results: [] });
  const onlineAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setMode("search");
      setQuery("");
      setPending(null);
      setOnline({ query: "", status: "idle", results: [] });
      setMeal(initialMeal ?? defaultMeal());
    }
  }, [open, initialMeal]);

  const recent = useMemo(() => {
    const seen = new Map<string, FoodEntry>();
    [...state.foods].reverse().forEach((f) => {
      if (!seen.has(f.name.toLowerCase())) seen.set(f.name.toLowerCase(), f);
    });
    return [...seen.values()].slice(0, 30);
  }, [state.foods]);

  const q = query.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  // Plural- and synonym-tolerant: 'eggs' finds 'Egg', 'ale' finds 'Beer, bitter'.
  const matches = (name: string) => matchesAll(name, q);
  const dbResults = useMemo(() => (q ? searchFoods(FOOD_DB, q, 20) : []), [q]);
  const [cofid, setCofid] = useState<FoodItem[] | null>(null);
  useEffect(() => {
    if (open && q.length >= 2 && !cofid) loadCofid().then(setCofid).catch(() => setCofid([]));
  }, [open, q, cofid]);
  const cofidResults = useMemo(() => (cofid && q.length >= 2 ? searchFoods(cofid, q, 15) : []), [cofid, q]);
  const myFoods = (state.customFoods ?? []).filter((f) => !q || matches(f.name)).slice(0, q ? 20 : 8);
  const savedResults = state.savedMeals.filter((m) => !q || m.name.toLowerCase().includes(q));
  const recentResults = recent.filter((f) => !q || f.name.toLowerCase().includes(q)).slice(0, q ? 10 : 8);

  const add = (entry: Omit<FoodEntry, "id" | "date" | "meal">) => {
    const wasDone = (state.foodDiaryDone ?? []).includes(date);
    // Adding to a completed day reopens it.
    update((s) => ({ ...s, foods: [...s.foods, { ...entry, id: uid(), date, meal }], foodDiaryDone: (s.foodDiaryDone ?? []).filter((d) => d !== date) }));
    toast.success(wasDone ? `Added to ${meal}. Diary reopened.` : `Added to ${meal}`);
    onOpenChange(false);
  };

  const searchOnline = async () => {
    const term = query.trim();
    if (term.length < 2) return;
    onlineAbort.current?.abort();
    const ctrl = new AbortController();
    onlineAbort.current = ctrl;
    setOnline({ query: term, status: "loading", results: [] });
    try {
      const results = await searchProducts(term, ctrl.signal);
      if (!ctrl.signal.aborted) setOnline({ query: term, status: "done", results });
    } catch {
      if (!ctrl.signal.aborted) setOnline({ query: term, status: "error", results: [] });
    }
  };

  const pickDb = (f: FoodItem) => setPending(fromItem(f, true));

  // No food in the built-in lists contains every word typed (likely a brand, such as 'Caramac'):
  // search branded products automatically and show those first.
  const exact = useMemo(
    () => q.length < 2 || FOOD_DB.some((f) => matchesAll(f.name, q)) || (cofid ?? []).some((f) => matchesAll(f.name, q)) || myFoods.some((f) => matchesAll(f.name, q)),
    [q, cofid, myFoods],
  );
  useEffect(() => {
    const term = query.trim();
    if (!open || exact || term.length < 3 || !cofid || online.query === term) return;
    const t = window.setTimeout(searchOnline, 700);
    return () => window.clearTimeout(t);
  }, [open, exact, query, cofid]); // eslint-disable-line react-hooks/exhaustive-deps

  const brandedBlock = (
    <>
      {q.length >= 2 && (
        online.query === query.trim() && online.status !== "idle" ? (
          <ResultGroup title="Branded products (UK)">
            {online.status === "loading" && <p className="px-3 py-2.5 text-sm text-muted-foreground">Searching Open Food Facts</p>}
            {online.status === "error" && <p className="px-3 py-2.5 text-sm text-destructive">Couldn't reach Open Food Facts. Check your connection and try again.</p>}
            {online.status === "done" && online.results.length === 0 && (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">
                No products found. <button className="underline" onClick={() => setMode("manual")}>Enter it manually</button>.
              </p>
            )}
            {online.results.map((p) => (
              <ResultRow key={p.code || p.name} name={p.name} detail={`${p.kcal} kcal per 100 g${p.quantity ? ` · pack ${p.quantity}` : ""}`} onClick={() => setPending(fromOff(p))} />
            ))}
          </ResultGroup>
        ) : (
          <Button variant="outline" className="w-full" onClick={searchOnline}>
            <Globe className="mr-1.5 h-4 w-4" />Search branded products for '{query.trim()}'
          </Button>
        )
      )}
      {online.status === "done" && online.results.length > 0 && online.query === query.trim() && (
        <p className="text-[11px] text-muted-foreground">
          Product data from <a className="underline" href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a> under the Open Database Licence. Check values against the label.
        </p>
      )}
    </>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto h-[92dvh] max-w-md overflow-y-auto overscroll-contain rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Add food</SheetTitle>
        </SheetHeader>
        <div className="mt-3 space-y-4 pb-6">
          <Choice columns={4} value={meal} onChange={setMeal} options={MEALS} />

          {pending ? (
            <AmountStep pending={pending} setPending={setPending} onAdd={add} onBack={() => setPending(null)} />
          ) : (
            <>
              <div className="grid grid-cols-5 gap-1 rounded-xl bg-muted p-1 text-[11px]">
                {([
                  ["search", "Search", Search],
                  ["out", "Eating out", UtensilsCrossed],
                  ["barcode", "Barcode", Barcode],
                  ["manual", "Manual", PenLine],
                  ["recipe", "Recipe", ChefHat],
                ] as const).map(([m, label, Icon]) => (
                  <button key={m} className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 ${mode === m ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`} onClick={() => setMode(m)}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {mode === "search" && (
                <div className="space-y-4">
                  {/* Pinned to the top of the panel so it stays put while results change underneath. */}
                  <div className="sticky -top-6 z-10 -mx-6 bg-background px-6 pb-2 pt-1">
                    <Input
                      type="search"
                      enterKeyHint="search"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Search foods, brands, saved meals"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                          searchOnline();
                        }
                      }}
                      aria-label="Search foods"
                    />
                  </div>
                  {myFoods.length > 0 && (
                    <ResultGroup title="My foods">
                      {myFoods.map((f) => (
                        <ResultRow
                          key={f.id}
                          name={f.name}
                          detail={unitHint(f)}
                          onClick={() => setPending(fromItem(f, false))}
                          onDelete={() => update((s) => ({ ...s, customFoods: s.customFoods.filter((x) => x.id !== f.id) }))}
                        />
                      ))}
                    </ResultGroup>
                  )}
                  {savedResults.length > 0 && (
                    <ResultGroup title="Saved meals and recipes">
                      {savedResults.map((m) => (
                        <ResultRow
                          key={m.id}
                          name={m.name}
                          detail={`${m.kcal} kcal · ${m.portion}`}
                          onClick={() => setPending({ name: m.name, base: m, per: 1, baseUnit: "serving", units: [SERVING], unitIdx: 0, qty: 1, estimated: false })}
                          onDelete={() => update((s) => ({ ...s, savedMeals: s.savedMeals.filter((x) => x.id !== m.id) }))}
                        />
                      ))}
                    </ResultGroup>
                  )}
                  {recentResults.length > 0 && (
                    <ResultGroup title="Recent">
                      {recentResults.map((f) => (
                        <ResultRow
                          key={f.id}
                          name={f.name}
                          detail={`${f.kcal} kcal · ${f.portion}`}
                          onClick={() => (f.source ? setPending({ ...f.source }) : add((({ id: _i, date: _d, meal: _m, ...rest }) => rest)(f)))}
                        />
                      ))}
                    </ResultGroup>
                  )}
                  {!exact && brandedBlock}
                  {q && dbResults.length > 0 && (
                    <ResultGroup title={exact ? "Common foods" : "Similar common foods"}>
                      {dbResults.map((f) => <ResultRow key={f.name} name={f.name} detail={unitHint(f)} onClick={() => pickDb(f)} />)}
                    </ResultGroup>
                  )}
                  {q.length >= 3 && MEALS_OUT.some((m) => matchesAll(m.name, q)) && (
                    <button onClick={() => setMode("out")} className="flex w-full items-center gap-3 rounded-xl border border-copper/40 bg-copper/5 p-3 text-left text-sm">
                      <UtensilsCrossed className="h-5 w-5 shrink-0 text-copper" />
                      <span>
                        <span className="font-medium">Had this at a restaurant or takeaway?</span>
                        <span className="block text-xs text-muted-foreground">Estimate a typical portion with sides, no weighing needed.</span>
                      </span>
                    </button>
                  )}
                  {cofidResults.length > 0 && (
                    <div>
                      <ResultGroup title={exact ? "UK food database" : "Similar foods in the UK food database"}>
                        {cofidResults.map((f) => <ResultRow key={f.cofid} name={f.name} detail={unitHint(f)} onClick={() => pickDb(f)} />)}
                      </ResultGroup>
                      <p className="mt-1 text-[11px] text-muted-foreground">{COFID_CREDIT}</p>
                    </div>
                  )}
                  {exact && brandedBlock}
                  {!q && !savedResults.length && !recentResults.length && !myFoods.length && <p className="text-sm text-muted-foreground">Start typing, e.g. 'eggs', 'sausage' or 'banana'.</p>}
                </div>
              )}

              {mode === "out" && <EatingOutStep onAdd={add} />}
              {mode === "barcode" && <BarcodeStep onFound={setPending} />}
              {mode === "manual" && <ManualStep onNext={setPending} />}
              {mode === "recipe" && <RecipeStep onSaved={() => setMode("search")} />}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="divide-y rounded-xl border">{children}</ul>
    </div>
  );
}

function ResultRow({ name, detail, onClick, onDelete }: { name: string; detail: string; onClick: () => void; onDelete?: () => void }) {
  return (
    <li className="flex items-center">
      <button className="flex-1 px-3 py-2.5 text-left" onClick={onClick}>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </button>
      {onDelete && (
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${name}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </li>
  );
}

/** Builds a diary entry from a chosen portion, keeping the source so the amount can be changed later. */
export function entryFromPending(pending: Pending): Omit<FoodEntry, "id" | "date" | "meal"> {
  const { amount, label } = portionOf(pending);
  const n = scaleNutrients(pending.base, amount / pending.per);
  const extras = pending.baseUnit !== "serving" ? extrasFor(pending, amount) : {};
  return { name: pending.name, portion: label, ...n, estimated: pending.estimated, ...extras, source: pending };
}

/** Measure chips, a stepper and quick picks. Shared by adding and editing food. */
export function PortionPicker({ pending, setPending }: { pending: Pending; setPending: (p: Pending) => void }) {
  const unit = pending.unitIdx >= 0 ? pending.units[pending.unitIdx] : null;
  const { amount, label } = portionOf(pending);
  const countable = !!unit;
  const step = countable ? 1 : pending.baseUnit === "ml" ? 25 : 10;
  const quick = countable ? [0.5, 1, 2, 3] : [50, 100, 150, 200];
  const set = (qty: number) => setPending({ ...pending, qty: Math.max(0, Math.round(qty * 100) / 100) });

  const chooseUnit = (idx: number) => {
    if (idx === pending.unitIdx) return;
    // Keep roughly the same amount when switching between a unit and grams.
    const qty = idx < 0 ? Math.round(amount) : Math.max(0.5, Math.round((amount / pending.units[idx].g) * 2) / 2 || 1);
    setPending({ ...pending, unitIdx: idx, qty });
  };

  return (
    <div className="space-y-4">
      {(pending.units.length > 1 || pending.baseUnit !== "serving") && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Measure">
          {pending.units.map((u, i) => (
            <button
              key={u.name}
              role="radio"
              aria-checked={pending.unitIdx === i}
              onClick={() => chooseUnit(i)}
              className={`rounded-full border px-3 py-1.5 text-sm ${pending.unitIdx === i ? "border-foreground bg-foreground text-background" : "bg-card"}`}
            >
              {u.name}
              {pending.baseUnit !== "serving" && <span className="opacity-60"> {u.g} {pending.baseUnit}</span>}
            </button>
          ))}
          {pending.baseUnit !== "serving" && (
            <button
              role="radio"
              aria-checked={pending.unitIdx === -1}
              onClick={() => chooseUnit(-1)}
              className={`rounded-full border px-3 py-1.5 text-sm ${pending.unitIdx === -1 ? "border-foreground bg-foreground text-background" : "bg-card"}`}
            >
              {pending.baseUnit === "ml" ? "millilitres" : "grams"}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-full" onClick={() => set(pending.qty - step)} disabled={pending.qty <= step} aria-label="Less">
          <Minus className="h-5 w-5" />
        </Button>
        <div className="flex-1 text-center">
          <Input
            type="number"
            inputMode="decimal"
            value={pending.qty || ""}
            onChange={(e) => set(Number(e.target.value) || 0)}
            className="h-12 border-0 bg-transparent text-center text-3xl font-semibold tabular-nums shadow-none focus-visible:ring-0"
            aria-label={unit ? `Number of ${unit.plural}` : `Amount in ${pending.baseUnit}`}
          />
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-full" onClick={() => set(pending.qty + step)} aria-label="More">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex justify-center gap-2">
        {quick.map((q) => (
          <Button key={q} variant={pending.qty === q ? "default" : "outline"} size="sm" className="h-8 min-w-12 text-xs" onClick={() => set(q)}>
            {countable ? (q === 0.5 ? "½" : q) : `${q} ${pending.baseUnit}`}
          </Button>
        ))}
      </div>
    </div>
  );
}

function AmountStep({ pending, setPending, onAdd, onBack }: { pending: Pending; setPending: (p: Pending) => void; onAdd: (e: Omit<FoodEntry, "id" | "date" | "meal">) => void; onBack: () => void }) {
  const { state } = useDaily15();
  const flags = flagsForFood(lifeStageOf(state.profile), { name: pending.name, abv: pending.abv });
  const entry = entryFromPending(pending);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">{pending.name}{pending.estimated && <Estimate />}</p>
        <p className="text-xs text-muted-foreground">
          {pending.baseUnit === "serving" ? `${Math.round(pending.base.kcal)} kcal per serving` : `${Math.round(pending.base.kcal)} kcal per ${pending.per} ${pending.baseUnit}`}
        </p>
      </div>
      <PortionPicker pending={pending} setPending={setPending} />
      <NutrientGrid n={entry} />
      {flags.map((f) => (
        <p key={f.text} role="note" className={`rounded-xl p-3 text-sm ${f.level === "avoid" ? "bg-destructive/10 text-destructive" : "bg-copper/10"}`}>
          {f.text}
        </p>
      ))}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button className="flex-1" disabled={entry.kcal <= 0 && pending.qty <= 0} onClick={() => onAdd(entry)}>
          <Plus className="mr-1.5 h-4 w-4" />Add
        </Button>
      </div>
    </div>
  );
}

export function NutrientGrid({ n }: { n: Nutrients }) {
  return (
    <div className="grid grid-cols-5 gap-1 rounded-xl bg-muted p-2 text-center text-xs tabular-nums">
      {[
        ["kcal", n.kcal, ""],
        ["Protein", n.protein, "g"],
        ["Carbs", n.carbs, "g"],
        ["Fat", n.fat, "g"],
        ["Fibre", n.fibre, "g"],
      ].map(([l, v, u]) => (
        <div key={l as string}>
          <div className="text-sm font-semibold">{Math.round(v as number)}{u}</div>
          <div className="text-muted-foreground">{l}</div>
        </div>
      ))}
    </div>
  );
}

function BarcodeStep({ onFound }: { onFound: (p: Pending) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const abort = useRef<AbortController | null>(null);
  const canScan = cameraAvailable();

  useEffect(() => () => abort.current?.abort(), []);

  const lookup = async (c: string) => {
    setBusy(true);
    setError(null);
    try {
      const p = await lookupBarcode(c);
      if (!p) setError("Product not found. Enter it manually instead.");
      else onFound(fromOff(p));
    } catch {
      setError("Couldn't reach the product database. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const scan = async () => {
    if (!video.current) return;
    setScanning(true);
    setError(null);
    abort.current = new AbortController();
    try {
      const c = await scanWithCamera(video.current, abort.current.signal);
      if (c) {
        setCode(c);
        await lookup(c);
      }
    } catch {
      setError("Couldn't open the camera. Allow camera access for this site, or type the barcode number.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className={scanning ? "" : "hidden"}>
        <video ref={video} className="aspect-[4/3] w-full rounded-xl bg-black object-cover" muted playsInline />
        <Button variant="outline" className="mt-2 w-full" onClick={() => abort.current?.abort()}>Stop camera</Button>
      </div>
      {!scanning && canScan && (
        <Button className="w-full" variant="outline" onClick={scan}>
          <Camera className="mr-1.5 h-4 w-4" />Scan with camera
        </Button>
      )}
      {!canScan && <p className="text-xs text-muted-foreground">No camera available. Type the number under the barcode.</p>}
      <div className="flex gap-2">
        <Input inputMode="numeric" placeholder="Barcode number" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button disabled={busy || code.replace(/\D/g, "").length < 8} onClick={() => lookup(code)}>{busy ? "Looking up" : "Look up"}</Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-[11px] text-muted-foreground">
        Product data from <a className="underline" href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a> under the Open Database Licence. Check values against the label.
      </p>
    </div>
  );
}

type Basis = "100g" | "100ml" | "serving";

function ManualStep({ onNext }: { onNext: (p: Pending) => void }) {
  const { update } = useDaily15();
  const [name, setName] = useState("");
  const [basis, setBasis] = useState<Basis>("100g");
  const [v, setV] = useState<Record<keyof Nutrients, number | "">>({ kcal: "", protein: "", carbs: "", fat: "", fibre: "", satFat: "", sugars: "", salt: "" });
  const [servingName, setServingName] = useState("");
  const [servingSize, setServingSize] = useState<number | "">("");
  const [save, setSave] = useState(true);
  const num = (x: number | "") => (typeof x === "number" ? x : 0);
  const n: Nutrients = { kcal: num(v.kcal), protein: num(v.protein), carbs: num(v.carbs), fat: num(v.fat), fibre: num(v.fibre) };
  for (const k of ["satFat", "sugars", "salt"] as const) if (typeof v[k] === "number") n[k] = v[k] as number;
  const measure = basis === "100ml" ? "ml" : "g";
  const label = basis === "serving" ? "per serving" : basis === "100ml" ? "per 100 ml" : "per 100 g";

  const build = (): CustomFood => {
    const sName = servingName.trim().toLowerCase() || "serving";
    const unit = { name: sName, plural: sName.endsWith("s") ? sName : `${sName}s` };
    if (basis === "serving") {
      // Convert to per 100 g when the serving weight is known, so grams work too.
      if (typeof servingSize === "number" && servingSize > 0) {
        return { id: uid(), name: name.trim(), per: 100, unit: "g", ...scaleNutrients(n, 100 / servingSize), units: [{ ...unit, g: servingSize }] };
      }
      return { id: uid(), name: name.trim(), per: 1, unit: "serving", ...n, units: [{ ...unit, g: 1 }] };
    }
    const units = typeof servingSize === "number" && servingSize > 0 ? [{ ...unit, g: servingSize }] : [];
    return { id: uid(), name: name.trim(), per: 100, unit: measure, ...n, units };
  };

  const next = () => {
    const food = build();
    if (save) update((s) => ({ ...s, customFoods: [...(s.customFoods ?? []).filter((f) => f.name.toLowerCase() !== food.name.toLowerCase()), food] }));
    onNext(fromItem(food, false));
  };

  return (
    <div className="space-y-3">
      <Field label="Food name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pork and apple sausages" /></Field>
      <Field label="The label shows values">
        <Choice columns={3} value={basis} onChange={setBasis} options={[{ value: "100g", label: "Per 100 g" }, { value: "100ml", label: "Per 100 ml" }, { value: "serving", label: "Per serving" }]} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <NumField label={`Calories ${label}`} value={v.kcal} onChange={(x) => setV({ ...v, kcal: x })} suffix="kcal" />
        <NumField label="Protein" value={v.protein} onChange={(x) => setV({ ...v, protein: x })} suffix="g" step={0.1} />
        <NumField label="Carbohydrate" value={v.carbs} onChange={(x) => setV({ ...v, carbs: x })} suffix="g" step={0.1} />
        <NumField label="Fat" value={v.fat} onChange={(x) => setV({ ...v, fat: x })} suffix="g" step={0.1} />
        <NumField label="Fibre" value={v.fibre} onChange={(x) => setV({ ...v, fibre: x })} suffix="g" step={0.1} />
        <NumField label="of which saturates" value={v.satFat} onChange={(x) => setV({ ...v, satFat: x })} suffix="g" step={0.1} />
        <NumField label="of which sugars" value={v.sugars} onChange={(x) => setV({ ...v, sugars: x })} suffix="g" step={0.1} />
        <NumField label="Salt" value={v.salt} onChange={(x) => setV({ ...v, salt: x })} suffix="g" step={0.01} />
      </div>
      <div className="rounded-xl bg-muted/60 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Typical serving, so you can log '2 sausages' next time</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Serving name"><Input value={servingName} onChange={(e) => setServingName(e.target.value)} placeholder="e.g. sausage" /></Field>
          <NumField label="Serving weighs" value={servingSize} onChange={setServingSize} suffix={measure} hint={basis === "serving" ? "Optional" : undefined} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={save} onCheckedChange={(c) => setSave(!!c)} />
        Save to My foods
      </label>
      <Button className="w-full" disabled={!name.trim() || typeof v.kcal !== "number"} onClick={next}>
        Next: choose amount
      </Button>
    </div>
  );
}

function RecipeStep({ onSaved }: { onSaved: () => void }) {
  const { update } = useDaily15();
  const [name, setName] = useState("");
  const [servings, setServings] = useState<number | "">(2);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<{ food: FoodItem; amount: number }[]>([]);
  const q = query.trim().toLowerCase();
  const results = q ? FOOD_DB.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 6) : [];
  const total = sumNutrients(items.map((i) => scaleNutrients(i.food, i.amount / i.food.per)));
  const perServing = scaleNutrients(total, 1 / (typeof servings === "number" && servings > 0 ? servings : 1));

  return (
    <div className="space-y-3">
      <Field label="Recipe name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken and rice bowl" /></Field>
      <NumField label="Servings" value={servings} onChange={setServings} min={1} />
      <Field label="Add ingredients">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ingredients" />
      </Field>
      {results.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {results.map((f) => (
            <ResultRow key={f.name} name={f.name} detail={`${f.kcal} kcal per ${f.per} ${f.unit}`} onClick={() => { setItems((x) => [...x, { food: f, amount: f.typical }]); setQuery(""); }} />
          ))}
        </ul>
      )}
      {items.map((it, i) => (
        <SwipeRow key={`${i}-${it.food.name}`} bg="bg-background" label={`Remove ${it.food.name}`} onDelete={() => setItems((x) => x.filter((_, j) => j !== i))}>
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate text-sm">{it.food.name}</span>
          <div className="relative w-28">
            <Input type="number" inputMode="decimal" value={it.amount} onChange={(e) => setItems((x) => x.map((y, j) => (j === i ? { ...y, amount: Number(e.target.value) || 0 } : y)))} className="h-9 pr-8" />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{it.food.unit}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setItems((x) => x.filter((_, j) => j !== i))} aria-label="Remove ingredient"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
        </SwipeRow>
      ))}
      {items.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">Per serving<Estimate /></p>
          <NutrientGrid n={perServing} />
        </>
      )}
      <Button
        className="w-full"
        disabled={!name.trim() || !items.length}
        onClick={() => {
          update((s) => ({ ...s, savedMeals: [...s.savedMeals, { id: uid(), name: name.trim(), portion: "1 serving", ...perServing }] }));
          toast.success("Recipe saved. Find it under saved meals.");
          onSaved();
        }}
      >
        Save recipe
      </Button>
    </div>
  );
}

/** Restaurant and takeaway meals: choose a dish, sides and size; adds one estimated entry. */
function EatingOutStep({ onAdd }: { onAdd: (e: Omit<FoodEntry, "id" | "date" | "meal">) => void }) {
  const [rows, setRows] = useState<Map<string, Row> | null>(null);
  const [cuisine, setCuisine] = useState<string>("All");
  const [meal, setMeal] = useState<EatingOutMeal | null>(null);
  const [size, setSize] = useState<(typeof SIZES)[number]["id"]>("typical");
  const [sides, setSides] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCofidByCode().then(setRows).catch(() => setRows(new Map()));
  }, []);

  if (!rows) return <p className="text-sm text-muted-foreground">Loading</p>;

  if (!meal) {
    const list = MEALS_OUT.filter((m) => cuisine === "All" || m.cuisine === cuisine);
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Pick the closest dish. You'll choose sides and portion size next.</p>
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          {["All", ...CUISINES].map((c) => (
            <button key={c} onClick={() => setCuisine(c)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${cuisine === c ? "border-foreground bg-foreground text-background" : "bg-card"}`}>{c}</button>
          ))}
        </div>
        <ul className="divide-y rounded-xl border">
          {list.map((m) => (
            <ResultRow key={m.id} name={m.name} detail={`About ${Math.round(sumComponents(rows, m.parts).kcal / 10) * 10} kcal · ${m.cuisine}`} onClick={() => { setMeal(m); setSize("typical"); setSides(new Set()); }} />
          ))}
        </ul>
      </div>
    );
  }

  const factor = SIZES.find((x) => x.id === size)!.factor;
  const chosen = meal.sides.filter((x) => sides.has(x.id));
  const total = sumComponents(rows, [...meal.parts, ...chosen.flatMap((x) => x.parts)], factor);
  const n = { kcal: Math.round(total.kcal), protein: Math.round(total.protein * 10) / 10, carbs: Math.round(total.carbs * 10) / 10, fat: Math.round(total.fat * 10) / 10, fibre: Math.round(total.fibre * 10) / 10, satFat: Math.round(total.satFat * 10) / 10, sugars: Math.round(total.sugars * 10) / 10, salt: Math.round(total.salt * 100) / 100 };
  const sizeLabel = SIZES.find((x) => x.id === size)!.label.toLowerCase();
  const portion = `${sizeLabel} portion${chosen.length ? ` with ${chosen.map((x) => x.label.toLowerCase()).join(", ")}` : ""}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">{meal.name}<Estimate /></p>
        <p className="text-xs text-muted-foreground">A typical restaurant portion, estimated from UK food data. Nobody expects you to weigh it.</p>
      </div>
      <Choice columns={3} value={size} onChange={setSize} options={SIZES.map((x) => ({ value: x.id, label: x.label }))} />
      {meal.sides.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Did you have</p>
          {meal.sides.map((x) => (
            <label key={x.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-sm">
              <span className="flex items-center gap-2">
                <Checkbox checked={sides.has(x.id)} onCheckedChange={(v) => setSides((cur) => { const next = new Set(cur); if (v) { meal.sides.filter((o) => o.group && o.group === x.group).forEach((o) => next.delete(o.id)); next.add(x.id); } else next.delete(x.id); return next; })} />
                {x.label}
              </span>
              <span className="tabular-nums text-muted-foreground">+{Math.round(sumComponents(rows, x.parts, factor).kcal)} kcal</span>
            </label>
          ))}
        </div>
      )}
      <NutrientGrid n={n} />
      <p className="text-[11px] text-muted-foreground">Restaurant portions vary a lot, often by a quarter either way. Use 'Generous' if it was a big plate or came with extra sauce or oil.</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setMeal(null)}>Back</Button>
        <Button className="flex-1" onClick={() => onAdd({ name: meal.name, portion, ...n, estimated: true, ...(total.fiveADay ? { fiveADay: Math.round(total.fiveADay * 10) / 10, fiveADayKind: "fv" as const } : {}) })}>
          <Plus className="mr-1.5 h-4 w-4" />Add
        </Button>
      </div>
    </div>
  );
}
