import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Droplet, MapPin, Phone, Search, User, HeartPulse, ShieldCheck, LogIn, UserCircle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blood Donor Finder — Find donors near you" },
      {
        name: "description",
        content:
          "Search a directory of blood donors by blood group and location. Connect quickly with matching donors in your area.",
      },
      { property: "og:title", content: "Blood Donor Finder" },
      {
        property: "og:description",
        content: "Find matching blood donors by blood group and location.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Donor = {
  id: string;
  name: string;
  blood_group: string;
  state: string;
  city: string;
  contact: string;
  aadhaar_ok: boolean;
};

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
];

function Index() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loadingDonors, setLoadingDonors] = useState(true);

  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [bloodGroup, setBloodGroup] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [location, setLocation] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("donors")
        .select("id, name, blood_group, state, city, contact, aadhaar_ok")
        .eq("is_listed", true)
        .eq("aadhaar_ok", true)
        .not("name", "is", null)
        .not("blood_group", "is", null)
        .not("state", "is", null)
        .not("city", "is", null)
        .not("contact", "is", null);
      setDonors((data ?? []) as Donor[]);
      setLoadingDonors(false);
    })();

    supabase.auth.getSession().then(async ({ data }) => {
      setSignedIn(!!data.session);
      const uid = data.session?.user.id;
      if (uid) {
        const { data: r } = await supabase
          .from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
        setIsAdmin(!!r);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_ev, session) => {
      setSignedIn(!!session);
      const uid = session?.user.id;
      if (!uid) return setIsAdmin(false);
      const { data: r } = await supabase
        .from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
      setIsAdmin(!!r);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const cityOptions = useMemo(
    () =>
      Array.from(
        new Set(donors.filter((d) => !stateFilter || d.state === stateFilter).map((d) => d.city)),
      ).sort(),
    [donors, stateFilter],
  );

  const results = useMemo(() => {
    if (!searched) return [];
    return donors.filter(
      (d) =>
        (!bloodGroup || d.blood_group === bloodGroup) &&
        (!stateFilter || d.state === stateFilter) &&
        (!location || d.city.toLowerCase() === location.toLowerCase()),
    );
  }, [donors, bloodGroup, stateFilter, location, searched]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
  };

  const handleReset = () => {
    setBloodGroup("");
    setStateFilter("");
    setLocation("");
    setSearched(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-background to-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-600/20">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Blood Donor Finder
              </h1>
              <p className="text-xs text-muted-foreground">
                Connect with life-saving donors near you
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {signedIn && isAdmin && (
              <Link
                to="/admin"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                <Shield className="h-4 w-4" /> Admin
              </Link>
            )}
            {signedIn ? (
              <Link
                to="/profile"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
              >
                <UserCircle className="h-4 w-4" /> My profile
              </Link>
            ) : (
              <Link
                to="/auth"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700"
              >
                <LogIn className="h-4 w-4" /> Sign in / register
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Find a matching donor in seconds
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Search the donor directory by blood group and location. Every match could save a life.
          </p>
          <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Only Aadhaar-verified donors are shown
          </p>
        </section>

        <form
          onSubmit={handleSearch}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Blood Group
              </label>
              <div className="relative">
                <Droplet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">Any blood group</option>
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">State</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
                <select
                  value={stateFilter}
                  onChange={(e) => {
                    setStateFilter(e.target.value);
                    setLocation("");
                  }}
                  className="h-11 w-full appearance-none rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="">All states</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">City</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
                <input
                  list="locations"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={stateFilter ? `City in ${stateFilter}` : "Enter city"}
                  className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
                <datalist id="locations">
                  {cityOptions.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-medium text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
              {(searched || bloodGroup || stateFilter || location) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </form>

        <section className="mt-8">
          {loadingDonors ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              Loading donor directory…
            </div>
          ) : !searched ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
              <p className="text-sm text-muted-foreground">
                {donors.length === 0 ? (
                  <>
                    No donors are listed yet.{" "}
                    <Link to="/auth" className="font-medium text-red-600 hover:text-red-700">
                      Sign up and be the first
                    </Link>{" "}
                    to help.
                  </>
                ) : (
                  <>
                    {donors.length} donor{donors.length === 1 ? "" : "s"} listed. Choose filters
                    and hit Search.
                  </>
                )}
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Droplet className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No donors available</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different blood group or nearby city.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  {results.length} matching donor{results.length > 1 ? "s" : ""}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {bloodGroup || "Any group"} · {stateFilter || "All states"} · {location || "All cities"}
                </span>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {results.map((d) => (
                  <li
                    key={d.id}
                    className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{d.name}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {d.city}, {d.state}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                        {d.blood_group}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <a
                        href={`tel:${d.contact.replace(/\s/g, "")}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        <Phone className="h-4 w-4" />
                        {d.contact}
                      </a>
                      {d.aadhaar_ok && (
                        <span
                          title="Aadhaar self-declared by donor (12-digit checksum verified). Not a UIDAI KYC check."
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                        >
                          <ShieldCheck className="h-3 w-3" /> Aadhaar ✓
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-red-100 bg-red-50/60 p-5 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Need an official blood bank?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Check India's Government e-RaktKosh portal for verified blood banks, availability and camps across states.
            </p>
          </div>
          <a
            href="https://eraktkosh.mohfw.gov.in/eraktkoshPortal/#/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700 sm:mt-0"
          >
            Visit e-RaktKosh →
          </a>
        </section>

        <footer className="mt-16 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          Donate blood, save lives. Official source:{" "}
          <a
            href="https://eraktkosh.mohfw.gov.in/eraktkoshPortal/#/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:text-red-700"
          >
            e-RaktKosh
          </a>
        </footer>
      </main>
    </div>
  );
}
