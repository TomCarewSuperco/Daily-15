import { useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { appUrl, supabase } from "../cloud/client";
import { useAuth } from "../cloud/AuthProvider";
import { toast } from "../notify";

type Mode = "sign-in" | "register" | "forgot" | "check-email";

export const MIN_PASSWORD = 8;

/** Bump when the privacy policy changes in a way that needs fresh consent. */
export const PRIVACY_VERSION = "2026-11";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Turns Supabase auth errors into plain English. */
function message(err: { message?: string; code?: string; status?: number } | null): string {
  if (!err) return "Something went wrong. Try again.";
  const m = (err.message ?? "").toLowerCase();
  const code = err.code ?? "";
  if (code === "invalid_credentials" || m.includes("invalid login")) return "Email or password is incorrect.";
  if (code === "email_not_confirmed" || m.includes("not confirmed")) return "Confirm your email first. Check your inbox for the link.";
  if (code === "user_already_exists" || m.includes("already registered")) return "An account with this email already exists. Sign in instead.";
  if (code === "weak_password" || m.includes("password should")) return `Choose a stronger password of at least ${MIN_PASSWORD} characters.`;
  if (code === "over_email_send_rate_limit" || err.status === 429 || m.includes("rate limit")) return "Too many attempts. Wait a few minutes and try again.";
  if (code === "same_password") return "Choose a different password from your current one.";
  if (m.includes("fetch") || m.includes("network")) return "Couldn't connect. Check your connection and try again.";
  return err.message || "Something went wrong. Try again.";
}

function Frame({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col px-5 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <p className="text-sm font-semibold uppercase tracking-widest text-copper">DAILY 15</p>
      <h1 className="mt-3 text-5xl leading-none">{title}</h1>
      {intro && <p className="mt-4 text-muted-foreground">{intro}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className="pr-11" required />
      <button type="button" className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-muted-foreground" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p role="alert" className="text-sm text-destructive">{children}</p> : null;
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<{ email: string; reason: "confirm" | "reset" } | null>(null);

  const go = (m: Mode) => {
    setMode(m);
    setError(null);
    setPassword("");
    setConfirm("");
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const cleanEmail = email.trim().toLowerCase();

  const signIn = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(cleanEmail)) return setError("Enter a valid email address.");
    run(async () => {
      const { error: err } = await supabase!.auth.signInWithPassword({ email: cleanEmail, password });
      if (err) setError(message(err));
    });
  };

  const register = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(cleanEmail)) return setError("Enter a valid email address.");
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
    if (password !== confirm) return setError("The passwords don't match.");
    if (!consent) return setError("Tick the box to agree to DAILY 15 storing your health and fitness data.");
    run(async () => {
      const { data, error: err } = await supabase!.auth.signUp({
        email: cleanEmail,
        password,
        // Record when explicit consent to store health data was given.
        options: { emailRedirectTo: appUrl(), data: { health_data_consent_at: new Date().toISOString(), privacy_policy_version: PRIVACY_VERSION } },
      });
      if (err) return setError(message(err));
      // With email confirmation on, there's no session until the link is clicked.
      if (!data.session) {
        setSentTo({ email: cleanEmail, reason: "confirm" });
        go("check-email");
      }
    });
  };

  const forgot = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(cleanEmail)) return setError("Enter a valid email address.");
    run(async () => {
      const { error: err } = await supabase!.auth.resetPasswordForEmail(cleanEmail, { redirectTo: appUrl() });
      // Show the same message whether or not the account exists, so the form can't be used to find out who has one.
      if (err && (err.status === 429 || (err as { code?: string }).code === "over_email_send_rate_limit")) return setError(message(err));
      setSentTo({ email: cleanEmail, reason: "reset" });
      go("check-email");
    });
  };

  const resend = () =>
    run(async () => {
      if (!sentTo) return;
      const { error: err } =
        sentTo.reason === "confirm"
          ? await supabase!.auth.resend({ type: "signup", email: sentTo.email, options: { emailRedirectTo: appUrl() } })
          : await supabase!.auth.resetPasswordForEmail(sentTo.email, { redirectTo: appUrl() });
      if (err) setError(message(err));
      else toast.success("Email sent again");
    });

  const submitLabel = (label: string) => (busy ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Working" /> : label);

  if (mode === "check-email" && sentTo) {
    return (
      <Frame
        title="Check your email."
        intro={
          sentTo.reason === "confirm"
            ? `We've sent a link to ${sentTo.email}. Open it on this device to confirm your account and sign in.`
            : `If an account exists for ${sentTo.email}, we've sent a link to reset the password. Open it on this device.`
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Nothing after a few minutes? Check your junk folder.</p>
          <ErrorText>{error}</ErrorText>
          <Button variant="outline" className="w-full" disabled={busy} onClick={resend}>{submitLabel("Send it again")}</Button>
          <Button variant="ghost" className="w-full" onClick={() => go("sign-in")}>Back to sign in</Button>
        </div>
      </Frame>
    );
  }

  if (mode === "forgot") {
    return (
      <Frame title="Reset your password." intro="Enter your email and we'll send you a link to choose a new password.">
        <form className="space-y-4" onSubmit={forgot} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{submitLabel("Send reset link")}</Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => go("sign-in")}>Back to sign in</Button>
        </form>
      </Frame>
    );
  }

  const registering = mode === "register";
  return (
    <Frame
      title={registering ? "Create your account." : "Show up every day."}
      intro={registering ? "Your workouts, food and progress, saved to your account and available on any device." : "Sign in to pick up where you left off."}
    >
      <form className="space-y-4" onSubmit={registering ? register : signIn} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {!registering && (
              <button type="button" className="text-xs text-muted-foreground underline" onClick={() => go("forgot")}>
                Forgot password?
              </button>
            )}
          </div>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete={registering ? "new-password" : "current-password"} />
          {registering && <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>}
        </div>
        {registering && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput id="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          </div>
        )}
        {registering && (
          <label className="flex items-start gap-3 text-sm leading-snug">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" aria-label="Consent to storing health data" />
            <span>
              I agree to DAILY 15 storing my health and fitness data, such as weight, food and activity, to provide the app. I can withdraw by deleting my account.{" "}
              <a href="./privacy.html" target="_blank" rel="noreferrer" className="underline">Privacy policy</a>
            </span>
          </label>
        )}
        <ErrorText>{error}</ErrorText>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{submitLabel(registering ? "Create account" : "Sign in")}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {registering ? "Already have an account? " : "New to DAILY 15? "}
        <button className="font-medium text-foreground underline" onClick={() => go(registering ? "sign-in" : "register")}>
          {registering ? "Sign in" : "Create an account"}
        </button>
      </p>
      {registering && (
        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
          Only you can see your data. You can export or delete it at any time from Profile.
        </p>
      )}
    </Frame>
  );
}

/** Shown after a password-reset link, or from Profile to change the password. */
export function NewPasswordForm({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    setError(null);
    const { error: err } = await supabase!.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(message(err));
    toast.success("Password updated");
    onDone();
  };

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-confirm">Confirm new password</Label>
        <PasswordInput id="new-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </div>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Working" /> : "Save new password"}</Button>
      {onCancel && <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>Cancel</Button>}
    </form>
  );
}

export function ResetPasswordScreen() {
  const { finishRecovery } = useAuth();
  return (
    <Frame title="Choose a new password." intro="You're signed in from the reset link. Set a new password to finish.">
      <NewPasswordForm onDone={finishRecovery} />
    </Frame>
  );
}
