import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { todayKey } from "../calc";
import { toast } from "../notify";
import { REST_PER_WEEK, REST_REASONS, restAllowed, restDaysThisWeek, type RestReason } from "../rest";
import { useDaily15 } from "../store";

/** 'Not today': take the day off without guilt, with a gentle five-minute option. */
export function NotTodaySheet({ open, onOpenChange, onRecovery }: { open: boolean; onOpenChange: (o: boolean) => void; onRecovery: () => void }) {
  const { state, update } = useDaily15();
  const today = todayKey();
  const [reason, setReason] = useState<RestReason | null>(null);
  useEffect(() => {
    if (open) setReason(null);
  }, [open]);
  const used = restDaysThisWeek(state, today);
  const allowed = restAllowed(state, today, reason);
  const note = REST_REASONS.find((r) => r.id === reason)?.note;

  const takeOff = () => {
    if (allowed) {
      update((s) => ({
        ...s,
        restDays: s.restDays.includes(today) ? s.restDays : [...s.restDays, today],
        sickDays: reason === "unwell" ? [...new Set([...(s.sickDays ?? []), today])] : s.sickDays,
      }));
      toast.success("Rest day. Your streak is paused, not broken.");
    } else {
      toast.success("Rest well. Back tomorrow.");
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader>
          <SheetTitle>Not today</SheetTitle>
          <SheetDescription>Rest is part of training. A rest day pauses your streak; it doesn't break it.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-medium">If you'd like to say why</p>
            <p className="text-xs text-muted-foreground">Optional, and only used for the note below. It isn't saved.</p>
            <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Why">
              {REST_REASONS.filter((r) => r.id !== "period" || state.profile?.sex !== "male").map((r) => (
                <button
                  key={r.id}
                  role="radio"
                  aria-checked={reason === r.id}
                  onClick={() => setReason(reason === r.id ? null : r.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${reason === r.id ? "border-foreground bg-foreground text-background" : "bg-card"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {note && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{note}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            {allowed
              ? reason === "unwell"
                ? "Days off ill don't count towards your rest days."
                : `Rest days this week: ${used} of ${REST_PER_WEEK}.`
              : `You've had your ${REST_PER_WEEK} rest days this week. You can still take today off: missing one day doesn't break your streak, only two in a row.`}
          </p>
          <div className="grid gap-2">
            <Button size="lg" onClick={takeOff}>
              <Moon className="mr-1.5 h-4 w-4" />
              Take today off
            </Button>
            {reason !== "unwell" && (
              <Button variant="outline" onClick={() => { onOpenChange(false); onRecovery(); }}>
                Do five minutes of Recovery instead
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
