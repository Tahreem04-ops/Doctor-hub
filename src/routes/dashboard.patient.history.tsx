import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/patient/history")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("medical_history").select("*").eq("patient_id", user.id).order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, [user]);

  async function remove(id: string) {
    await supabase.from("medical_history").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Medical history</h1>
        <Dialog>
          <DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" />Add record</Button></DialogTrigger>
          <AddDialog onSaved={load} userId={user?.id} />
        </Dialog>
      </div>
      {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No records yet. Add allergies, chronic conditions, and ongoing meds for safer consultations.</Card>}
      {rows.map((r) => (
        <Card key={r.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="font-display text-lg font-semibold">{r.condition}</div>
              {r.diagnosed_on && <div className="text-xs text-muted-foreground">Diagnosed: {r.diagnosed_on}</div>}
              {r.notes && <p className="mt-2 text-sm">{r.notes}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {(r.allergies ?? []).map((x: string) => <span key={x} className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">⚠ {x}</span>)}
                {(r.current_medications ?? []).map((x: string) => <span key={x} className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">💊 {x}</span>)}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AddDialog({ onSaved, userId }: any) {
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [allergies, setAllergies] = useState("");
  const [meds, setMeds] = useState("");
  async function save() {
    if (!userId || !condition) return;
    const { error } = await supabase.from("medical_history").insert({
      patient_id: userId, condition, notes, diagnosed_on: date || null,
      allergies: allergies.split(",").map((s) => s.trim()).filter(Boolean),
      current_medications: meds.split(",").map((s) => s.trim()).filter(Boolean),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); onSaved();
  }
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add medical record</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Condition *</Label><Input value={condition} onChange={(e)=>setCondition(e.target.value)} placeholder="e.g. Asthma" /></div>
        <div className="space-y-1.5"><Label>Diagnosed on</Label><Input type="date" value={date} onChange={(e)=>setDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e)=>setNotes(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Allergies (comma separated)</Label><Input value={allergies} onChange={(e)=>setAllergies(e.target.value)} placeholder="penicillin, peanuts" /></div>
        <div className="space-y-1.5"><Label>Current medications (comma separated)</Label><Input value={meds} onChange={(e)=>setMeds(e.target.value)} placeholder="metformin 500mg" /></div>
        <Button onClick={save} className="w-full">Save</Button>
      </div>
    </DialogContent>
  );
}
