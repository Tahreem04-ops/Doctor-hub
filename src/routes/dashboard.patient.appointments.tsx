import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/dashboard/patient/appointments")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<any[]>([]);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("appointments").select("*").eq("patient_id", user.id).order("appointment_date", { ascending: false });
    const docIds = Array.from(new Set((data ?? []).map((x: any) => x.doctor_id)));
    const { data: docs } = docIds.length ? await supabase.from("doctors").select("id, user_id, specialization").in("id", docIds) : { data: [] };
    const userIds = (docs ?? []).map((d: any) => d.user_id);
    const { data: profs } = userIds.length ? await supabase.from("profiles").select("id, full_name").in("id", userIds) : { data: [] };
    const docMap = new Map((docs ?? []).map((d: any) => [d.id, { ...d, name: (profs ?? []).find((p: any) => p.id === d.user_id)?.full_name }]));
    const ids = (data ?? []).map((x: any) => x.id);
    const { data: pays } = ids.length ? await supabase.from("payments").select("*").in("appointment_id", ids) : { data: [] };
    const payMap = new Map((pays ?? []).map((p: any) => [p.appointment_id, p]));
    setAppts((data ?? []).map((a: any) => ({ ...a, doctor: docMap.get(a.doctor_id), payment: payMap.get(a.id) })));
  }
  useEffect(() => { load(); }, [user]);

  async function submitPayment(appt: any, ref: string, notes: string) {
    const update: any = { transaction_reference: ref, notes, status: "pending" };
    if (appt.payment) await supabase.from("payments").update(update).eq("id", appt.payment.id);
    toast.success("Payment submitted. Awaiting verification.");
    load();
  }

  async function cancel(id: string) {
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">My Appointments</h1>
      {appts.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No appointments yet.</Card>}
      {appts.map((a) => (
        <Card key={a.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-display text-lg font-semibold">{a.doctor?.name}</div>
              <div className="text-xs text-muted-foreground">{a.doctor?.specialization}</div>
              <div className="mt-2 text-sm">{a.appointment_date} · {a.start_time?.slice(0,5)} – {a.end_time?.slice(0,5)}</div>
              {a.reason && <div className="mt-1 text-xs text-muted-foreground">Reason: {a.reason}</div>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="capitalize">{a.status}</Badge>
              <Badge variant={a.payment?.status === "verified" ? "default" : "outline"} className="capitalize">
                Payment: {a.payment?.status ?? "pending"}
              </Badge>
              <div className="text-sm font-medium">PKR {Number(a.fee).toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {a.payment && a.payment.status !== "verified" && (
              <Dialog>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Upload className="mr-1.5 h-3.5 w-3.5" />Submit payment proof</Button></DialogTrigger>
                <PayDialog appt={a} onSave={submitPayment} />
              </Dialog>
            )}
            {a.status !== "cancelled" && a.status !== "completed" && (
              <Button size="sm" variant="ghost" onClick={() => cancel(a.id)}>Cancel</Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function PayDialog({ appt, onSave }: any) {
  const [ref, setRef] = useState(appt.payment?.transaction_reference ?? "");
  const [notes, setNotes] = useState(appt.payment?.notes ?? "");
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Submit payment</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="rounded-lg bg-cream p-3 text-xs">
          <div>Transfer <strong>PKR {appt.fee}</strong> to the clinic's account, then submit the transaction reference below for the assistant to verify.</div>
        </div>
        <div className="space-y-1.5"><Label>Transaction reference</Label><Input value={ref} onChange={(e)=>setRef(e.target.value)} placeholder="e.g. TX12345" /></div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Optional message"/></div>
        <Button onClick={() => onSave(appt, ref, notes)} className="w-full">Submit</Button>
      </div>
    </DialogContent>
  );
}
