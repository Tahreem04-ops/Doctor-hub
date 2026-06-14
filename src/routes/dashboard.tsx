import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { LayoutDashboard, Calendar, FileText, History, Users, Stethoscope, Clock, Wallet } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();
  const [signupChecked, setSignupChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Check localStorage only on client side
      const signupUserId = typeof window !== 'undefined' ? localStorage.getItem("signup_user_id") : null;
      setSignupChecked(true);
      
      // Allow access if user is authenticated OR if they just signed up
      if (!user && !signupUserId) {
        navigate({ to: "/auth" });
      }
    }
  }, [loading, user, navigate]);

  // Don't render until we've checked localStorage
  if (!signupChecked && typeof window !== 'undefined') return null;
  if (!user && !localStorage.getItem("signup_user_id")) return null;

  const isDoctor = roles.includes("doctor");
  const isAssistant = roles.includes("assistant");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-3">
          <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Patient</div>
          <NavItem to="/dashboard/patient" icon={LayoutDashboard}>Overview</NavItem>
          <NavItem to="/dashboard/patient/appointments" icon={Calendar}>Appointments</NavItem>
          <NavItem to="/dashboard/patient/prescriptions" icon={FileText}>Prescriptions</NavItem>
          <NavItem to="/dashboard/patient/history" icon={History}>Medical history</NavItem>

          {isDoctor && <>
            <div className="mt-4 px-2 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Doctor</div>
            <NavItem to="/dashboard/doctor" icon={Stethoscope}>Practice</NavItem>
            <NavItem to="/dashboard/doctor/schedule" icon={Clock}>Schedule</NavItem>
            <NavItem to="/dashboard/doctor/assistants" icon={Users}>Assistants</NavItem>
          </>}

          {isAssistant && <>
            <div className="mt-4 px-2 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Assistant</div>
            <NavItem to="/dashboard/assistant" icon={Wallet}>Payment verification</NavItem>
          </>}
        </aside>
        <main className="min-w-0"><Outlet /></main>
      </div>
    </div>
  );
}

function NavItem({ to, icon: Icon, children }: any) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-foreground"
      activeProps={{ className: "bg-primary/10 text-primary font-medium" }}>
      <Icon className="h-4 w-4" /> {children}
    </Link>
  );
}
