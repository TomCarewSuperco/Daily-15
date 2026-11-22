import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { isNative } from "../native/platform";
import { useAuth } from "../cloud/AuthProvider";
import { ENTITLEMENT, PAYWALL_ENABLED, REVENUECAT_IOS_KEY } from "./config";

/** A plan as shown on the paywall. */
export interface Plan {
  id: string;
  title: string;
  price: string;
  period: "annual" | "monthly" | "other";
  /** e.g. '14-day free trial', when the store offers one. */
  trial: string | null;
  /** The RevenueCat package, passed back to purchase(). */
  pkg: unknown;
}

interface PremiumState {
  /** True when the user can use Premium features (always, while the paywall is off). */
  premium: boolean;
  loading: boolean;
  /** Purchases are possible here (the native app with RevenueCat set up). */
  canPurchase: boolean;
  plans: Plan[];
  purchase: (plan: Plan) => Promise<boolean>;
  restore: () => Promise<boolean>;
  paywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
}

const Ctx = createContext<PremiumState>({
  premium: true,
  loading: false,
  canPurchase: false,
  plans: [],
  purchase: async () => false,
  restore: async () => false,
  paywallOpen: false,
  openPaywall: () => {},
  closePaywall: () => {},
});

export const usePremium = () => useContext(Ctx);

/** RevenueCat must be configured once per app launch; later account changes log in or out. */
let configured = false;

const trialText = (p: { introPrice?: { price: number; periodNumberOfUnits: number; periodUnit: string } | null }) => {
  const i = p.introPrice;
  if (!i || i.price !== 0) return null;
  const unit = i.periodUnit.toLowerCase().replace(/s$/, "");
  return `${i.periodNumberOfUnits}-${unit} free trial`;
};

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [premium, setPremium] = useState(!PAYWALL_ENABLED);
  const [loading, setLoading] = useState(PAYWALL_ENABLED);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const canPurchase = PAYWALL_ENABLED && isNative && !!REVENUECAT_IOS_KEY;
  const userId = session?.user?.id;

  const refresh = useCallback(async () => {
    if (!PAYWALL_ENABLED) return;
    if (!canPurchase) {
      // The web app can't take payments; a subscription bought in the iPhone app is checked there.
      setPremium(false);
      setLoading(false);
      return;
    }
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      const { customerInfo } = await Purchases.getCustomerInfo();
      setPremium(!!customerInfo.entitlements.active[ENTITLEMENT]);
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      setPlans(
        (current?.availablePackages ?? []).map((pkg) => ({
          id: pkg.identifier,
          title: pkg.product.title,
          price: pkg.product.priceString,
          period: pkg.packageType === "ANNUAL" ? "annual" : pkg.packageType === "MONTHLY" ? "monthly" : "other",
          trial: trialText(pkg.product as never),
          pkg,
        })),
      );
    } catch {
      setPremium(false);
    } finally {
      setLoading(false);
    }
  }, [canPurchase]);

  // Configure once, logged in as the account so a subscription follows the user across devices.
  useEffect(() => {
    if (!canPurchase) {
      refresh();
      return;
    }
    (async () => {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      if (!configured) {
        await Purchases.configure({ apiKey: REVENUECAT_IOS_KEY, appUserID: userId ?? null });
        configured = true;
      } else if (userId) await Purchases.logIn({ appUserID: userId }).catch(() => {});
      else await Purchases.logOut().catch(() => {});
      await refresh();
    })().catch(() => setLoading(false));
  }, [canPurchase, userId, refresh]);

  const purchase = async (plan: Plan) => {
    if (!canPurchase) return false;
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: plan.pkg as never });
      const active = !!customerInfo.entitlements.active[ENTITLEMENT];
      setPremium(active);
      if (active) setPaywallOpen(false);
      return active;
    } catch {
      return false; // cancelled or failed; the store shows its own error
    }
  };

  const restore = async () => {
    if (!canPurchase) return false;
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      const { customerInfo } = await Purchases.restorePurchases();
      const active = !!customerInfo.entitlements.active[ENTITLEMENT];
      setPremium(active);
      if (active) setPaywallOpen(false);
      return active;
    } catch {
      return false;
    }
  };

  return (
    <Ctx.Provider
      value={{ premium, loading, canPurchase, plans, purchase, restore, paywallOpen, openPaywall: () => setPaywallOpen(true), closePaywall: () => setPaywallOpen(false) }}
    >
      {children}
    </Ctx.Provider>
  );
}
