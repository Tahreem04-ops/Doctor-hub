import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/dashboard/doctor/assistants")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [email, setEmail] = useState("");

  async function load() {
    if (!user) return;
    const { data: d } = await supabase.from("doctors").select("id").eq("user_id", user.id).maybeSingle();
    if (!d) return;
    setDoctorId(d.id);
    const { data } = await supabase.from("assistants").select("*").eq("doctor_id", d.id);
    const ids = (data ?? []).map((a: any) => a.user_id);
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
    const m = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setRows((data ?? []).map((a: any) => ({ ...a, profile: m.get(a.user_id) })));
  }
  useEffect(() => { load(); }, [user]);

  async function add() {
    if (!doctorId || !email) return;
    // Search profile by full_name fallback - we need email lookup which requires admin. Match by full_name in profiles is unreliable.
    // Workaround: assistant signs up first, then doctor enters their user_id (here we'll show instructions).
    toast.info("Ask the assistant to sign up first with this email, then share their account ID with you to add here. Or use the user ID below.");
    const { error } = await supabase.from("assistants").insert({ doctor_id: doctorId, user_id: email });
    if (error) toast.error(error.message); else { toast.success("Added"); setEmail(""); load(); }
  }
  async function remove(id: string) { await supabase.from("assistants").delete().eq("id", id); load(); }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Assistants</h1>
      <Card className="p-5">
        <Label>Add assistant (paste their user ID)</Label>
        <div className="mt-2 flex gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user-uuid" />
          <Button onClick={add}><UserPlus className="mr-1 h-4 w-4" />Add</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Ask your assistant to sign up at /auth. They can share their user ID from the profile page.</p>
      </Card>
      <div className="grid gap-3">
        {rows.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No assistants yet.</Card>}
        {rows.map((r) => (
          <Card key={r.id} className="flex items-center justify-between p-4">
            <div><div className="font-medium">{r.profile?.full_name ?? "Assistant"}</div><div className="text-xs text-muted-foreground">{r.user_id}</div></div>
            <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
