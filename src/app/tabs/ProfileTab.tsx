import { useRef, useState } from "react";
import { Download, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "../notify";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ACTIVITY_LABELS, GOAL_LABELS, latestWeight, suggestTargets, todayKey } from "../calc";
import { REMINDER_LABELS } from "../data";
import { Choice, Field, NumField } from "../components/Field";
import { Card, CardHeading } from "../components/Section";
import { clearStorage, emptyState, useDaily15 } from "../store";
import type { ActivityLevel, AppState, Experience, Goal, Profile, Targets } from "../types";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ProfileTab() {
  const { state, update, replace } = useDaily15();
  const p = state.profile!;
  const fileInput = useRef<HTMLInputElement>(null);
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");

  const setProfile = (patch: Partial<Profile>) =>
    update((s) => {
      const next = { ...s.profile!, ...patch };
      const affectsTargets = ["age", "sex", "heightCm", "targetWeightKg", "activityLevel", "goal", "startWeightKg"].some((k) => k in patch);
      if (affectsTargets && !next.targetsCustomised) next.targets = suggestTargets(next, latestWeight(s) ?? next.startWeightKg);
      return { ...s, profile: next };
    });
  const setTarget = (k: keyof Targets, v: number | "") =>
    update((s) => ({ ...s, profile: { ...s.profile!, targetsCustomised: true, targets: { ...s.profile!.targets, [k]: typeof v === "number" ? v : 0 } } }));
  const recalc = () => {
    update((s) => ({ ...s, profile: { ...s.profile!, targetsCustomised: false, targets: suggestTargets(s.profile!, latestWeight(s) ?? s.profile!.startWeightKg) } }));
    toast.success("Targets recalculated from your current weight");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily15-export-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text()) as Partial<AppState>;
      if (data.version !== 1 || !data.profile) throw new Error("bad file");
      replace({ ...emptyState(), ...data } as AppState);
      toast.success("Data restored");
    } catch {
      toast.error("That file isn't a DAILY 15 export");
    }
  };

  const askNotifications = async () => {
    if (typeof Notification === "undefined") return;
    setNotifPerm(await Notification.requestPermission());
  };

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-4xl">Profile</h1>
      </header>

      <Card>
        <CardHeading>Personal details</CardHeading>
        <div className="space-y-3">
          <Field label="First name"><Input value={p.name} onChange={(e) => setProfile({ name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Age" value={p.age} onChange={(v) => typeof v === "number" && setProfile({ age: v })} suffix="yrs" />
            <NumField label="Height" value={p.heightCm} onChange={(v) => typeof v === "number" && setProfile({ heightCm: v })} suffix="cm" />
            <NumField label="Starting weight" value={p.startWeightKg} onChange={(v) => typeof v === "number" && setProfile({ startWeightKg: v })} suffix="kg" step={0.1} />
            <NumField label="Target weight" value={p.targetWeightKg} onChange={(v) => typeof v === "number" && setProfile({ targetWeightKg: v })} suffix="kg" step={0.1} />
          </div>
          <Field label="Sex used for energy calculations">
            <Choice value={p.sex} onChange={(v) => setProfile({ sex: v })} options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }]} />
          </Field>
          <Field label="Fitness experience">
            <Choice columns={3} value={p.experience} onChange={(v: Experience) => setProfile({ experience: v })} options={[{ value: "beginner", label: "Beginner" }, { value: "intermediate", label: "Intermediate" }, { value: "advanced", label: "Advanced" }]} />
          </Field>
          <Field label="Day-to-day activity">
            <Select value={p.activityLevel} onValueChange={(v) => setProfile({ activityLevel: v as ActivityLevel })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => <SelectItem key={k} value={k}>{ACTIVITY_LABELS[k]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Primary goal">
            <Select value={p.goal} onValueChange={(v) => setProfile({ goal: v as Goal })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(GOAL_LABELS) as Goal[]).map((k) => <SelectItem key={k} value={k}>{GOAL_LABELS[k]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeading action={<Button variant="ghost" size="sm" className="h-8 text-xs" onClick={recalc}><RefreshCw className="mr-1 h-3 w-3" />Recalculate</Button>}>Daily targets</CardHeading>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Calories" value={p.targets.calories} onChange={(v) => setTarget("calories", v)} suffix="kcal" step={10} />
          <NumField label="Protein" value={p.targets.proteinG} onChange={(v) => setTarget("proteinG", v)} suffix="g" />
          <NumField label="Carbohydrate" value={p.targets.carbsG} onChange={(v) => setTarget("carbsG", v)} suffix="g" />
          <NumField label="Fat" value={p.targets.fatG} onChange={(v) => setTarget("fatG", v)} suffix="g" />
          <NumField label="Fibre" value={p.targets.fibreG} onChange={(v) => setTarget("fibreG", v)} suffix="g" />
          <NumField label="Water" value={p.targets.waterMl} onChange={(v) => setTarget("waterMl", v)} suffix="ml" step={250} />
          <NumField label="Steps" value={p.targets.steps} onChange={(v) => setTarget("steps", v)} step={500} />
          <NumField label="Active minutes" value={p.targets.activeMinutes} onChange={(v) => setTarget("activeMinutes", v)} suffix="min" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {p.targetsCustomised ? "You've set these by hand, so changing your details won't overwrite them. " : "Suggested from your details and updated when they change. "}
          Calorie targets are estimates. Recalculate every five kilos or so. Check targets with a GP or registered dietitian if you have a medical condition.
        </p>
      </Card>

      <Card>
        <CardHeading>Reminders</CardHeading>
        <ul className="divide-y">
          {state.reminders.map((r, i) => (
            <li key={r.type} className="flex items-center gap-3 py-2">
              <Switch checked={r.enabled} onCheckedChange={(v) => update((s) => ({ ...s, reminders: s.reminders.map((x, j) => (j === i ? { ...x, enabled: v } : x)) }))} aria-label={`${REMINDER_LABELS[r.type]} reminder`} />
              <span className="flex-1 text-sm">{REMINDER_LABELS[r.type]}</span>
              {r.weekday !== undefined && (
                <Select value={String(r.weekday)} onValueChange={(v) => update((s) => ({ ...s, reminders: s.reminders.map((x, j) => (j === i ? { ...x, weekday: Number(v) } : x)) }))}>
                  <SelectTrigger className="h-8 w-[5.5rem] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{WEEKDAYS.map((d, k) => <SelectItem key={d} value={String(k)}>{d.slice(0, 3)}</SelectItem>)}</SelectContent>
                </Select>
              )}
              <Input type="time" className="h-8 w-[6.5rem] text-xs" value={r.time} onChange={(e) => update((s) => ({ ...s, reminders: s.reminders.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) }))} />
            </li>
          ))}
        </ul>
        {notifPerm === "default" && (
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={askNotifications}>Allow notifications</Button>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          The web version reminds you while it's open. Reminders when the app is closed need the iOS and Android apps.
        </p>
      </Card>

      <Card>
        <CardHeading>Integrations</CardHeading>
        <ul className="divide-y text-sm">
          {["Apple Health", "Android Health Connect", "Smartwatches and fitness trackers"].map((n) => (
            <li key={n} className="flex items-center justify-between py-2">
              <span>{n}</span>
              <span className="text-xs text-muted-foreground">Mobile app</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Until then, enter steps and active minutes from your phone or watch on the Home or Progress tab.</p>
      </Card>

      <Card>
        <CardHeading>Your data</CardHeading>
        <p className="mb-3 text-xs text-muted-foreground">
          Everything is stored on this device only. Export regularly as a backup or to move to another device. Clearing browser data deletes it.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={exportData}><Download className="mr-1.5 h-4 w-4" />Export</Button>
          <Button variant="outline" onClick={() => fileInput.current?.click()}><Upload className="mr-1.5 h-4 w-4" />Restore</Button>
        </div>
        <input ref={fileInput} type="file" accept="application/json" className="hidden" onChange={(e) => { importData(e.target.files?.[0]); e.target.value = ""; }} />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="mt-2 w-full text-destructive hover:text-destructive"><Trash2 className="mr-1.5 h-4 w-4" />Delete all my data</Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete everything?</AlertDialogTitle>
              <AlertDialogDescription>This removes your profile, workouts, food diary, weigh-ins and photos from this device. It can't be undone. Export first if you want a copy.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  clearStorage();
                  replace(emptyState());
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-muted-foreground">
        DAILY 15 offers general fitness information, not medical advice. Calorie, nutrition and exercise figures are estimates. Speak to a GP before starting a new exercise or diet plan if you have a health condition, are pregnant or are returning from injury.
      </p>
    </div>
  );
}
