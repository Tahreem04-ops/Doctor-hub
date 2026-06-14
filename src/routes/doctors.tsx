import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, FlaskConical, Sparkles, Leaf } from "lucide-react";

const search = z.object({ q: z.string().optional(), type: z.enum(["allopathic","homeopathic","herbal"]).optional() });

export const Route = createFileRoute("/doctors")({
  component: DoctorsPage,
  validateSearch: search,
  head: () => ({ meta: [{ title: "Find Doctors — Doctor Hub" }] }),
});

type DoctorRow = {
  id: string; specialization: string; treatment_type: "allopathic"|"homeopathic"|"herbal";
  experience_years: number; consultation_fee: number; diseases: string[]; rating: number; total_reviews: number;
  bio: string | null;
  profiles: { full_name: string; city: string | null; avatar_url: string | null } | null;
};

const TYPE_META: Record<string,{icon:any,color:string,label:string}> = {
  allopathic: { icon: FlaskConical, color: "var(--allo)", label: "Allopathic" },
  homeopathic:{ icon: Sparkles,    color: "var(--homeo)", label: "Homeopathic" },
  herbal:     { icon: Leaf,        color: "var(--herbal)", label: "Herbal" },
};

function DoctorsPage() {
  const sp = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState(sp.q ?? "");
  const [type, setType] = useState<string | undefined>(sp.type);
  const [data, setData] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase.from("doctors").select(
        "id, user_id, specialization, treatment_type, experience_years, consultation_fee, diseases, rating, total_reviews, bio"
      ).eq("is_active", true).order("rating", { ascending: false }).limit(60);
      if (type) query = query.eq("treatment_type", type as any);
      const { data: docs, error } = await query;
      if (error) console.error(error);
      const userIds = (docs ?? []).map((d: any) => d.user_id);
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("id, full_name, city, avatar_url").in("id", userIds)
        : { data: [] as any[] };
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      let rows: DoctorRow[] = (docs ?? []).map((d: any) => ({ ...d, profiles: profMap.get(d.user_id) ?? null }));
      if (q) {
        const term = q.toLowerCase();
        rows = rows.filter((d) =>
          d.specialization.toLowerCase().includes(term) ||
          (d.diseases ?? []).some((x) => x.toLowerCase().includes(term)) ||
          (d.profiles?.full_name ?? "").toLowerCase().includes(term)
        );
      }
      setData(rows);
      setLoading(false);
    })();
  }, [type, q]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="border-b border-border bg-cream/40">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Find your doctor</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">Filter by treatment philosophy and search by disease or specialty.</p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 shadow-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                placeholder="Disease, symptom, specialty or doctor name…"
                value={q} onChange={(e) => { setQ(e.target.value); navigate({ to: "/doctors", search: { ...sp, q: e.target.value } as any, replace: true }); }} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip active={!type} onClick={() => { setType(undefined); navigate({ to: "/doctors", search: { q } as any, replace: true }); }}>All</Chip>
              {Object.entries(TYPE_META).map(([k, m]) => (
                <Chip key={k} active={type===k} onClick={() => { setType(k); navigate({ to: "/doctors", search: { q, type: k } as any, replace: true }); }}>
                  <m.icon className="mr-1.5 h-3.5 w-3.5" /> {m.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({length:6}).map((_,i)=><Card key={i} className="h-56 animate-pulse bg-muted/40 p-0" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <div className="font-display text-2xl font-semibold">No doctors found</div>
            <p className="mt-2 text-sm text-muted-foreground">Try a different keyword or treatment type. Doctors can register from the homepage.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.map((d) => {
              const m = TYPE_META[d.treatment_type];
              return (
                <Link key={d.id} to="/doctor/$id" params={{ id: d.id }}
                  className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary font-display text-xl font-semibold">
                      {(d.profiles?.full_name ?? "D").slice(0,1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-lg font-semibold leading-tight">{d.profiles?.full_name ?? "Doctor"}</div>
                      <div className="text-sm text-muted-foreground truncate">{d.specialization}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {d.profiles?.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{d.profiles.city}</span>}
                        <span>· {d.experience_years}y</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Badge variant="outline" className="border-0" style={{ color: m.color, backgroundColor: `color-mix(in oklch, ${m.color} 14%, transparent)` }}>
                      <m.icon className="mr-1 h-3 w-3" /> {m.label}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs"><Star className="h-3.5 w-3.5 fill-accent text-accent" /> {Number(d.rating).toFixed(1)} <span className="text-muted-foreground">({d.total_reviews})</span></div>
                  </div>

                  {d.diseases?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {d.diseases.slice(0,3).map((x) => <span key={x} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{x}</span>)}
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <div className="text-xs text-muted-foreground">Fee from</div>
                    <div className="font-display text-lg font-semibold">PKR {Number(d.consultation_fee).toLocaleString()}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Chip({ active, children, onClick }: any) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
      }`}>{children}</button>
  );
}
