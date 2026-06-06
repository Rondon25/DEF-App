import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { staffApi } from "../../api";
import { getStaffUser } from "../../hooks/useAuth";
import { StatusPill } from "@/components/StatusPill";
import { SkeletonList } from "@/components/Skeleton";
import {
  Activity, UserPlus, CreditCard, Truck, ClipboardList, ChevronRight,
  DollarSign, TrendingUp, Users, Boxes, ShoppingCart, AlertTriangle, Gauge, Factory, Download,
} from "lucide-react";

type Tab = "operations" | "performance" | "manufacturing";

export default function StaffDashboard() {
  const user = getStaffUser();
  const role = user?.role || "sales";
  const canPerf = ["admin", "central_team", "sales"].includes(role);
  const canMfg  = ["admin", "central_team", "operations"].includes(role);

  const tabs: { id: Tab; label: string }[] = [
    { id: "operations", label: "Operations" },
    ...(canPerf ? [{ id: "performance" as Tab, label: "Performance" }] : []),
    ...(canMfg ? [{ id: "manufacturing" as Tab, label: "Manufacturing" }] : []),
  ];
  const [tab, setTab] = useState<Tab>("operations");

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-3">Welcome back, {user?.name} · <span className="capitalize">{role.replace("_", " ")}</span></p>
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-2 mb-5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`h-10 px-5 rounded-full text-sm font-medium transition-colors ${tab === t.id ? "bg-primary text-white" : "bg-surface border border-border text-ink-2 hover:border-primary hover:text-primary"}`}>{t.label}</button>
          ))}
        </div>
      )}

      {tab === "operations" && <OperationsTab role={role} />}
      {tab === "performance" && canPerf && <PerformanceTab />}
      {tab === "manufacturing" && canMfg && <ManufacturingTab />}
    </>
  );
}

// ── Operations tab (original dashboard) ───────────────────────────────────────
function OperationsTab({ role }: { role: string }) {
  const isCentral = ["admin", "central_team"].includes(role);
  const isFinance = ["admin", "finance", "central_team"].includes(role);

  const { data: orders = [], isLoading } = useQuery({ queryKey: ["staff-orders"], queryFn: () => staffApi.get("/staff/orders").then((r) => r.data), refetchInterval: 20_000 });
  const { data: pending = [] } = useQuery({ queryKey: ["pending-customers"], queryFn: () => staffApi.get("/customers/pending").then((r) => r.data), refetchInterval: 30_000, enabled: isCentral });
  const { data: payments = [] } = useQuery({ queryKey: ["pending-payments"], queryFn: () => staffApi.get("/finance/payments").then((r) => r.data), refetchInterval: 20_000, enabled: isFinance });

  const active   = orders.filter((o: any) => !["closed", "cancelled"].includes(o.status));
  const awaiting = orders.filter((o: any) => ["proforma_sent", "payment_uploaded"].includes(o.status));
  const closed   = orders.filter((o: any) => o.status === "closed");
  const shipped  = orders.filter((o: any) => o.status === "shipped");
  const total    = orders.length || 1;
  const activePct = Math.round((active.length / total) * 100);
  const a = (active.length / total) * 100;
  const b = a + (awaiting.length / total) * 100;
  const donut = `conic-gradient(#0d9488 0% ${a}%, #bef264 ${a}% ${b}%, #cbd5e1 ${b}% 100%)`;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Kpi featured label="Active Orders" value={active.length} icon={<Activity className="size-4" />} />
        {isCentral && <Kpi label="Pending Approval" value={pending.length} warn={pending.length > 0} icon={<UserPlus className="size-4" />} />}
        {isFinance && <Kpi label="Payments to Verify" value={payments.length} warn={payments.length > 0} icon={<CreditCard className="size-4" />} />}
        <Kpi label="In Transit" value={shipped.length} icon={<Truck className="size-4" />} />
      </div>

      <div className="grid lg:grid-cols-[2fr_minmax(0,1fr)] gap-5 mb-5">
        <div className="bg-surface rounded-2xl p-6 shadow-[var(--shadow-sm)]">
          <h3 className="font-bold mb-5">Order Status Breakdown</h3>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-ink-3">Total Orders</p>
              <h2 className="text-3xl font-bold mt-1">{orders.length}</h2>
              <ul className="mt-5 space-y-2.5 text-sm text-ink-2">
                <li className="flex items-center gap-2.5"><span className="size-2.5 rounded-full bg-teal-600" /> Active <span className="ml-auto font-bold text-ink">{active.length}</span></li>
                <li className="flex items-center gap-2.5"><span className="size-2.5 rounded-full bg-lime-400" /> Awaiting payment <span className="ml-auto font-bold text-ink">{awaiting.length}</span></li>
                <li className="flex items-center gap-2.5"><span className="size-2.5 rounded-full bg-slate-300" /> Closed <span className="ml-auto font-bold text-ink">{closed.length}</span></li>
              </ul>
            </div>
            <div className="size-44 rounded-full relative shrink-0" style={{ background: donut }}>
              <div className="absolute inset-9 bg-surface rounded-full flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{activePct}%</span><span className="text-[11px] text-ink-3">active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 shadow-[var(--shadow-sm)]">
          <h3 className="font-bold mb-4">Needs Attention</h3>
          <div className="space-y-2.5">
            {isCentral && pending.length > 0 && <AlertRow to="/staff/customers" tone="amber" icon={<UserPlus className="size-4" />} text={`${pending.length} customer${pending.length > 1 ? "s" : ""} awaiting approval`} />}
            {isFinance && payments.length > 0 && <AlertRow to="/staff/orders?filter=payment_uploaded" tone="amber" icon={<CreditCard className="size-4" />} text={`${payments.length} payment${payments.length > 1 ? "s" : ""} to verify`} />}
            {awaiting.length > 0 && <AlertRow to="/staff/orders" tone="teal" icon={<ClipboardList className="size-4" />} text={`${awaiting.length} order${awaiting.length > 1 ? "s" : ""} awaiting payment`} />}
            {(!pending.length && !payments.length && !awaiting.length) && <div className="text-sm text-ink-4 py-6 text-center">All caught up — nothing needs attention.</div>}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h3 className="font-bold">Recent Orders</h3>
          <Link to="/staff/orders" className="text-xs text-primary font-semibold flex items-center gap-0.5">View all <ChevronRight className="size-3.5" /></Link>
        </div>
        {isLoading ? <div className="p-5 pt-0"><SkeletonList rows={5} /></div> : orders.length === 0 ? <div className="px-5 py-10 text-center text-ink-4">No orders yet</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead><tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border"><th className="px-5 py-3">Order #</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Amount</th></tr></thead>
              <tbody>
                {orders.slice(0, 8).map((o: any) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3.5"><Link to={`/staff/orders/${o.id}`} className="font-mono font-semibold text-sm hover:text-primary">{o.order_number}</Link></td>
                    <td className="px-5 py-3.5 text-sm">{o.customer_name}</td>
                    <td className="px-5 py-3.5"><StatusPill status={o.status} /></td>
                    <td className="px-5 py-3.5 text-right font-semibold text-sm">${o.total_amount?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Performance tab (former Analytics, restyled) ──────────────────────────────
function PerformanceTab() {
  const [days, setDays] = useState(30);
  const { data: summary } = useQuery({ queryKey: ["analytics-summary", days], queryFn: () => staffApi.get(`/admin/analytics/summary?days=${days}`).then((r) => r.data) });
  const { data: topCustomers = [] } = useQuery({ queryKey: ["analytics-customers", days], queryFn: () => staffApi.get(`/admin/analytics/top-customers?days=${days}&limit=8`).then((r) => r.data) });
  const { data: topSkus = [] } = useQuery({ queryKey: ["analytics-skus", days], queryFn: () => staffApi.get(`/admin/analytics/top-skus?days=${days}&limit=6`).then((r) => r.data) });
  const { data: revenueData = [] } = useQuery({ queryKey: ["analytics-revenue", days], queryFn: () => staffApi.get(`/admin/analytics/revenue-over-time?days=${days}`).then((r) => r.data) });
  const maxRevenue = Math.max(...revenueData.map((d: any) => d.revenue), 1);

  const handleExport = (type: string) => {
    staffApi.get(`/admin/export/${type}?days=${days}`, { responseType: "blob" }).then((r) => {
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a"); a.href = url; a.download = `${type}_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    });
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={`h-9 px-4 rounded-full text-[13px] font-medium transition-colors ${days === d ? "bg-primary text-white" : "bg-surface border border-border text-ink-2 hover:border-primary"}`}>{d}d</button>)}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Kpi featured label="Total Orders" value={summary.total_orders} icon={<ClipboardList className="size-4" />} />
          <Kpi label="Revenue (Closed)" value={`$${summary.total_revenue.toLocaleString()}`} icon={<DollarSign className="size-4" />} />
          <Kpi label="Pipeline" value={`$${summary.pending_revenue.toLocaleString()}`} icon={<TrendingUp className="size-4" />} />
          <Kpi label="Active Orders" value={summary.active_orders} icon={<Activity className="size-4" />} />
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-5 mb-5">
        <h3 className="font-bold mb-4">Revenue over time</h3>
        <div className="flex items-end gap-0.5 h-24 overflow-x-auto">
          {revenueData.slice(-30).map((d: any, i: number) => (
            <div key={i} className="flex-1 min-w-[8px] flex flex-col items-center justify-end">
              <div title={`${d.date}: $${d.revenue}`} className="w-full rounded-t" style={{ background: d.revenue > 0 ? "var(--color-teal-600)" : "var(--color-border)", height: `${Math.max(2, (d.revenue / maxRevenue) * 90)}px`, transition: "height .2s" }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-ink-4 mt-2"><span>{revenueData[0]?.date}</span><span>{revenueData[revenueData.length - 1]?.date}</span></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <RankPanel title={`Top Customers (${days}d)`} rows={topCustomers.map((c: any) => ({ key: c.customer_id, title: c.name, sub: `${c.company_name || "—"} · ${c.order_count} orders`, amount: c.total_spent }))} />
        <RankPanel title={`Top Products (${days}d)`} rows={topSkus.map((s: any) => ({ key: s.sku_id, title: s.name, sub: `${s.total_qty} ${s.unit} sold`, amount: s.total_revenue }))} />
      </div>

      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-5">
        <h3 className="font-bold mb-3">Export Data</h3>
        <div className="flex flex-wrap gap-2">
          <ExportBtn icon={<ClipboardList size={15} />} label={`Orders (${days}d)`} onClick={() => handleExport("orders")} />
          <ExportBtn icon={<CreditCard size={15} />} label={`Payments (${days}d)`} onClick={() => handleExport("payments")} />
          <ExportBtn icon={<Users size={15} />} label="All Customers" onClick={() => handleExport("customers")} />
        </div>
      </div>
    </>
  );
}

// ── Manufacturing tab (Phase 5) ───────────────────────────────────────────────
function ManufacturingTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["mfg-dashboard"], queryFn: () => staffApi.get("/admin/dashboard/manufacturing").then((r) => r.data), refetchInterval: 30_000 });
  if (isLoading || !data) return <SkeletonList rows={6} />;
  const k = data.kpis;
  const maxFc = Math.max(...data.forecast_by_sku.map((s: any) => s.units), 1);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Kpi featured label={`Forecast (${data.month})`} value={Number(k.monthly_forecast_units).toLocaleString()} icon={<TrendingUp className="size-4" />} />
        <Kpi label="Reorder Signals" value={k.active_reorder_signals} warn={k.active_reorder_signals > 0} icon={<ShoppingCart className="size-4" />} />
        <Kpi label="Plants Over Capacity" value={k.plants_over_capacity} warn={k.plants_over_capacity > 0} icon={<Gauge className="size-4" />} />
        <Kpi label="RM Critical Alerts" value={k.rm_critical_alerts} warn={k.rm_critical_alerts > 0} icon={<AlertTriangle className="size-4" />} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <MiniStat label="Produced (30d)" value={Number(k.produced_30d).toLocaleString()} icon={<Factory className="size-4" />} />
        <MiniStat label="Dispatched (30d)" value={Number(k.dispatched_30d).toLocaleString()} icon={<Truck className="size-4" />} />
        <MiniStat label="Revenue (30d)" value={`$${Number(k.revenue_30d).toLocaleString()}`} icon={<DollarSign className="size-4" />} />
        <MiniStat label="RM Inventory Value" value={`$${Number(k.inventory_value).toLocaleString()}`} icon={<Boxes className="size-4" />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        {/* Monthly sales by SKU */}
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={17} className="text-primary" /> Monthly Forecast by Product</h3>
          <div className="space-y-2.5">
            {data.forecast_by_sku.length === 0 ? <p className="text-sm text-ink-4 py-4 text-center">No forecast for {data.month}</p> :
              data.forecast_by_sku.map((s: any) => (
                <div key={s.sku_id} className="flex items-center gap-3">
                  <span className="text-sm font-mono w-20 shrink-0">{s.sku_code}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-canvas overflow-hidden"><div className="h-2.5 rounded-full bg-primary" style={{ width: `${Math.max(3, (s.units / maxFc) * 100)}%` }} /></div>
                  <span className="text-sm font-semibold w-16 text-right">{s.units.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Plant utilization + shifts needed */}
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Gauge size={17} className="text-primary" /> Plant Utilization (today)</h3>
          <div className="space-y-3">
            {data.plant_utilization.map((p: any) => {
              const color = p.over_capacity ? "var(--color-danger)" : p.utilization > 80 ? "var(--color-amber-500)" : "var(--color-teal-600)";
              return (
                <div key={p.plant_name}>
                  <div className="flex justify-between text-[13px] mb-1"><span className="font-medium">{p.plant_name}</span><span className="text-ink-3">{p.used_hours}/{p.capacity_hours}h · {p.shifts_needed} shift(s)</span></div>
                  <div className="h-2 rounded-full bg-canvas overflow-hidden"><div className="h-2 rounded-full" style={{ width: `${Math.min(100, p.utilization)}%`, background: color }} /></div>
                </div>
              );
            })}
            {data.plant_utilization.length === 0 && <p className="text-sm text-ink-4 py-4 text-center">No plants configured</p>}
          </div>
        </div>
      </div>

      {/* Inventory status snapshot */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Boxes size={17} className="text-primary" /> Raw Material Totals</h3>
          <div className="space-y-2">
            {data.rm_totals.slice(0, 8).map((m: any) => (
              <div key={m.name} className="flex justify-between text-sm border-b border-border last:border-0 py-1.5"><span className="text-ink-2">{m.name}</span><span className="font-semibold">{m.qty.toLocaleString()} <span className="text-ink-4 font-normal text-xs">{m.unit}</span></span></div>
            ))}
          </div>
          <Link to="/staff/raw-materials" className="text-xs text-primary font-semibold flex items-center gap-0.5 mt-3">Manage raw materials <ChevronRight className="size-3.5" /></Link>
        </div>

        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2"><AlertTriangle size={17} className="text-amber-500" /> Finished Goods Status</h3>
          <div className="space-y-2">
            {data.fg_status.slice(0, 8).map((r: any) => {
              const cls = r.status === "critical" ? "bg-red-100 text-red-700" : r.status === "warning" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
              return <div key={r.sku_code} className="flex justify-between items-center text-sm border-b border-border last:border-0 py-1.5"><span className="text-ink-2">{r.name}</span><span className="flex items-center gap-2"><span className="font-semibold">{r.qty.toLocaleString()}</span><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${cls}`}>{r.status}</span></span></div>;
            })}
          </div>
          <Link to="/staff/finished-goods" className="text-xs text-primary font-semibold flex items-center gap-0.5 mt-3">View finished goods <ChevronRight className="size-3.5" /></Link>
        </div>
      </div>
    </>
  );
}

// ── shared ────────────────────────────────────────────────────────────────────
function Kpi({ featured, warn, label, value, icon }: { featured?: boolean; warn?: boolean; label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className={`rounded-2xl p-5 ${featured ? "bg-sidebar text-white" : "bg-surface shadow-[var(--shadow-sm)]"}`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[13px] font-medium ${featured ? "text-white/60" : "text-ink-3"}`}>{label}</span>
        <span className={`flex size-7 items-center justify-center rounded-lg ${featured ? "bg-white/10 text-accent" : warn ? "bg-amber-100 text-amber-600" : "bg-teal-50 text-primary"}`}>{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${warn && !featured ? "text-amber-600" : ""}`}>{value}</div>
    </div>
  );
}
function MiniStat({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface shadow-[var(--shadow-sm)] p-4 flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-teal-50 text-primary shrink-0">{icon}</span>
      <div><div className="text-[12px] text-ink-3">{label}</div><div className="text-lg font-bold">{value}</div></div>
    </div>
  );
}
function RankPanel({ title, rows }: { title: string; rows: { key: any; title: string; sub: string; amount: number }[] }) {
  return (
    <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
      <h3 className="font-bold px-5 pt-5 pb-2">{title}</h3>
      {rows.length === 0 ? <div className="px-5 py-8 text-center text-ink-4 text-sm">No data yet</div> : rows.map((r, i) => (
        <div key={r.key} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0">
          <span className="text-[13px] font-bold text-ink-4 w-6">#{i + 1}</span>
          <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{r.title}</div><div className="text-[12px] text-ink-4 truncate">{r.sub}</div></div>
          <div className="font-semibold text-sm">${r.amount.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
function ExportBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border bg-surface text-sm font-medium text-ink-2 hover:border-primary hover:text-primary transition-colors"><Download size={14} /> {icon} {label}</button>;
}
function AlertRow({ to, tone, icon, text }: { to: string; tone: "amber" | "teal"; icon: React.ReactNode; text: string }) {
  const toneCls = tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-teal-700";
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-canvas transition-colors">
      <span className={`flex size-8 items-center justify-center rounded-lg ${toneCls}`}>{icon}</span>
      <span className="flex-1 text-sm font-medium text-ink-2">{text}</span>
      <ChevronRight className="size-4 text-ink-4" />
    </Link>
  );
}
