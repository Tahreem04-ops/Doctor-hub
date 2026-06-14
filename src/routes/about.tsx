import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Leaf, FlaskConical, Sparkles } from "lucide-react";

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({ meta: [{ title: "About — Doctor Hub" }, { name: "description", content: "Doctor Hub unifies allopathic, homeopathic, and herbal care in one private workspace for patients and clinicians." }] }),
});

function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-orb opacity-60" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs">About Doctor Hub</div>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-tight sm:text-6xl">Care without compromise — choose how you heal.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">Doctor Hub is a healthcare workspace that lets patients pick the philosophy they believe in — modern medicine, classical homeopathy, or herbal traditions — without losing the structure of a real clinic.</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6"><FlaskConical className="h-6 w-6 text-primary" /><div className="mt-3 font-display text-lg font-semibold">Allopathic</div><p className="mt-1 text-sm text-muted-foreground">Modern, evidence-based medical specialists across all common conditions.</p></Card>
          <Card className="p-6"><Sparkles className="h-6 w-6 text-primary" /><div className="mt-3 font-display text-lg font-semibold">Homeopathic</div><p className="mt-1 text-sm text-muted-foreground">Classical homeopaths trained in constitutional and acute prescribing.</p></Card>
          <Card className="p-6"><Leaf className="h-6 w-6 text-primary" /><div className="mt-3 font-display text-lg font-semibold">Herbal</div><p className="mt-1 text-sm text-muted-foreground">Ayurvedic and herbal practitioners focused on natural, plant-based care.</p></Card>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
