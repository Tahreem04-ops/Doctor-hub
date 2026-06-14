import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, Star, FlaskConical, Sparkles, Leaf, Calendar, Clock, BadgeCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor/$id")({
  component: DoctorDetail,
  head: () => ({ meta: [{ title: "Doctor — Doctor Hub" }] }),
});

const TYPE_META: any = {
  allopathic: { icon: FlaskConical, color: "var(--allo)", label: "Allopathic" },
  homeopathic:{ icon: Sparkles,    color: "var(--homeo)", label: "Homeopathic" },
  herbal:     { icon: Leaf,        color: "var(--herbal)", label: "Herbal" },
};

function DoctorDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [shareHistory, setShareHistory] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: d } = await supabase.from("doctors").select("*").eq("id", id).maybeSingle();
      if (!d) return;
      setDoc(d);
      const [{ data: p }, { data: sc }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", d.user_id).maybeSingle(),
        supabase.from("doctor_schedules").select("*").eq("doctor_id", id).eq("is_active", true),
      ]);
      setProfile(p);
      setSchedules(sc ?? []);
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!doc) return;
      const { data } = await supabase.from("appointments").select("start_time").eq("doctor_id", doc.id).eq("appointment_date", date).neq("status","cancelled");
      setBookedTimes((data ?? []).map((x: any) => x.start_time));
      setSlot(null);
    })();
  }, [doc, date]);

  const day = new Date(date).getDay();
  const sched = schedules.find((s) => s.day_of_week === day);
  const slots = sched ? generateSlots(sched.start_time, sched.end_time, sched.slot_minutes) : [];

  async function book() {
    if (!user) { navigate({ to: "/auth", search: { mode: "signin" } as any }); return; }
    if (!slot || !sched) return;
    setBooking(true);
    try {
      const end = addMinutes(slot, sched.slot_minutes);
      const { data: appt, error } = await supabase.from("appointments").insert({
        patient_id: user.id, doctor_id: doc.id, appointment_date: date,
        start_time: slot, end_time: end, reason, symptoms, share_history: shareHistory,
        fee: doc.consultation_fee,
      }).select().single();
      if (error) throw error;
      await supabase.from("payments").insert({
        appointment_id: appt.id, patient_id: user.id, amount: doc.consultation_fee, status: "pending",
      });
      toast.success("Appointment requested. Complete payment to confirm.");
      navigate({ to: "/dashboard/patient" });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBooking(false); }
  }

  if (!doc) return <div className="min-h-screen"><SiteHeader /><div className="mx-auto max-w-7xl p-10">Loading…</div></div>;
  const meta = TYPE_META[doc.treatment_type];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link to="/doctors" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" />All doctors</Link>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="overflow-hidden p-0">
            <div className="relative bg-hero-orb p-8">
              <div className="absolute inset-0 bg-grain opacity-30" />
              <div className="relative flex items-start gap-5">
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-card font-display text-3xl font-semibold shadow-sm">
                  {(profile?.full_name ?? "D").slice(0,1)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-3xl font-semibold">{profile?.full_name}</h1>
                    {doc.is_verified && <BadgeCheck className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="text-muted-foreground">{doc.specialization} · {doc.experience_years} years</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-0" style={{ color: meta.color, backgroundColor: `color-mix(in oklch, ${meta.color} 14%, transparent)` }}>
                      <meta.icon className="mr-1 h-3 w-3" /> {meta.label}
                    </Badge>
                    {profile?.city && <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{profile.city}</Badge>}
                    <Badge variant="outline"><Star className="mr-1 h-3 w-3 fill-accent text-accent" />{Number(doc.rating).toFixed(1)} ({doc.total_reviews})</Badge>
                  </div>
                </div>
                <div className="hidden text-right md:block">
                  <div className="text-xs text-muted-foreground">Consultation fee</div>
                  <div className="font-display text-2xl font-semibold">PKR {Number(doc.consultation_fee).toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className="space-y-5 p-8">
              {doc.bio && <Section title="About"><p className="text-sm text-muted-foreground leading-relaxed">{doc.bio}</p></Section>}
              {doc.qualifications && <Section title="Qualifications"><p className="text-sm text-muted-foreground">{doc.qualifications}</p></Section>}
              {doc.diseases?.length>0 && <Section title="Treats">
                <div className="flex flex-wrap gap-1.5">{doc.diseases.map((x: string)=><span key={x} className="rounded-full bg-muted px-2.5 py-1 text-xs">{x}</span>)}</div>
              </Section>}
              {doc.languages?.length>0 && <Section title="Languages"><div className="text-sm text-muted-foreground">{doc.languages.join(", ")}</div></Section>}
            </div>
          </Card>

          <Card className="h-fit p-6">
            <div className="font-display text-xl font-semibold">Book an appointment</div>
            <p className="mt-1 text-xs text-muted-foreground">Pick a date, choose a slot, share your concern.</p>
            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" />Date</Label>
                <Input type="date" value={date} min={new Date().toISOString().slice(0,10)} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" />Available slots</Label>
                {!sched ? <div className="text-xs text-muted-foreground">Doctor is not available this day.</div> :
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((s) => {
                      const taken = bookedTimes.includes(s);
                      return (
                        <button key={s} disabled={taken} onClick={() => setSlot(s)}
                          className={`rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                            taken ? "border-border bg-muted text-muted-foreground line-through" :
                            slot===s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
                          }`}>{s.slice(0,5)}</button>
                      );
                    })}
                  </div>}
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Reason</Label>
                <Input placeholder="e.g. skin rash consultation" value={reason} onChange={(e)=>setReason(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Symptoms (optional)</Label>
                <Textarea rows={3} placeholder="Describe what you're feeling…" value={symptoms} onChange={(e)=>setSymptoms(e.target.value)} /></div>
              <label className="flex items-start gap-2 text-xs">
                <Checkbox checked={shareHistory} onCheckedChange={(v)=>setShareHistory(!!v)} />
                <span className="text-muted-foreground">Allow this doctor to view my medical history during the appointment</span>
              </label>
              <Button disabled={!slot || booking} onClick={book} size="lg" className="w-full rounded-xl">
                {booking ? "Booking…" : `Request appointment · PKR ${doc.consultation_fee}`}
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function generateSlots(start: string, end: string, mins: number): string[] {
  const out: string[] = [];
  let [h, m] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  while (h * 60 + m + mins <= eh * 60 + em) {
    out.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`);
    m += mins; while (m >= 60) { m -= 60; h++; }
  }
  return out;
}
function addMinutes(t: string, mins: number) {
  let [h, m] = t.split(":").map(Number);
  m += mins; while (m >= 60) { m -= 60; h++; }
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`;
}
