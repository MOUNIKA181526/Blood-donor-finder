import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { HeartPulse, ShieldCheck, ShieldAlert, Loader2, Search, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type AdminDonor = {
  id: string;
  name: string | null;
  blood_group: string | null;
  state: string | null;
  city: string | null;
  contact: string | null;
  aadhaar_ok: boolean;
  aadhaar_last4: string | null;
  is_listed: boolean;
  rejection_reason: string | null;
  updated_at: string;
};

type Tab = "unverified" | "verified" | "rejected" | "all";

function AdminPage() {
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [donors, setDonors] = useState<AdminDonor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("unverified");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      const ok = !!role;
      setIsAdmin(ok);
      setCheckingRole(false);
      if (ok) await refresh();
    })();
  }, [navigate]);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("donors")
      .select("id, name, blood_group, state, city, contact, aadhaar_ok, aadhaar_last4, is_listed, rejection_reason, updated_at")
      .order("updated_at", { ascending: false });
    if (error) setError(error.message);
    setDonors((data ?? []) as AdminDonor[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return donors
      .filter((d) => {
        if (tab === "verified") return d.aadhaar_ok && !d.rejection_reason;
        if (tab === "rejected") return !!d.rejection_reason;
        if (tab === "unverified") return !d.aadhaar_ok && !d.rejection_reason;
        return true;
      })
      .filter((d) =>
        !s
          ? true
          : [d.name, d.city, d.state, d.contact, d.blood_group]
              .filter(Boolean)
              .some((v) => v!.toLowerCase().includes(s)),
      );
  }, [donors, tab, q]);

  const counts = useMemo(
    () => ({
      unverified: donors.filter((d) => !d.aadhaar_ok && !d.rejection_reason).length,
      verified: donors.filter((d) => d.aadhaar_ok && !d.rejection_reason).length,
      rejected: donors.filter((d) => !!d.rejection_reason).length,
      all: donors.length,
    }),
    [donors],
  );

  const verify = async (d: AdminDonor) => {
    setBusyId(d.id);
    await supabase
      .from("donors")
      .update({ aadhaar_ok: true, rejection_reason: null })
      .eq("id", d.id);
    setBusyId(null);
    await refresh();
  };

  const unverify = async (d: AdminDonor) => {
    setBusyId(d.id);
    await supabase.from("donors").update({ aadhaar_ok: false }).eq("id", d.id);
    setBusyId(null);
    await refresh();
  };

  const reject = async (d: AdminDonor) => {
    const reason = window.prompt("Reason for rejection (shown to admins only):", d.rejection_reason ?? "");
    if (reason === null) return;
    setBusyId(d.id);
    await supabase
      .from("donors")
      .update({ rejection_reason: reason.trim() || "Rejected", aadhaar_ok: false })
      .eq("id", d.id);
    setBusyId(null);
    await refresh();
  };

  const clearRejection = async (d: AdminDonor) => {
    setBusyId(d.id);
    await supabase.from("donors").update({ rejection_reason: null }).eq("id", d.id);
    setBusyId(null);
    await refresh();
  };

  if (checkingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking permissions…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-red-600" />
        <h1 className="mt-4 text-2xl font-bold">Admin access only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account doesn't have the <code>admin</code> role. Ask an existing admin to grant it.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm text-red-600 hover:text-red-700">
          ← Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-background to-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-600/20">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Admin — Donor verification</h1>
              <p className="text-xs text-muted-foreground">Review, verify, or reject donor listings.</p>
            </div>
          </Link>
          <Link to="/profile" className="text-xs text-muted-foreground hover:text-foreground">
            My profile →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center gap-2">
          {(["unverified", "verified", "rejected", "all"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "rounded-full px-4 py-1.5 text-xs font-medium capitalize transition " +
                (tab === t
                  ? "bg-red-600 text-white"
                  : "border border-input bg-background text-foreground hover:bg-accent")
              }
            >
              {t} <span className="ml-1 opacity-70">({counts[t]})</span>
            </button>
          ))}
          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, city, contact…"
              className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {loading ? (
            <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading donors…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No donors in this view.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Donor</th>
                  <th className="px-4 py-3 text-left">Blood</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Aadhaar</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-t border-border/60 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{d.name || <span className="text-muted-foreground">— (incomplete)</span>}</p>
                      <p className="text-xs text-muted-foreground">Listed: {d.is_listed ? "yes" : "no"}</p>
                    </td>
                    <td className="px-4 py-3">{d.blood_group || "—"}</td>
                    <td className="px-4 py-3">
                      {d.city || "—"}
                      {d.state ? <span className="text-muted-foreground">, {d.state}</span> : null}
                    </td>
                    <td className="px-4 py-3">{d.contact || "—"}</td>
                    <td className="px-4 py-3">
                      {d.aadhaar_last4 ? `•••• ${d.aadhaar_last4}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {d.rejection_reason ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                            <XCircle className="h-3 w-3" /> Rejected
                          </span>
                          <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                            {d.rejection_reason}
                          </p>
                        </div>
                      ) : d.aadhaar_ok ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        {busyId === d.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {!d.aadhaar_ok && (
                          <button
                            onClick={() => verify(d)}
                            disabled={busyId === d.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                          </button>
                        )}
                        {d.aadhaar_ok && (
                          <button
                            onClick={() => unverify(d)}
                            disabled={busyId === d.id}
                            className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                          >
                            Un-verify
                          </button>
                        )}
                        {d.rejection_reason ? (
                          <button
                            onClick={() => clearRejection(d)}
                            disabled={busyId === d.id}
                            className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                          >
                            Clear rejection
                          </button>
                        ) : (
                          <button
                            onClick={() => reject(d)}
                            disabled={busyId === d.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
