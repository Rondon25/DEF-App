import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusPill } from "@/components/StatusPill";
import { Package, TrendingUp, Droplet, Truck } from "lucide-react";

const ALL_STATUSES = [
  "submitted","verified","proforma_sent","payment_uploaded","payment_verified",
  "confirmed","in_production","ready_for_dispatch","shipped","delivered",
  "grn_pending","grn_submitted","closed","cancelled",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignPreview() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-white text-xl">
            <Droplet className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Rohan Energy Solutions</h1>
            <p className="text-sm text-muted-foreground">Design System Preview — Phase 4</p>
          </div>
        </div>
      </div>

      {/* Color swatches */}
      <Section title="Brand Palette — Teal middle-ground">
        <div className="flex flex-wrap gap-3">
          {[
            ["Primary", "bg-teal-600", "#0D9488"],
            ["Teal 700", "bg-teal-700", "#0F766E"],
            ["Teal 400", "bg-teal-400", "#2DD4BF"],
            ["Accent Amber", "bg-amber-500", "#F59E0B"],
            ["Sidebar", "bg-sidebar", "#0B1120"],
            ["Ink", "bg-slate-900", "#0F172A"],
          ].map(([name, bg, hex]) => (
            <div key={name} className="text-center">
              <div className={`size-16 rounded-xl ${bg} shadow-[var(--shadow-sm)]`} />
              <div className="mt-1.5 text-[11px] font-semibold">{name}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{hex}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* KPI cards */}
      <Section title="KPI Cards — dashboard stat row">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard featured label="Total Orders" value="1,248" delta={{ value: "12% vs last month", positive: true }} icon={<Package className="size-4" />} />
          <KpiCard label="Revenue" value="$84.2k" delta={{ value: "8% MoM", positive: true }} icon={<TrendingUp className="size-4" />} />
          <KpiCard label="In Transit" value="36" icon={<Truck className="size-4" />} />
          <KpiCard label="Pending" value="14" delta={{ value: "3 overdue", positive: false }} />
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Buttons">
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
        <div className="flex flex-wrap gap-3 items-center mt-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      {/* Status pills */}
      <Section title="Order Status Pills — one source of truth">
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((s) => <StatusPill key={s} status={s} />)}
        </div>
      </Section>

      {/* Badges */}
      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge tone="teal">Teal</Badge>
          <Badge tone="green">Active</Badge>
          <Badge tone="amber">Pending</Badge>
          <Badge tone="red">Cancelled</Badge>
          <Badge tone="blue">New</Badge>
          <Badge tone="purple">Production</Badge>
          <Badge tone="neutral">Closed</Badge>
        </div>
      </Section>

      {/* Form */}
      <Section title="Form Inputs">
        <div className="max-w-md space-y-4">
          <div>
            <Label>Phone number</Label>
            <Input placeholder="91XXXXXXXXXX" />
          </div>
          <div>
            <Label>Delivery notes</Label>
            <Textarea placeholder="Any special instructions..." rows={3} />
          </div>
          <Button size="full">Submit</Button>
        </div>
      </Section>

      {/* Cards */}
      <Section title="Cards">
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>DEF 20L Drum</CardTitle>
              <CardDescription>Diesel Exhaust Fluid — 20 litre</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-primary">$19.00</span>
                <Badge tone="green">In stock</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Order DEF-555752</CardTitle>
              <CardDescription>King Bob · PS Transport</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <StatusPill status="proforma_sent" />
                <span className="font-bold">$340.00</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <p className="text-center text-xs text-muted-foreground mt-12">
        End of preview · /design-preview
      </p>
    </div>
  );
}
