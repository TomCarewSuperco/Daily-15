import { useCallback, useEffect, useState } from "react";
import { Dumbbell, Home, LineChart, User, Utensils } from "lucide-react";
import { AuthProvider, useAuth } from "./cloud/AuthProvider";
import { cloudEnabled } from "./cloud/client";
import { useReminders } from "./components/useReminders";
import type { Intent, TabId } from "./nav";
import { Daily15Provider, useDaily15 } from "./store";
import { AuthScreen, ResetPasswordScreen } from "./tabs/Auth";
import { HomeTab } from "./tabs/HomeTab";
import { NutritionTab } from "./tabs/NutritionTab";
import { Onboarding } from "./tabs/Onboarding";
import { ProfileTab } from "./tabs/ProfileTab";
import { ProgressTab } from "./tabs/ProgressTab";
import { WorkoutsTab } from "./tabs/WorkoutsTab";

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
    <>
      <main className="px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        {tab === "home" && <HomeTab onNavigate={navigate} />}
        {tab === "workouts" && <WorkoutsTab intent={intent} clearIntent={clearIntent} />}
        {tab === "nutrition" && <NutritionTab intent={intent} clearIntent={clearIntent} />}
        {tab === "progress" && <ProgressTab intent={intent} clearIntent={clearIntent} />}
        {tab === "profile" && <ProfileTab />}
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
    </>
  );
}

function AccountGate() {
  const { session, loading, recovering } = useAuth();
  if (loading) return <Splash text="Signing in" />;
  if (session && recovering) return <ResetPasswordScreen />;
  if (!session) return <AuthScreen />;
  return (
    <Daily15Provider key={session.user.id} userId={session.user.id}>
      <Shell />
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
          <Shell />
        </Daily15Provider>
      )}
    </div>
  );
}
