import { Link } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-cream/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Stethoscope className="h-4 w-4" /></div>
            <span className="font-display text-lg font-semibold">Doctor Hub</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            A unified clinic for allopathic, homeopathic, and herbal care — find the right doctor, book a slot, and keep your history in one secure place.
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold">Explore</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/doctors">Find doctors</Link></li>
            <li><Link to="/about">About us</Link></li>
            <li><Link to="/auth">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold">Care types</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Allopathic</li><li>Homeopathic</li><li>Herbal &amp; Ayurveda</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Doctor Hub. All rights reserved.
      </div>
    </footer>
  );
}
