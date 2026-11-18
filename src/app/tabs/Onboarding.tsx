import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACTIVITY_LABELS, GOAL_LABELS, suggestTargets, todayKey, uid } from "../calc";
import { Choice, Field, NumField } from "../components/Field";
import { useDaily15 } from "../store";
import type { ActivityLevel, Experience, Goal, Profile, Sex } from "../types";

type Draft = {
  name: string;
  age: number | "";
  sex: Sex;
  heightCm: number | "";
  startWeightKg: number | "";
  targetWeightKg: number | "";
  experience: Experience;
  activityLevel: ActivityLevel;
  goal: Goal;
};

export function Onboarding() {
  const { update } = useDaily15();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>({
    name: "",
    age: "",
    sex: "female",
    heightCm: "",
    startWeightKg: "",
    targetWeightKg: "",
    experience: "beginner",
    activityLevel: "light",
    goal: "lose-fat",
  });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const bodyValid =
    typeof d.age === "number" && d.age >= 16 && d.age <= 100 &&
    typeof d.heightCm === "number" && d.heightCm >= 120 && d.heightCm <= 230 &&
    typeof d.startWeightKg === "number" && d.startWeightKg >= 35 && d.startWeightKg <= 300 &&
    typeof d.targetWeightKg === "number" && d.targetWeightKg >= 35 && d.targetWeightKg <= 300;

  const finish = () => {
    if (!bodyValid) return;
    const base = {
      age: d.age as number,
      sex: d.sex,
      heightCm: d.heightCm as number,
      startWeightKg: d.startWeightKg as number,
      targetWeightKg: d.targetWeightKg as number,
      activityLevel: d.activityLevel,
      goal: d.goal,
    };
    const profile: Profile = { ...base, name: d.name.trim(), experience: d.experience, targets: suggestTargets(base), targetsCustomised: false };
    update((s) => ({
      ...s,
      profile,
      weights: s.weights.length ? s.weights : [{ id: uid(), date: todayKey(), kg: profile.startWeightKg }],
    }));
  };

  const steps = [
    <div key="welcome" className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-copper">DAILY 15</p>
        <h1 className="mt-3 text-5xl leading-none">Show up every day.</h1>
        <p className="mt-4 text-muted-foreground">
          Fifteen minutes of movement, honest food logging, steps and weight trends in one place. It takes about a minute to set up.
        </p>
      </div>
      <Field label="First name (optional)">
        <Input value={d.name} onChange={(e) => set("name", e.target.value)} autoComplete="given-name" />
      </Field>
      <Button className="w-full" size="lg" onClick={() => setStep(1)}>Get started</Button>
    </div>,

    <div key="body" className="space-y-4">
      <h2 className="text-3xl">About you</h2>
      <p className="text-sm text-muted-foreground">Used to estimate calorie and protein targets. Nothing leaves this device.</p>
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Age" value={d.age} onChange={(v) => set("age", v)} suffix="yrs" />
        <NumField label="Height" value={d.heightCm} onChange={(v) => set("heightCm", v)} suffix="cm" />
        <NumField label="Current weight" value={d.startWeightKg} onChange={(v) => set("startWeightKg", v)} suffix="kg" step={0.1} />
        <NumField label="Target weight" value={d.targetWeightKg} onChange={(v) => set("targetWeightKg", v)} suffix="kg" step={0.1} />
      </div>
      <Field label="Sex used for energy calculations">
        <Choice value={d.sex} onChange={(v) => set("sex", v)} options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }]} />
      </Field>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
        <Button className="flex-1" disabled={!bodyValid} onClick={() => setStep(2)}>Continue</Button>
      </div>
      {!bodyValid && <p className="text-xs text-muted-foreground">Age 16 to 100, height 120 to 230 cm, weights 35 to 300 kg.</p>}
    </div>,

    <div key="fitness" className="space-y-5">
      <h2 className="text-3xl">Your starting point</h2>
      <Field label="Fitness experience">
        <Choice
          columns={3}
          value={d.experience}
          onChange={(v) => set("experience", v)}
          options={[{ value: "beginner", label: "Beginner" }, { value: "intermediate", label: "Intermediate" }, { value: "advanced", label: "Advanced" }]}
        />
      </Field>
      <Field label="Day-to-day activity">
        <Choice value={d.activityLevel} onChange={(v) => set("activityLevel", v)} options={(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => ({ value: k, label: ACTIVITY_LABELS[k] }))} />
      </Field>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
        <Button className="flex-1" onClick={() => setStep(3)}>Continue</Button>
      </div>
    </div>,

    <div key="goal" className="space-y-5">
      <h2 className="text-3xl">Primary goal</h2>
      <Choice columns={1} value={d.goal} onChange={(v) => set("goal", v)} options={(Object.keys(GOAL_LABELS) as Goal[]).map((k) => ({ value: k, label: GOAL_LABELS[k] }))} />
      {bodyValid && <TargetPreview d={d} />}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
        <Button className="flex-1" onClick={finish}>Start DAILY 15</Button>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-[100dvh] px-5 pb-10 pt-10">
      <div className="mb-8 flex gap-1.5" aria-hidden>
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-foreground" : "bg-muted"}`} />
        ))}
      </div>
      {steps[step]}
    </div>
  );
}

function TargetPreview({ d }: { d: Draft }) {
  const t = suggestTargets({
    age: d.age as number,
    sex: d.sex,
    heightCm: d.heightCm as number,
    startWeightKg: d.startWeightKg as number,
    targetWeightKg: d.targetWeightKg as number,
    activityLevel: d.activityLevel,
    goal: d.goal,
  });
  return (
    <div className="rounded-2xl border bg-card p-4 text-sm">
      <p className="font-medium">Suggested starting targets</p>
      <div className="mt-2 grid grid-cols-3 gap-2 tabular-nums">
        <div><div className="text-lg font-semibold">{t.calories.toLocaleString("en-GB")}</div><div className="text-xs text-muted-foreground">kcal a day</div></div>
        <div><div className="text-lg font-semibold">{t.proteinG} g</div><div className="text-xs text-muted-foreground">protein</div></div>
        <div><div className="text-lg font-semibold">{t.steps.toLocaleString("en-GB")}</div><div className="text-xs text-muted-foreground">steps</div></div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Estimates from a standard formula. You can change them at any time in Profile. If you are pregnant, have a medical condition or a history of disordered eating, check targets with your GP or a registered dietitian first.
      </p>
    </div>
  );
}
