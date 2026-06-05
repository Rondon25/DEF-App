import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/StatusPill";
import {
  LayoutDashboard, Users, ClipboardList, CreditCard, Boxes,
  BarChart3, Package, Search, Bell, Settings, Droplet, TrendingUp, Truck,
} from "lucide-react";

const NAV_MAIN = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: ClipboardList, label: "Orders" },
  { icon: Users, label: "Customers" },
  { icon: CreditCard, label: "Payments" },
];
const NAV_OTHER = [
  { icon: Boxes, label: "Catalogue" },
  { icon: Package, label: "Stock" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Settings, label: "Settings" },
];

const ORDERS = [
  { no: "DEF-555752", cust: "PS Transport", status: "proforma_sent", amt: "$340.00", date: "23/04/2026" },
  { no: "DEF-418730", cust: "King Bob Logistics", status: "confirmed", amt: "$1,140.00", date: "22/04/2026" },
  { no: "DEF-902244", cust: "Ron Don Fleet", status: "shipped", amt: "$760.00", date: "21/04/2026" },
  { no: "DEF-771203", cust: "Acme Mining", status: "delivered", amt: "$4,200.00", date: "20/04/2026" },
  { no: "DEF-660198", cust: "Sharma Haulage", status: "closed", amt: "$190.00", date: "19/04/2026" },
];

export default function DesignPreview() {
  const [period, setPeriod] = useState("Last 30 days");

  return (
    <div className="grid grid-cols-[260px_minmax(0,1fr)] min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      {/* ─── Sidebar ─── */}
      <aside className="bg-sidebar text-sidebar-foreground p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-sidebar">
            <Droplet className="size-5" />
          </div>
          <span className="text-lg font-bold text-accent">Rohan Energy</span>
        </div>

        <NavGroup label="Overview" items={NAV_MAIN} />
        <NavGroup label="Other" items={NAV_OTHER} />

        <div className="mt-auto flex items-center justify-between rounded-2xl bg-accent p-3 text-sidebar">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-full bg-white text-xs font-bold">RE</div>
            <div>
              <p className="text-sm font-semibold leading-tight">Central Team</p>
              <p className="text-xs opacity-70">5 staff</p>
            </div>
          </div>
          <span className="text-xs">⌄</span>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <main className="min-w-0 p-6 md:px-10 overflow-y-auto">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-8">
          <div className="text-sm font-semibold text-ink-3">Dashboard</div>
          <div className="relative w-[380px] max-w-[40vw]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-4" />
            <Input className="pl-10 rounded-full bg-surface" placeholder="Search orders, customers..." />
          </div>
          <div className="flex items-center gap-3">
            <button className="text-ink-3 hover:text-ink"><Bell className="size-5" /></button>
            <button className="text-ink-3 hover:text-ink"><Settings className="size-5" /></button>
            <div className="flex items-center gap-2 bg-sidebar text-white pl-1.5 pr-4 py-1.5 rounded-full text-[13px]">
              <div className="size-7 rounded-full bg-accent flex items-center justify-center text-sidebar text-xs font-bold">CT</div>
              Central Team
            </div>
          </div>
        </header>

        {/* Welcome + filters */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Welcome back!</h1>
            <p className="text-sm text-ink-3">Today, 23 April 2026</p>
          </div>
          <div className="flex gap-2.5">
            <button className="px-4 py-2.5 rounded-full border border-border bg-surface text-sm font-medium">
              🕒 {period} ⌄
            </button>
            <Button variant="dark" size="md">Export ⌄</Button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-5 mb-6">
          <DashKpi featured label="Total Orders" value="1,248" unit="" trend="↑ 12% from last month" icon={<Package className="size-4" />} />
          <DashKpi label="Revenue" value="$84.2" unit="k" trend="↑ 8% MoM" icon={<TrendingUp className="size-4" />} />
          <DashKpi label="In Transit" value="36" unit="" trend="6 delivering today" icon={<Truck className="size-4" />} />
          <DashKpi label="Pending Payment" value="14" unit="" trend="3 overdue" warn icon={<CreditCard className="size-4" />} />
        </div>

        {/* Middle grid: chart + side panel */}
        <div className="grid grid-cols-[2fr_minmax(0,1fr)] gap-5 mb-6">
          <div className="bg-surface rounded-2xl p-6 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold">Order Status Breakdown</h3>
              <span className="px-3 py-1 rounded-full bg-secondary text-xs font-medium">This month ⌄</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-3">Total Orders</p>
                <h2 className="text-3xl font-bold mt-1">1,248</h2>
                <p className="text-xs text-success font-medium mt-1">↑ 12% from last month</p>
                <ul className="mt-5 space-y-2 text-sm text-ink-2">
                  <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-teal-600" /> Active <span className="ml-auto font-semibold text-ink">982</span></li>
                  <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-lime-400" /> Awaiting payment <span className="ml-auto font-semibold text-ink">184</span></li>
                  <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-slate-300" /> Closed <span className="ml-auto font-semibold text-ink">82</span></li>
                </ul>
              </div>
              <div
                className="size-44 rounded-full relative"
                style={{ background: "conic-gradient(#0d9488 0% 72%, #bef264 72% 90%, #cbd5e1 90% 100%)" }}
              >
                <div className="absolute inset-9 bg-surface rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold">79%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 bg-surface rounded-2xl p-6 shadow-[var(--shadow)]">
            <h3 className="font-bold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {[
                ["active", "Order DEF-902244 shipped", "2h ago"],
                ["active", "Payment verified — King Bob", "4h ago"],
                ["off", "Order DEF-771203 delivered", "Yesterday"],
                ["active", "New customer approved", "Yesterday"],
              ].map(([s, txt, time], i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${s === "active" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                    {s === "active" ? "New" : "Done"}
                  </span>
                  <span className="flex-1 text-sm font-medium leading-tight">{txt}</span>
                  <span className="text-xs text-ink-4">{time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Orders table */}
        <div className="bg-surface rounded-2xl p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">Recent Orders</h3>
            <button className="px-3 py-1.5 rounded-lg border border-border text-[13px]">⚙️ Filter</button>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="text-left text-[13px] text-ink-3 border-b border-border">
                <th className="py-3 font-medium">Order #</th>
                <th className="py-3 font-medium">Customer</th>
                <th className="py-3 font-medium">Date</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {ORDERS.map((o) => (
                <tr key={o.no} className="border-b border-border last:border-0 hover:bg-canvas">
                  <td className="py-3.5 text-sm font-mono font-semibold">{o.no}</td>
                  <td className="py-3.5 text-sm">{o.cust}</td>
                  <td className="py-3.5 text-sm text-ink-3">{o.date}</td>
                  <td className="py-3.5"><StatusPill status={o.status} /></td>
                  <td className="py-3.5 text-sm font-semibold text-right">{o.amt}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <p className="text-center text-xs text-ink-4 mt-8 mb-4">
          Design preview · teal + lime · Prodexa-inspired · /design-preview
        </p>
      </main>
    </div>
  );
}

function NavGroup({ label, items }: { label: string; items: { icon: any; label: string; active?: boolean }[] }) {
  return (
    <nav className="mb-8">
      <p className="text-xs font-semibold uppercase text-white/40 mb-4 tracking-wide">{label}</p>
      {items.map((it) => (
        <a
          key={it.label}
          href="#"
          className={`flex items-center gap-3 px-4 py-3 rounded-full mb-1 transition-colors ${
            it.active
              ? "bg-accent text-sidebar font-semibold"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
          }`}
        >
          <it.icon className="size-[18px]" />
          <span className="text-sm">{it.label}</span>
        </a>
      ))}
    </nav>
  );
}

function DashKpi({ featured, warn, label, value, unit, trend, icon }: {
  featured?: boolean; warn?: boolean; label: string; value: string; unit: string; trend: string; icon: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl p-6 ${featured ? "bg-sidebar text-white" : "bg-surface shadow-[var(--shadow-sm)]"}`}>
      <div className="flex items-center justify-between text-sm mb-5">
        <span className={featured ? "text-white/70" : "text-ink-3"}>{label}</span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${featured ? "bg-accent text-sidebar" : "bg-secondary text-ink-3"}`}>Today ⌄</span>
      </div>
      <div className="text-3xl font-bold">
        {value}<span className={`text-base font-normal ${featured ? "text-white/50" : "text-ink-4"}`}>{unit}</span>
      </div>
      <div className={`text-xs font-medium mt-2 ${warn ? "text-amber-600" : featured ? "text-lime-300" : "text-success"}`}>{trend}</div>
    </div>
  );
}
