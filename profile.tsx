import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HeartPulse, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isValidAadhaar, aadhaarLast4, formatAadhaar, digitsOnly } from "@/lib/aadhaar";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
];

function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [aadhaarSaved, setAadhaarSaved] = useState(false);
  const [isListed, setIsListed] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUserEmail(userData.user?.email ?? userData.user?.phone ?? null);
      const { data } = await supabase.from("donors").select("*").maybeSingle();
      if (data) {
        setName(data.name ?? "");
        setBloodGroup(data.blood_group ?? "");
        setState(data.state ?? "");
        setCity(data.city ?? "");
        setContact(data.contact ?? "");
        setIsListed(data.is_listed ?? true);
        setRejectionReason(data.rejection_reason ?? null);
        if (data.aadhaar_last4) {
          setAadhaarSaved(true);
        }
      }
      setLoading(false);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    let aadhaarUpdate: { aadhaar_last4: string; aadhaar_ok: boolean } | null = null;
    if (aadhaar.trim()) {
      if (!isValidAadhaar(aadhaar)) {
        setError("Aadhaar number is invalid (must be 12 digits, valid Verhoeff checksum).");
        setSaving(false);
        return;
      }
      aadhaarUpdate = { aadhaar_last4: aadhaarLast4(aadhaar), aadhaar_ok: true };
    }

    const userId = (await supabase.auth.getUser()).data.user!.id;
    const { error } = await supabase
      .from("donors")
      .update({
        name: name.trim(),
        blood_group: bloodGroup || null,
        state: state.trim() || null,
        city: city.trim() || null,
        contact: contact.trim() || null,
        is_listed: isListed,
        ...(aadhaarUpdate ?? {}),
      })
      .eq("id", userId);
    setSaving(false);
    if (error) return setError(error.message);
    setSaved(true);
    if (aadhaarUpdate) setAadhaarSaved(true);
    setAadhaar("");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-background to-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-600/20">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Blood Donor Finder
              </h1>
              <p className="text-xs text-muted-foreground">
                {userEmail ? `Signed in as ${userEmail}` : "Donor profile"}
              </p>
            </div>
          </Link>
          <button
            onClick={signOut}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Your donor listing</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Fill in your details to appear in the public donor search. All fields are required, and
          your listing appears in search results <strong>only after Aadhaar self-verification</strong>.
        </p>

        {!loading && !aadhaarSaved && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">Not yet verified</p>
            <p className="mt-0.5 text-xs">
              Add your 12-digit Aadhaar number below to verify your identity. Until you do, your
              profile stays hidden from public search — even with "List me publicly" on.
            </p>
          </div>
        )}

        {!loading && rejectionReason && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-medium">Your listing was rejected by an admin</p>
            <p className="mt-0.5 text-xs"><strong>Reason:</strong> {rejectionReason}</p>
            <p className="mt-1 text-xs">Update your details below and re-verify your Aadhaar to request review.</p>
          </div>
        )}

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <Field label="Full name">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Blood group">
                <select
                  required
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="input"
                >
                  <option value="">Select…</option>
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <Field label="Contact phone (shown publicly)">
                <input
                  required
                  type="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="+91 98200 12345"
                  className="input"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="State">
                <select
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="input"
                >
                  <option value="">Select…</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="City">
                <input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input"
                />
              </Field>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Aadhaar (self-declared)</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    We only store the last 4 digits + a verified flag. Full number is never saved.
                  </p>
                </div>
                {aadhaarSaved && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>
              <input
                inputMode="numeric"
                value={aadhaar}
                onChange={(e) => setAadhaar(formatAadhaar(e.target.value))}
                placeholder={aadhaarSaved ? "Enter new 12-digit Aadhaar to replace" : "1234 5678 9012"}
                className="input mt-3"
              />
              {aadhaar && digitsOnly(aadhaar).length === 12 && (
                <p className={"mt-1 text-xs " + (isValidAadhaar(aadhaar) ? "text-emerald-600" : "text-red-600")}>
                  {isValidAadhaar(aadhaar) ? "Checksum valid ✓" : "Invalid Aadhaar checksum"}
                </p>
              )}
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-4">
              <input
                type="checkbox"
                checked={isListed}
                onChange={(e) => setIsListed(e.target.checked)}
                className="h-4 w-4 accent-red-600"
              />
              <div>
                <p className="text-sm font-medium text-foreground">List me publicly</p>
                <p className="text-xs text-muted-foreground">
                  When off, your card is hidden from search but your account is kept.
                </p>
              </div>
            </label>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            {saved && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Saved. Your listing is up to date.
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to search
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save profile
              </button>
            </div>
          </form>
        )}
      </main>
      <style>{`
        .input {
          height: 2.5rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--input));
          background: hsl(var(--background));
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: hsl(var(--foreground));
          outline: none;
        }
        .input:focus {
          border-color: rgb(239 68 68);
          box-shadow: 0 0 0 2px rgb(239 68 68 / 0.2);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
