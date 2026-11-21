import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface NumFieldProps {
  label: string;
  value: number | "" | undefined;
  onChange: (v: number | "") => void;
  suffix?: string;
  step?: number;
  hint?: string;
  min?: number;
}

export function NumField({ label, value, onChange, suffix, step = 1, hint, min = 0 }: NumFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className={suffix ? "pr-12" : ""}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </Field>
  );
}

interface ChoiceProps<T extends string> {
  value: T;
  options: readonly { value: NoInfer<T>; label: string }[];
  onChange: (v: NoInfer<T>) => void;
  columns?: number;
}

export function Choice<T extends string>({ value, options, onChange, columns = 2 }: ChoiceProps<T>) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${value === o.value ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted"}`}
          aria-pressed={value === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
