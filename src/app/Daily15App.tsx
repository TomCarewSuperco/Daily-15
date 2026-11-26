import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Dumbbell, Home, LineChart, User, Utensils } from "lucide-react";
import { AuthProvider, useAuth } from "./cloud/AuthProvider";
import { PremiumProvider } from "./premium/PremiumProvider";
import { Paywall } from "./premium/Paywall";
import { ErrorBoundary, importWithReload } from "./components/ErrorBoundary";
import { cloudEnabled } from "./cloud/client";
import { useReminders } from "./components/useReminders";
import { useHealthSync } from "./native/useHealthSync";
import type { Intent, TabId } from "./nav";
import { Daily15Provider, useDaily15 } from "./store";
import { ActiveSessionProvider, useSession } from "./session";
import { AuthScreen, ResetPasswordScreen } from "./tabs/Auth";
import { HomeTab } from "./tabs/HomeTab";
import { Onboarding } from "./tabs/Onboarding";
// Home loads first; the other tabs load on first visit, so the app opens faster on a phone.
const NutritionTab = lazy(importWithReload(() => import("./tabs/NutritionTab").then((m) => ({ default: m.NutritionTab }))));
const ProgressTab = lazy(importWithReload(() => import("./tabs/ProgressTab").then((m) => ({ default: m.ProgressTab }))));
const ProfileTab = lazy(importWithReload(() => import("./tabs/ProfileTab").then((m) => ({ default: m.ProfileTab }))));
const WorkoutsTab = lazy(importWithReload(() => import("./tabs/WorkoutsTab").then((m) => ({ default: m.WorkoutsTab }))));

const TABS: { id: TabId; label: string; Icon: typeof Home }[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "workouts", label: "Workouts", Icon: Dumbbell },
  { id: "nutrition", label: "Nutrition", Icon: Utensils },
  { id: "progress", label: "Progress", Icon: LineChart },
  { id: "profile", label: "Profile", Icon: User },
];

function Splash({ text }: { text: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-2">
      <p className="text-sm font-semibold uppercase tracking-widest text-copper">DAILY 15</p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Shell() {
  const { state, sync } = useDaily15();
  const [tab, setTab] = useState<TabId>("home");
  const [intent, setIntent] = useState<Intent>(null);
  const clearIntent = useCallback(() => setIntent(null), []);
  useReminders(state);
  useHealthSync(true);

  const navigate = useCallback((t: TabId, i: Intent = null) => {
    setTab(t);
    setIntent(i);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  if (!sync.ready) return <Splash text="Loading your data" />;
  if (!state.profile) return <Onboarding />;

  return (
    <ActiveSessionProvider>
      <Tabs tab={tab} navigate={navigate} intent={intent} clearIntent={clearIntent} />
    </ActiveSessionProvider>
  );
}

/** The tabs and tab bar. Hidden (kept mounted) while a workout fills the screen; a minimised workout sits above the tab bar. */
function Tabs({ tab, navigate, intent, clearIntent }: { tab: TabId; navigate: (t: TabId, i?: Intent) => void; intent: Intent; clearIntent: () => void }) {
  const { active, minimised } = useSession();
  const covered = !!active && !minimised;
  return (
    <div className={covered ? "hidden" : ""}>
      {/* Covers the strip under the iPhone status bar so scrolled content doesn't show behind the clock. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-background" />
      <main className={`px-4 pt-[max(1rem,env(safe-area-inset-top))] ${active ? "pb-44" : "pb-28"}`}>
        <ErrorBoundary resetKey={tab}>
        <Suspense fallback={<p className="pt-8 text-center text-sm text-muted-foreground">Loading</p>}>
        {tab === "home" && <HomeTab onNavigate={navigate} />}
        {tab === "workouts" && <WorkoutsTab intent={intent} clearIntent={clearIntent} />}
        {tab === "nutrition" && <NutritionTab intent={intent} clearIntent={clearIntent} />}
        {tab === "progress" && <ProgressTab intent={intent} clearIntent={clearIntent} />}
        {tab === "profile" && <ProfileTab />}
        </Suspense>
        </ErrorBoundary>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Main">
        <ul className="grid grid-cols-5">
          {TABS.map(({ id, label, Icon }) => (
            <li key={id}>
              <button
                className={`flex w-full flex-col items-center gap-0.5 py-2.5 text-[11px] ${tab === id ? "text-foreground" : "text-muted-foreground"}`}
                onClick={() => navigate(id)}
                aria-current={tab === id ? "page" : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={tab === id ? 2.25 : 1.75} />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function AccountGate() {
  const { session, loading, recovering } = useAuth();
  if (loading) return <Splash text="Signing in" />;
  if (session && recovering) return <ResetPasswordScreen />;
  if (!session) return <AuthScreen />;
  return (
    <Daily15Provider key={session.user.id} userId={session.user.id}>
      <PremiumProvider>
        <Shell />
        <Paywall />
      </PremiumProvider>
    </Daily15Provider>
  );
}

export function Daily15App() {
  return (
    <div className="mx-auto min-h-[100dvh] max-w-md bg-background">
      {cloudEnabled ? (
        <AuthProvider>
          <AccountGate />
        </AuthProvider>
      ) : (
        <Daily15Provider>
          <PremiumProvider>
            <Shell />
            <Paywall />
          </PremiumProvider>
        </Daily15Provider>
      )}
    </div>
  );
}
