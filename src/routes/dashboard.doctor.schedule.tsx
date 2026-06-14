import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard/doctor/schedule")({ component: Page });

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function Page() {
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [day, setDay] = useState("1"); const [start, setStart] = useState("09:00"); const [end, setEnd] = useState("17:00"); const [slot, setSlot] = useState("30");

  async function load() {
    if (!user) return;
    const { data: d } = await supabase.from("doctors").select("id").eq("user_id", user.id).maybeSingle();
    if (!d) return;
    setDoctorId(d.id);
    const { data } = await supabase.from("doctor_schedules").select("*").eq("doctor_id", d.id).order("day_of_week");
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, [user]);

  async function add() {
    if (!doctorId) return;
    const { error } = await supabase.from("doctor_schedules").insert({ doctor_id: doctorId, day_of_week: Number(day), start_time: start, end_time: end, slot_minutes: Number(slot) });
    if (error) toast.error(error.message); else { toast.success("Added"); load(); }
  }
  async function remove(id: string) { await supabase.from("doctor_schedules").delete().eq("id", id); load(); }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Weekly schedule</h1>
      <Card className="p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div><Label>Day</Label><Select value={day} onValueChange={setDay}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DAYS.map((d,i)=><SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Start</Label><Input type="time" value={start} onChange={(e)=>setStart(e.target.value)} /></div>
          <div><Label>End</Label><Input type="time" value={end} onChange={(e)=>setEnd(e.target.value)} /></div>
          <div><Label>Slot (min)</Label><Input type="number" value={slot} onChange={(e)=>setSlot(e.target.value)} /></div>
          <div className="flex items-end"><Button onClick={add} className="w-full"><Plus className="mr-1 h-4 w-4" />Add</Button></div>
        </div>
      </Card>
      <div className="grid gap-3">
        {rows.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No schedule yet. Add one to start accepting bookings.</Card>}
        {rows.map((r) => (
          <Card key={r.id} className="flex items-center justify-between p-4">
            <div><div className="font-medium">{DAYS[r.day_of_week]}</div><div className="text-xs text-muted-foreground">{r.start_time?.slice(0,5)} – {r.end_time?.slice(0,5)} · {r.slot_minutes} min slots</div></div>
            <Button size="icon" variant="ghost" onClick={()=>remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
