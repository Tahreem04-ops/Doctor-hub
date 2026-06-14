import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Leaf, FlaskConical, Sparkles, ShieldCheck, Calendar, FileText, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Doctor Hub — Find allopathic, homeopathic & herbal doctors" },
      { name: "description", content: "Search verified doctors by disease and treatment type. Book appointments, share medical history securely, and manage prescriptions." },
    ],
  }),
});

const TYPES = [
  { key: "allopathic", label: "Allopathic", icon: FlaskConical, tint: "var(--allo)", desc: "Modern medicine & specialists" },
  { key: "homeopathic", label: "Homeopathic", icon: Sparkles, tint: "var(--homeo)", desc: "Holistic remedies" },
  { key: "herbal", label: "Herbal", icon: Leaf, tint: "var(--herbal)", desc: "Ayurvedic & natural care" },
];

const POPULAR = ["Diabetes", "Skin Allergy", "Hypertension", "Asthma", "Anxiety", "Joint Pain", "Migraine", "PCOS"];

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-orb opacity-70" />
        <div className="absolute inset-0 bg-grain opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Trusted by patients & clinicians
              </div>
              <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                The right doctor,
                <br />
                <span className="text-primary">your way of healing.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                Search across <strong className="text-foreground">allopathic, homeopathic, and herbal</strong> doctors by disease or specialty. Book in seconds, share your history securely, and get e-prescriptions instantly.
              </p>

              <form
                onSubmit={(e) => { e.preventDefault(); navigate({ to: "/doctors", search: { q } as any }); }}
                className="mt-7 flex max-w-xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm"
              >
                <Search className="ml-2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search disease, symptom, or specialty…"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
                <Button type="submit" size="lg" className="rounded-xl">Search</Button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {POPULAR.map((p) => (
                  <button key={p} onClick={() => navigate({ to: "/doctors", search: { q: p } as any })}
                    className="rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground hover:bg-muted">
                    {p}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-6 text-sm">
                <Stat n="500+" l="Verified doctors" />
                <Stat n="12k" l="Appointments" />
                <Stat n="4.8★" l="Patient rating" />
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-accent/15 to-transparent blur-2xl" />
              <Card className="relative overflow-hidden rounded-[2rem] border-border p-0 shadow-xl">
                <div className="grid grid-cols-3 gap-px bg-border">
                  {TYPES.map((t) => (
                    <Link key={t.key} to="/doctors" search={{ type: t.key } as any}
                      className="group flex flex-col items-start gap-2 bg-card p-5 transition-colors hover:bg-cream">
                      <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: `color-mix(in oklch, ${t.tint} 18%, transparent)`, color: t.tint }}>
                        <t.icon className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-semibold">{t.label}</div>
                      <div className="text-[11px] leading-snug text-muted-foreground">{t.desc}</div>
                    </Link>
                  ))}
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Featured</div>
                      <div className="font-display text-xl font-semibold">Dr. Ayesha Khan</div>
                      <div className="text-xs text-muted-foreground">Dermatology · Allopathic · 12y</div>
                    </div>
                    <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">PKR 1,200</div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-cream p-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="h-4 w-4 text-primary" /> Today · 3 slots left
                    </div>
                    <Button size="sm" className="rounded-lg">Book <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-semibold tracking-tight">Built for every step of care</h2>
          <p className="mt-3 text-muted-foreground">From discovery to follow-up — one workspace for patients, doctors, and assistants.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Feature icon={Search} title="Smart search" desc="Filter doctors by disease, treatment type, city, language and fee." />
          <Feature icon={Calendar} title="Slot booking" desc="See real-time availability from doctor schedules and reserve instantly." />
          <Feature icon={FileText} title="E-prescriptions" desc="Doctors issue digital scripts; patients download a clean PDF anytime." />
          <Feature icon={ShieldCheck} title="Verified payments" desc="Assistants confirm offline transfers before the appointment is confirmed." />
          <Feature icon={Sparkles} title="Shared history" desc="Opt-in sharing of allergies, conditions and past prescriptions." />
          <Feature icon={Leaf} title="Holistic options" desc="Choose modern medicine, homeopathy or herbal — your call." />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-primary p-10 text-primary-foreground sm:p-14">
          <div className="absolute inset-0 bg-grain opacity-20" />
          <div className="relative grid items-center gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-display text-4xl font-semibold leading-tight">Are you a practitioner?</h3>
              <p className="mt-3 max-w-md text-primary-foreground/80">Set up your clinic profile, define schedules, manage assistants and run your practice from a single dashboard.</p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button size="lg" variant="secondary" className="rounded-xl" onClick={() => navigate({ to: "/auth", search: { mode: "signup", role: "doctor" } as any })}>Join as doctor</Button>
              <Button size="lg" variant="outline" className="rounded-xl border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate({ to: "/doctors" })}>Browse doctors</Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-semibold">{n}</div>
      <div className="text-xs text-muted-foreground">{l}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: any) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
      <div className="mt-4 font-display text-xl font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
