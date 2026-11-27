import { useEffect, useState } from "react";
import { toast } from "../notify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { todayKey, uid } from "../calc";
import { healthName, saveWeightToHealth } from "../native/health";
import { useDaily15 } from "../store";
import { weighInMessage } from "../milestones";
import { Field, NumField } from "./Field";

interface DialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function WeightDialog({ open, onOpenChange }: DialogProps) {
  const { state, update } = useDaily15();
  const [kg, setKg] = useState<number | "">("");
  const [date, setDate] = useState(todayKey());

  useEffect(() => {
    if (open) {
      const last = [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).pop();
      setKg(last?.kg ?? state.profile?.startWeightKg ?? "");
      setDate(todayKey());
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    if (typeof kg !== "number" || kg < 30 || kg > 350) return;
    const value = Math.round(kg * 10) / 10;
    const message = weighInMessage(state, value, date);
    update((s) => ({ ...s, weights: [...s.weights.filter((w) => w.date !== date), { id: uid(), date, kg: value }] }));
    if (state.health?.connected) saveWeightToHealth(value, date).catch(() => {});
    toast.success(message);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record weight</DialogTitle>
          <DialogDescription>Weigh at the same time each day, ideally first thing. One entry per day.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Weight" value={kg} onChange={setKg} suffix="kg" step={0.1} />
          <Field label="Date">
            <Input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value || todayKey())} />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={typeof kg !== "number"}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StepsDialog({ open, onOpenChange, initialDate }: DialogProps & { initialDate?: string }) {
  const { state, update } = useDaily15();
  const [date, setDate] = useState(initialDate ?? todayKey());
  useEffect(() => {
    if (open) setDate(initialDate ?? todayKey());
  }, [open, initialDate]);
  const [steps, setSteps] = useState<number | "">("");
  const [distanceKm, setDistance] = useState<number | "">("");
  const [activeMinutes, setActive] = useState<number | "">("");
  const [activityKcal, setKcal] = useState<number | "">("");

  useEffect(() => {
    if (!open) return;
    const a = state.activity[date];
    setSteps(a?.steps ?? "");
    setDistance(a?.distanceKm ?? "");
    setActive(a?.activeMinutes ?? "");
    setKcal(a?.activityKcal ?? "");
  }, [open, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    const n = (v: number | "") => (typeof v === "number" && v >= 0 ? v : 0);
    // Estimate distance from steps when left blank: about 0.75 m a step.
    const dist = typeof distanceKm === "number" ? distanceKm : Math.round(n(steps) * 0.00075 * 10) / 10;
    update((s) => ({
      ...s,
      activity: { ...s.activity, [date]: { date, steps: Math.round(n(steps)), distanceKm: dist, activeMinutes: n(activeMinutes), activityKcal: n(activityKcal) } },
    }));
    toast.success("Activity saved");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Steps and activity</DialogTitle>
          <DialogDescription>
            {state.health?.connected
              ? `Steps and activity sync from ${healthName} when the app opens. Anything you enter here is replaced at the next sync if ${healthName} has a figure for that day.`
              : "Copy today's figures from your phone or watch. In the iPhone app, connect Apple Health in Profile to sync them automatically."}
          </DialogDescription>
        </DialogHeader>
        <Field label="Date">
          <Input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value || todayKey())} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Steps" value={steps} onChange={setSteps} />
          <NumField label="Distance" value={distanceKm} onChange={setDistance} suffix="km" step={0.1} hint="Blank to estimate" />
          <NumField label="Active minutes" value={activeMinutes} onChange={setActive} suffix="min" />
          <NumField label="Activity calories" value={activityKcal} onChange={setKcal} suffix="kcal" />
        </div>
        <DialogFooter>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
