import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, FileText, Plus, Stethoscope, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/doctor/")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<any>(null);
  const [appts, setAppts] = useState<any[]>([]);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  async function load() {
    if (!user) return;
    const { data: d } = await supabase.from("doctors").select("*").eq("user_id", user.id).maybeSingle();
    setDoctor(d); setHasProfile(!!d);
    if (d) {
      const { data: a } = await supabase.from("appointments").select("*").eq("doctor_id", d.id).order("appointment_date", { ascending: false }).limit(20);
      const ids = Array.from(new Set((a ?? []).map((x: any) => x.patient_id)));
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
      const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setAppts((a ?? []).map((x: any) => ({ ...x, patient: pmap.get(x.patient_id) })));
    }
  }
  useEffect(() => { load(); }, [user]);

  if (hasProfile === null) return <div>Loading…</div>;
  if (!doctor) return <SetupCard userId={user!.id} onDone={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Practice overview</h1>
          <p className="text-sm text-muted-foreground">{doctor.specialization} · {doctor.treatment_type}</p>
        </div>
        <Dialog>
          <DialogTrigger asChild><Button variant="outline" size="sm">Edit profile</Button></DialogTrigger>
          <EditDialog doctor={doctor} onDone={load} />
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={Calendar} label="Total appointments" value={appts.length} />
        <Stat icon={Stethoscope} label="Consultation fee" value={`PKR ${doctor.consultation_fee}`} />
        <Stat icon={FileText} label="Diseases treated" value={doctor.diseases?.length ?? 0} />
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-display text-xl font-semibold">Recent appointments</div>
          <Link to="/dashboard/doctor/schedule" className="text-xs text-primary hover:underline">Manage schedule →</Link>
        </div>
        {appts.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No appointments yet.</div> :
          <div className="divide-y divide-border">
            {appts.map((a) => <ApptRow key={a.id} a={a} onUpdate={load} doctorId={doctor.id} />)}
          </div>}
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return <Card className="p-5"><div className="flex items-center justify-between"><div className="text-sm text-muted-foreground">{label}</div><Icon className="h-4 w-4 text-primary" /></div><div className="mt-2 font-display text-2xl font-semibold">{value}</div></Card>;
}

function ApptRow({ a, onUpdate, doctorId }: any) {
  async function setStatus(s: "pending"|"confirmed"|"completed"|"cancelled"|"no_show") { await supabase.from("appointments").update({ status: s }).eq("id", a.id); onUpdate(); }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <div className="font-medium">{a.patient?.full_name ?? "Patient"}</div>
        <div className="text-xs text-muted-foreground">{a.appointment_date} · {a.start_time?.slice(0,5)} · {a.reason}</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="capitalize">{a.status}</Badge>
        {a.status === "pending" && <Button size="sm" onClick={() => setStatus("confirmed")}>Confirm</Button>}
        {a.status !== "completed" && a.status !== "cancelled" && (
          <Dialog>
            <DialogTrigger asChild><Button size="sm" variant="outline">Prescribe</Button></DialogTrigger>
            <PrescribeDialog appt={a} doctorId={doctorId} onDone={() => { setStatus("completed"); }} />
          </Dialog>
        )}
      </div>
    </div>
  );
}

function SetupCard({ userId, onDone }: any) {
  const [form, setForm] = useState({ specialization: "", treatment_type: "allopathic", qualifications: "", experience_years: 0, consultation_fee: 1000, bio: "", diseases: "", languages: "" });
  async function save() {
    const { error } = await supabase.from("doctors").insert({
      user_id: userId,
      specialization: form.specialization,
      treatment_type: form.treatment_type as any,
      qualifications: form.qualifications,
      experience_years: Number(form.experience_years),
      consultation_fee: Number(form.consultation_fee),
      bio: form.bio,
      diseases: form.diseases.split(",").map((s) => s.trim()).filter(Boolean),
      languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("user_roles").insert({ user_id: userId, role: "doctor" }).then(()=>{});
    toast.success("Doctor profile created");
    onDone();
  }
  return (
    <Card className="p-7">
      <h1 className="font-display text-2xl font-semibold">Set up your practice</h1>
      <p className="text-sm text-muted-foreground">Tell patients what you treat and how to reach you.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Specialization *"><Input value={form.specialization} onChange={(e) => setForm({...form, specialization: e.target.value})} placeholder="e.g. Dermatology" /></Field>
        <Field label="Treatment type *">
          <Select value={form.treatment_type} onValueChange={(v) => setForm({...form, treatment_type: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="allopathic">Allopathic</SelectItem><SelectItem value="homeopathic">Homeopathic</SelectItem><SelectItem value="herbal">Herbal</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Qualifications"><Input value={form.qualifications} onChange={(e) => setForm({...form, qualifications: e.target.value})} placeholder="MBBS, FCPS" /></Field>
        <Field label="Experience (years)"><Input type="number" value={form.experience_years} onChange={(e) => setForm({...form, experience_years: e.target.value as any})} /></Field>
        <Field label="Consultation fee (PKR)"><Input type="number" value={form.consultation_fee} onChange={(e) => setForm({...form, consultation_fee: e.target.value as any})} /></Field>
        <Field label="Languages (comma)"><Input value={form.languages} onChange={(e) => setForm({...form, languages: e.target.value})} placeholder="English, Urdu" /></Field>
        <Field label="Diseases treated (comma)" className="md:col-span-2"><Input value={form.diseases} onChange={(e) => setForm({...form, diseases: e.target.value})} placeholder="Acne, Eczema, Psoriasis" /></Field>
        <Field label="Bio" className="md:col-span-2"><Textarea rows={3} value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} /></Field>
      </div>
      <Button onClick={save} className="mt-5">Create profile</Button>
    </Card>
  );
}

function EditDialog({ doctor, onDone }: any) {
  const [f, setF] = useState({ ...doctor, diseases: doctor.diseases?.join(", ") ?? "", languages: doctor.languages?.join(", ") ?? "" });
  async function save() {
    const { error } = await supabase.from("doctors").update({
      specialization: f.specialization, treatment_type: f.treatment_type, qualifications: f.qualifications,
      experience_years: Number(f.experience_years), consultation_fee: Number(f.consultation_fee), bio: f.bio,
      diseases: String(f.diseases).split(",").map((s: string) => s.trim()).filter(Boolean),
      languages: String(f.languages).split(",").map((s: string) => s.trim()).filter(Boolean),
    }).eq("id", doctor.id);
    if (error) toast.error(error.message); else { toast.success("Updated"); onDone(); }
  }
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Specialization"><Input value={f.specialization} onChange={(e) => setF({...f, specialization: e.target.value})} /></Field>
        <Field label="Consultation fee"><Input type="number" value={f.consultation_fee} onChange={(e) => setF({...f, consultation_fee: e.target.value})} /></Field>
        <Field label="Diseases" className="md:col-span-2"><Input value={f.diseases} onChange={(e) => setF({...f, diseases: e.target.value})} /></Field>
        <Field label="Bio" className="md:col-span-2"><Textarea rows={3} value={f.bio ?? ""} onChange={(e) => setF({...f, bio: e.target.value})} /></Field>
      </div>
      <Button onClick={save}>Save</Button>
    </DialogContent>
  );
}

function PrescribeDialog({ appt, doctorId, onDone }: any) {
  const [diagnosis, setDiagnosis] = useState("");
  const [meds, setMeds] = useState<any[]>([{ name: "", dosage: "", duration: "", notes: "" }]);
  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");
  async function save() {
    if (!diagnosis) { toast.error("Add diagnosis"); return; }
    const { error } = await supabase.from("prescriptions").insert({
      appointment_id: appt.id, patient_id: appt.patient_id, doctor_id: doctorId,
      diagnosis, medicines: meds.filter((m) => m.name), advice, follow_up_date: followUp || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Prescription saved");
    onDone();
  }
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Write prescription</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <Field label="Diagnosis"><Textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} /></Field>
        <div>
          <div className="mb-2 flex items-center justify-between"><Label>Medicines</Label>
            <Button size="sm" variant="ghost" onClick={() => setMeds([...meds, { name:"", dosage:"", duration:"", notes:"" }])}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
          <div className="space-y-2">
            {meds.map((m, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <Input className="col-span-3" placeholder="Name" value={m.name} onChange={(e) => setMeds(meds.map((x,j)=>j===i?{...x,name:e.target.value}:x))} />
                <Input className="col-span-3" placeholder="Dosage" value={m.dosage} onChange={(e) => setMeds(meds.map((x,j)=>j===i?{...x,dosage:e.target.value}:x))} />
                <Input className="col-span-2" placeholder="Duration" value={m.duration} onChange={(e) => setMeds(meds.map((x,j)=>j===i?{...x,duration:e.target.value}:x))} />
                <Input className="col-span-3" placeholder="Notes" value={m.notes} onChange={(e) => setMeds(meds.map((x,j)=>j===i?{...x,notes:e.target.value}:x))} />
                <Button size="icon" variant="ghost" onClick={() => setMeds(meds.filter((_,j)=>j!==i))}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        </div>
        <Field label="Advice"><Textarea rows={2} value={advice} onChange={(e) => setAdvice(e.target.value)} /></Field>
        <Field label="Follow-up date"><Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></Field>
        <Button onClick={save} className="w-full">Save & mark completed</Button>
      </div>
    </DialogContent>
  );
}

function Field({ label, children, className = "" }: any) {
  return <div className={`space-y-1.5 ${className}`}><Label>{label}</Label>{children}</div>;
}
