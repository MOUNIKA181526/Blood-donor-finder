import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HeartPulse, Mail, Phone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

function safeNext(v: unknown): string {
  if (typeof v !== "string") return "";
  if (!v.startsWith("/") || v.startsWith("//")) return "";
  return v;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) }),
  head: () => ({
    meta: [
      { title: "Sign in — Blood Donor Finder" },
      {
        name: "description",
        content: "Sign in or register as a donor to list your availability and help save lives.",
      },
    ],
  }),
  component: AuthPage,
});

type Tab = "email" | "phone";
type EmailMode = "signin" | "signup";
type PhoneStep = "number" | "otp";

function AuthPage() {
  const { next } = Route.useSearch();
  const [tab, setTab] = useState<Tab>("email");
  const destination = next || "/profile";

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.href = destination;
    });
  }, [destination]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-background to-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-600/20">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Blood Donor Finder
              </h1>
              <p className="text-xs text-muted-foreground">Donor account</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col px-6 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">
          Donor sign in
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Register once to list yourself as a donor, then update your details anytime.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <TabButton active={tab === "email"} onClick={() => setTab("email")}>
              <Mail className="h-4 w-4" /> Email
            </TabButton>
            <TabButton active={tab === "phone"} onClick={() => setTab("phone")}>
              <Phone className="h-4 w-4" /> Phone OTP
            </TabButton>
          </div>

          {tab === "email" ? <EmailAuth /> : <PhoneAuth />}

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleButton />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back to donor search</Link>
        </p>
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition " +
        (active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function EmailAuth() {
  const { next } = Route.useSearch();
  const dest = next || "/profile";
  const [mode, setMode] = useState<EmailMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + dest },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      window.location.href = dest;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "signup" ? "Create donor account" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        {mode === "signup"
          ? "Already have an account? Sign in"
          : "New donor? Create an account"}
      </button>
    </form>
  );
}

function PhoneAuth() {
  const { next } = Route.useSearch();
  const dest = next || "/profile";
  const [step, setStep] = useState<PhoneStep>("number");
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) return setError(error.message);
    setStep("otp");
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (error) return setError(error.message);
    window.location.href = dest;
  };

  if (step === "number") {
    return (
      <form onSubmit={sendOtp} className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Mobile number (with country code)
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98200 12345"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Send OTP
        </button>
        <p className="text-center text-[11px] text-muted-foreground">
          Phone OTP requires an SMS provider (Twilio, MSG91, etc.) configured in Cloud auth
          settings.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={verifyOtp} className="space-y-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-foreground">
          6-digit code sent to {phone}
        </label>
        <input
          type="text"
          inputMode="numeric"
          required
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-center text-lg tracking-widest outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Verify & continue
      </button>
      <button
        type="button"
        onClick={() => setStep("number")}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Change number
      </button>
    </form>
  );
}

function GoogleButton() {
  const { next } = Route.useSearch();
  const dest = next || "/profile";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + dest,
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    window.location.href = dest;
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-input bg-background text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
            />
          </svg>
        )}
        Continue with Google
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </>
  );
}
