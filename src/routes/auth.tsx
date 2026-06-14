import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Stethoscope, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";

const search = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  role: z.enum(["patient", "doctor", "assistant"]).optional(),
});

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: search,
  head: () => ({ meta: [{ title: "Sign in — Doctor Hub" }] }),
});

function AuthPage() {
  const sp = Route.useSearch();
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(sp.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"patient" | "doctor">(sp.role === "doctor" ? "doctor" : "patient");

  useEffect(() => {
    if (!loading && user) {
      const dash = roles.includes("doctor") ? "/dashboard/doctor"
        : roles.includes("assistant") ? "/dashboard/assistant" : "/dashboard/patient";
      navigate({ to: dash });
    }
  }, [user, roles, loading, navigate]);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        
        // Add selected role to user
        if (data.user) {
          await supabase.from("user_roles").insert({ user_id: data.user.id, role: selectedRole }).then(() => {});
        }
        
        toast.success("Account created. Welcome!");
        
        // Store signup info for dashboard access
        if (data.user) {
          localStorage.setItem("signup_user_id", data.user.id);
          localStorage.setItem("signup_role", selectedRole);
        }
        
        // Navigate to dashboard after brief delay
        setTimeout(() => {
          const dash = selectedRole === "doctor" ? "/dashboard/doctor" : "/dashboard/patient";
          navigate({ to: dash });
        }, 500);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Fetch user roles to verify they have the selected role
        const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", (await supabase.auth.getUser()).data.user?.id);
        const userRoles = (roleData ?? []).map((r: any) => r.role);
        
        if (selectedRole === "doctor" && !userRoles.includes("doctor")) {
          toast.error("This account is not registered as a doctor");
          await supabase.auth.signOut();
          return;
        }
        
        toast.success("Welcome back");
        
        // Navigate to appropriate dashboard
        setTimeout(() => {
          const dash = selectedRole === "doctor" ? "/dashboard/doctor" : "/dashboard/patient";
          navigate({ to: dash });
        }, 500);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-hero-orb opacity-90" />
        <div className="absolute inset-0 bg-grain opacity-30" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Stethoscope className="h-5 w-5" /></div>
            <span className="font-display text-lg font-semibold">Doctor Hub</span>
          </Link>
          <div>
            <h2 className="font-display text-5xl font-semibold leading-[1.05]">Care that fits<br/>your worldview.</h2>
            <p className="mt-4 max-w-md text-muted-foreground">Sign in to book appointments, review prescriptions, or manage your clinic — all in one private workspace.</p>
          </div>
          <div className="text-xs text-muted-foreground">Allopathic · Homeopathic · Herbal</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
          <Card className="border-border p-7 shadow-sm">
            <div className="mb-4 flex rounded-xl bg-muted p-1 text-sm">
              <button onClick={() => setSelectedRole("patient")} className={`flex-1 rounded-lg py-2 font-medium transition-all ${selectedRole === "patient" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Patient</button>
              <button onClick={() => setSelectedRole("doctor")} className={`flex-1 rounded-lg py-2 font-medium transition-all ${selectedRole === "doctor" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Doctor</button>
            </div>
            <div className="mb-6 flex rounded-xl bg-muted p-1 text-sm">
              <button onClick={() => setMode("signin")} className={`flex-1 rounded-lg py-2 font-medium transition-all ${mode === "signin" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Sign in</button>
              <button onClick={() => setMode("signup")} className={`flex-1 rounded-lg py-2 font-medium transition-all ${mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Create account</button>
            </div>
            <h1 className="font-display text-3xl font-semibold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signup" ? `Signing up as ${selectedRole}.` : `Sign in as ${selectedRole}.`}
            </p>
            <form onSubmit={handle} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5"><Label>Full name</Label>
                  <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
              )}
              <div className="space-y-1.5"><Label>Email</Label>
                <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></div>
              <div className="space-y-1.5"><Label>Password</Label>
                <Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
              <Button type="submit" disabled={submitting} size="lg" className="w-full rounded-xl">
                {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              By continuing you agree to our terms & privacy policy.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
