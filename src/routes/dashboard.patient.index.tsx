import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, History, Search } from "lucide-react";

export const Route = createFileRoute("/dashboard/patient/")({ component: Overview });

function Overview() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<any[]>([]);
  const [counts, setCounts] = useState({ upcoming: 0, prescriptions: 0, history: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().slice(0,10);
      const [{ data: a }, { count: pc }, { count: hc }] = await Promise.all([
        supabase.from("appointments").select("id, appointment_date, start_time, status, doctor_id, fee")
          .eq("patient_id", user.id).gte("appointment_date", today).order("appointment_date").limit(5),
        supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("patient_id", user.id),
        supabase.from("medical_history").select("id", { count: "exact", head: true }).eq("patient_id", user.id),
      ]);
      // doctor names
      const docIds = Array.from(new Set((a ?? []).map((x: any) => x.doctor_id)));
      const { data: docs } = docIds.length ? await supabase.from("doctors").select("id, user_id, specialization").in("id", docIds) : { data: [] as any[] };
      const userIds = (docs ?? []).map((d: any) => d.user_id);
      const { data: profs } = userIds.length ? await supabase.from("profiles").select("id, full_name").in("id", userIds) : { data: [] as any[] };
      const docMap = new Map((docs ?? []).map((d: any) => [d.id, { ...d, name: (profs ?? []).find((p: any) => p.id === d.user_id)?.full_name }]));
      setAppts((a ?? []).map((x: any) => ({ ...x, doctor: docMap.get(x.doctor_id) })));
      setCounts({ upcoming: (a ?? []).length, prescriptions: pc ?? 0, history: hc ?? 0 });
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Hello{user?.email ? `, ${user.email.split("@")[0]}` : ""} 👋</h1>
          <p className="text-sm text-muted-foreground">Here's a snapshot of your care.</p>
        </div>
        <Link to="/doctors"><Button className="rounded-xl"><Search className="mr-2 h-4 w-4" />Find a doctor</Button></Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Calendar} label="Upcoming appointments" value={counts.upcoming} />
        <StatCard icon={FileText} label="Prescriptions" value={counts.prescriptions} />
        <StatCard icon={History} label="History records" value={counts.history} />
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-display text-xl font-semibold">Upcoming appointments</div>
          <Link to="/dashboard/patient/appointments" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {appts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No upcoming appointments. <Link to="/doctors" className="text-primary">Book one →</Link></div>
        ) : (
          <div className="divide-y divide-border">
            {appts.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{a.doctor?.name ?? "Doctor"}</div>
                  <div className="text-xs text-muted-foreground">{a.doctor?.specialization}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{a.appointment_date} · {a.start_time?.slice(0,5)}</div>
                  <Badge variant="outline" className="mt-1 capitalize">{a.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
    </Card>
  );
}
