import { Link, useNavigate } from "@tanstack/react-router";
import { Stethoscope, LogOut, LayoutDashboard, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const dash =
    roles.includes("doctor") ? "/dashboard/doctor"
    : roles.includes("assistant") ? "/dashboard/assistant"
    : "/dashboard/patient";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold">Doctor Hub</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Care, simplified</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/doctors" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">Find Doctors</Link>
          <Link to="/about" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">About</Link>
          {user && <Link to={dash} className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">Dashboard</Link>}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/doctors" })} className="md:hidden">
            <Search className="h-4 w-4" />
          </Button>
          {user ? (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate({ to: dash })}>
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/auth" })}>Sign in</Button>
              <Button size="sm" onClick={() => navigate({ to: "/auth", search: { mode: "signup" } as any })}>Get started</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
