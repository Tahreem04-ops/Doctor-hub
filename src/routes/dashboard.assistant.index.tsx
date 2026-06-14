import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/assistant/")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    if (!user) return;
    const { data: links } = await supabase.from("assistants").select("doctor_id").eq("user_id", user.id);
    const docIds = (links ?? []).map((l: any) => l.doctor_id);
    if (docIds.length === 0) { setRows([]); return; }
    const { data: appts } = await supabase.from("appointments").select("*").in("doctor_id", docIds).order("appointment_date", { ascending: false });
    const ids = (appts ?? []).map((a: any) => a.id);
    const { data: pays } = ids.length ? await supabase.from("payments").select("*").in("appointment_id", ids) : { data: [] };
    const patientIds = Array.from(new Set((appts ?? []).map((a: any) => a.patient_id)));
    const { data: profs } = patientIds.length ? await supabase.from("profiles").select("id, full_name").in("id", patientIds) : { data: [] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const paymap = new Map((pays ?? []).map((p: any) => [p.appointment_id, p]));
    setRows((appts ?? []).map((a: any) => ({ ...a, patient: pmap.get(a.patient_id), payment: paymap.get(a.id) })).filter((r:any)=>r.payment));
  }
  useEffect(() => { load(); }, [user]);

  async function verify(id: string, status: "verified" | "rejected") {
    await supabase.from("payments").update({ status, verified_by: user?.id, verified_at: new Date().toISOString() }).eq("id", id);
    if (status === "verified") {
      const row = rows.find((r) => r.payment.id === id);
      if (row) await supabase.from("appointments").update({ status: "confirmed" }).eq("id", row.id);
    }
    toast.success(`Payment ${status}`); load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Payment verification</h1>
      <p className="text-sm text-muted-foreground">Review pending transfers from patients and confirm their appointments.</p>
      {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No payments to review.</Card>}
      {rows.map((r) => (
        <Card key={r.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-display text-lg font-semibold">{r.patient?.full_name}</div>
              <div className="text-xs text-muted-foreground">{r.appointment_date} · {r.start_time?.slice(0,5)}</div>
              <div className="mt-2 text-sm">Amount: <strong>PKR {Number(r.payment.amount).toLocaleString()}</strong></div>
              {r.payment.transaction_reference && <div className="text-xs">Ref: <code className="rounded bg-muted px-1.5 py-0.5">{r.payment.transaction_reference}</code></div>}
              {r.payment.notes && <div className="mt-1 text-xs text-muted-foreground">Notes: {r.payment.notes}</div>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{r.payment.status}</Badge>
              {r.payment.status === "pending" && <>
                <Button size="sm" variant="outline" onClick={() => verify(r.payment.id, "rejected")}>Reject</Button>
                <Button size="sm" onClick={() => verify(r.payment.id, "verified")}>Verify & confirm</Button>
              </>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
