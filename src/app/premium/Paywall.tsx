import { useState, type ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "../notify";
import { PREMIUM_FEATURES } from "./config";
import { usePremium, type Plan } from "./PremiumProvider";

/** The subscription sheet. Apple requires the price, period, renewal terms and links to the terms and privacy policy. */
export function Paywall() {
  const { paywallOpen, closePaywall, plans, canPurchase, purchase, restore } = usePremium();
  const [busy, setBusy] = useState<string | null>(null);
  const annual = plans.find((p) => p.period === "annual");
  const [chosen, setChosen] = useState<Plan | null>(null);
  const pick = chosen ?? annual ?? plans[0] ?? null;

  const buy = async () => {
    if (!pick) return;
    setBusy("buy");
    const ok = await purchase(pick);
    setBusy(null);
    if (ok) toast.success("Welcome to DAILY 15 Premium");
  };
  const doRestore = async () => {
    setBusy("restore");
    const ok = await restore();
    setBusy(null);
    toast(ok ? "Premium restored" : "No active subscription found for this Apple ID");
  };

  return (
    <Sheet open={paywallOpen} onOpenChange={(o) => !o && closePaywall()}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-md overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>DAILY 15 Premium</SheetTitle>
        </SheetHeader>
        <div className="mt-3 space-y-4 pb-4">
          <p className="text-sm text-muted-foreground">The daily 15, food tracking and streaks stay free. Premium turns them into a plan.</p>
          <ul className="space-y-2 text-sm">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--d15-done))]" />{f}</li>
            ))}
          </ul>
          {canPurchase ? (
            plans.length ? (
              <>
                <div className="grid gap-2">
                  {plans.map((p) => (
                    <button key={p.id} onClick={() => setChosen(p)} className={`rounded-2xl border p-3 text-left ${pick?.id === p.id ? "border-foreground ring-1 ring-foreground" : "bg-card"}`}>
                      <div className="flex justify-between font-medium"><span>{p.period === "annual" ? "Annual" : p.period === "monthly" ? "Monthly" : p.title}</span><span className="tabular-nums">{p.price}</span></div>
                      {p.trial && <div className="text-xs text-muted-foreground">{p.trial}, then {p.price} {p.period === "annual" ? "a year" : p.period === "monthly" ? "a month" : ""}</div>}
                    </button>
                  ))}
                </div>
                <Button size="lg" className="w-full" disabled={!pick || !!busy} onClick={buy}>{pick?.trial ? "Start free trial" : "Subscribe"}</Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Plans couldn't be loaded. Check your connection and try again.</p>
            )
          ) : (
            <p className="rounded-xl bg-muted p-3 text-sm">Subscribe in the DAILY 15 iPhone app. Once you're subscribed and signed in, Premium works here too.</p>
          )}
          {canPurchase && <Button variant="ghost" className="w-full" disabled={!!busy} onClick={doRestore}>Restore purchases</Button>}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Payment is taken from your Apple ID when you confirm. The subscription renews automatically unless you cancel at least 24 hours before the end of the current period, in your Apple ID's subscription settings. Any free trial ends when you subscribe.{" "}
            <a className="underline" href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noreferrer">Terms of use</a> ·{" "}
            <a className="underline" href="/privacy" target="_blank" rel="noreferrer">Privacy policy</a>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Shows children with Premium; otherwise a short locked card that opens the paywall. */
export function PremiumGate({ title, why, children }: { title: string; why: string; children: ReactNode }) {
  const { premium, loading, openPaywall } = usePremium();
  if (premium || loading) return <>{children}</>;
  return (
    <div className="rounded-2xl border border-dashed p-4 text-sm">
      <p className="flex items-center gap-1.5 font-medium"><Lock className="h-4 w-4" />{title}</p>
      <p className="mt-1 text-muted-foreground">{why}</p>
      <Button size="sm" className="mt-3" onClick={openPaywall}>See Premium</Button>
    </div>
  );
}
