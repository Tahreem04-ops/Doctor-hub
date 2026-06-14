import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const Route = createFileRoute("/dashboard/patient/prescriptions")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("prescriptions").select("*").eq("patient_id", user.id).order("created_at", { ascending: false });
      const docIds = Array.from(new Set((data ?? []).map((x: any) => x.doctor_id)));
      const { data: docs } = docIds.length ? await supabase.from("doctors").select("id, user_id, specialization").in("id", docIds) : { data: [] };
      const userIds = (docs ?? []).map((d: any) => d.user_id);
      const { data: profs } = userIds.length ? await supabase.from("profiles").select("id, full_name").in("id", userIds) : { data: [] };
      const docMap = new Map((docs ?? []).map((d: any) => [d.id, { ...d, name: (profs ?? []).find((p: any) => p.id === d.user_id)?.full_name }]));
      setRows((data ?? []).map((r: any) => ({ ...r, doctor: docMap.get(r.doctor_id) })));
    })();
  }, [user]);

  function download(rx: any) {
    const w = window.open("", "_blank"); if (!w) return;
    const meds = (rx.medicines ?? []).map((m: any) => `<li><strong>${m.name}</strong> — ${m.dosage ?? ""} ${m.duration ?? ""} <em>${m.notes ?? ""}</em></li>`).join("");
    w.document.write(`<html><head><title>Rx ${rx.id.slice(0,6)}</title><style>
      body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:30px;color:#1f2a2a;border:1px solid #ddd}
      h1{color:#0f5050;margin:0} .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0;font-size:14px}
      ul{padding-left:18px} li{margin:6px 0} hr{border:none;border-top:1px dashed #ccc;margin:24px 0}
      .badge{display:inline-block;padding:3px 8px;background:#e8f4f4;border-radius:6px;font-size:12px}
    </style></head><body>
      <div style="display:flex;justify-content:space-between"><h1>Doctor Hub</h1><span class="badge">e-Prescription</span></div>
      <div class="grid">
        <div><strong>Doctor:</strong> ${rx.doctor?.name ?? ""}<br/><small>${rx.doctor?.specialization ?? ""}</small></div>
        <div><strong>Date:</strong> ${new Date(rx.created_at).toLocaleDateString()}</div>
      </div>
      <hr/>
      <p><strong>Diagnosis</strong><br/>${rx.diagnosis}</p>
      <p><strong>Medicines</strong></p><ul>${meds}</ul>
      ${rx.advice ? `<p><strong>Advice</strong><br/>${rx.advice}</p>` : ""}
      ${rx.follow_up_date ? `<p><strong>Follow-up:</strong> ${rx.follow_up_date}</p>` : ""}
      <hr/><p style="font-size:11px;color:#666">Generated via Doctor Hub. Not a substitute for in-person consultation.</p>
      <script>setTimeout(()=>window.print(),300)</script>
    </body></html>`); w.document.close();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Prescriptions</h1>
      {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No prescriptions yet.</Card>}
      {rows.map((rx) => (
        <Card key={rx.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-display text-lg font-semibold">{rx.diagnosis}</div>
              <div className="text-xs text-muted-foreground">By {rx.doctor?.name} · {new Date(rx.created_at).toLocaleDateString()}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => download(rx)}><Download className="mr-1.5 h-3.5 w-3.5" />PDF</Button>
          </div>
          <div className="mt-3 grid gap-1 text-sm">
            {(rx.medicines ?? []).map((m: any, i: number) => (
              <div key={i} className="flex justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-xs">
                <span><strong>{m.name}</strong> {m.dosage}</span>
                <span className="text-muted-foreground">{m.duration}</span>
              </div>
            ))}
          </div>
          {rx.advice && <div className="mt-3 rounded-lg bg-cream p-3 text-xs">{rx.advice}</div>}
        </Card>
      ))}
    </div>
  );
}
