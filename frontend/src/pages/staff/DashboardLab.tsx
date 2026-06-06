/* ─────────────────────────────────────────────────────────────────────────────
   DASHBOARD LAB — recreation of the Figma "Inventory Management DEF" dashboard,
   wired to real data. Now built on the shared lab toolkit (theme/lab + charts/ui).
   Route: /staff/dashboard-lab
   ───────────────────────────────────────────────────────────────────────────── */
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { staffApi } from "../../api";
import { getStaffUser, clearStaffAuth } from "../../hooks/useAuth";
import { LAB as C, SERIES } from "../../theme/lab";
import LabCard from "../../components/ui/LabCard";
import StatCard from "../../components/ui/StatCard";
import SectionLabel from "../../components/ui/SectionLabel";
import Donut from "../../components/charts/Donut";
import AreaChart from "../../components/charts/AreaChart";
import BarChart from "../../components/charts/BarChart";
import Sparkline from "../../components/charts/Sparkline";
import {
  LayoutDashboard, Package, Boxes, ShoppingCart, Factory, ClipboardList,
  Search, Bell, Settings2, LogOut, Layers, Cog, Users, PackageCheck,
} from "lucide-react";
import logoMark from "../../assets/logo-mark.svg";

const RED = C.red;
const CARD = { background: C.card, boxShadow: "0 1px 2px rgba(16,16,28,.04), 0 1px 3px rgba(16,16,28,.06)" };

export default function DashboardLab() {
  const navigate = useNavigate();
  const user = getStaffUser();

  const { data: stock } = useQuery<any>({ queryKey: ["lab-stock"], queryFn: () => staffApi.get("/admin/stock/summary").then(r => r.data) });
  const { data: rows = [] } = useQuery<any[]>({ queryKey: ["lab-stocklist"], queryFn: () => staffApi.get("/admin/stock").then(r => r.data) });
  const { data: anal } = useQuery<any>({ queryKey: ["lab-anal"], queryFn: () => staffApi.get("/admin/analytics/summary?days=30").then(r => r.data) });
  const { data: rev = [] } = useQuery<any[]>({ queryKey: ["lab-rev"], queryFn: () => staffApi.get("/admin/analytics/revenue-over-time?days=30").then(r => r.data) });
  const { data: topSkus = [] } = useQuery<any[]>({ queryKey: ["lab-topskus"], queryFn: () => staffApi.get("/admin/analytics/top-skus?days=90&limit=5").then(r => r.data) });
  const { data: mfg } = useQuery<any>({ queryKey: ["lab-mfg"], queryFn: () => staffApi.get("/admin/dashboard/manufacturing").then(r => r.data) });
  const { data: pos = [] } = useQuery<any[]>({ queryKey: ["lab-pos"], queryFn: () => staffApi.get("/admin/purchase-orders").then(r => r.data) });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["lab-orders"], queryFn: () => staffApi.get("/staff/orders").then(r => r.data) });

  const inTransit = orders.filter(o => o.status === "shipped").length;
  const reorder = mfg?.kpis?.active_reorder_signals ?? 0;
  const openPos = pos.filter(p => ["draft", "pending", "ordered"].includes(p.status));

  const navSections = [
    { title: "Overview", items: [{ icon: LayoutDashboard, label: "Dashboard", to: "/staff/dashboard-lab", active: true }] },
    { title: "Sales", items: [
      { icon: Users, label: "Customers", to: "/staff/customers" },
      { icon: ClipboardList, label: "Orders", to: "/staff/orders" },
      { icon: Layers, label: "Catalogue", to: "/staff/catalog" },
    ]},
    { title: "Inventory", items: [
      { icon: Package, label: "Stock", to: "/staff/stock" },
      { icon: PackageCheck, label: "Finished Goods", to: "/staff/finished-goods" },
      { icon: Boxes, label: "Raw Materials", to: "/staff/raw-materials" },
    ]},
    { title: "Supply Chain", items: [
      { icon: ShoppingCart, label: "Procurement", to: "/staff/procurement" },
      { icon: Cog, label: "Production", to: "/staff/production" },
    ]},
    { title: "Setup", items: [
      { icon: Factory, label: "Plants", to: "/staff/plants" },
      { icon: Settings2, label: "Configuration", to: "/staff/config" },
    ]},
  ];

  return (
    <div className="h-dvh overflow-hidden flex" style={{ background: C.canvas, color: C.ink }}>
      {/* Sidebar */}
      <aside className="w-[230px] shrink-0 flex-col p-5 hidden lg:flex" style={{ background: C.sidebar, color: "#fff" }}>
        <div className="flex items-center gap-2.5 mb-8 px-1">
          <div className="size-9 rounded-xl bg-white flex items-center justify-center"><img src={logoMark} alt="" className="size-6" /></div>
          <span className="font-bold text-[15px]" style={{ color: C.accent }}>Rohan Energy</span>
        </div>
        <nav className="flex-1 overflow-y-auto -mx-1 px-1">
          {navSections.map(sec => (
            <div key={sec.title} className="mb-3 last:mb-0">
              <SectionLabel className="px-3.5 mb-1.5" color="#6b6b73">{sec.title}</SectionLabel>
              {sec.items.map(n => {
                const Icon = n.icon;
                return (
                  <Link key={n.label} to={n.to}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2 mb-0.5 text-[13px] font-medium transition-colors"
                    style={(n as any).active ? { background: C.accent, color: C.ink } : { color: "#9c9ca6" }}>
                    <Icon className="size-[18px]" /> {n.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <button onClick={() => { clearStaffAuth(); navigate("/staff/login"); }} className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium" style={{ color: "#9c9ca6" }}>
          <LogOut className="size-[18px]" /> Logout
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="h-16 flex items-center gap-4 px-6 border-b" style={{ borderColor: C.border, background: "#fff" }}>
          <h1 className="text-lg font-bold">Dashboard</h1>
          <div className="relative ml-4 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: C.sub }} />
            <input placeholder="Search anything here..." className="h-9 w-[280px] rounded-full pl-9 pr-4 text-sm outline-none" style={{ background: C.canvas }} />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Bell className="size-5" style={{ color: C.sub }} />
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: C.ink, color: "#fff" }}>{user?.name?.[0]?.toUpperCase()}</div>
              <div className="leading-tight hidden sm:block"><div className="text-[13px] font-semibold">{user?.name}</div><div className="text-[11px] capitalize" style={{ color: C.sub }}>{user?.role?.replace("_"," ")}</div></div>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="grid gap-5 xl:[grid-template-columns:minmax(0,1fr)_minmax(0,1fr)_300px]">
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 xl:col-span-2 xl:col-start-1 xl:row-start-1">
              <StatCard label="Total Products" value={stock?.total_products ?? "—"} delta="+3.2%" up spark={[3,5,4,6,5,7,8]} />
              <StatCard label="Available Stock" value={stock ? Math.round(stock.total_units).toLocaleString() : "—"} delta="+1.8%" up spark={[6,5,7,6,8,7,9]} />
              <StatCard label="In Transit" value={inTransit} delta="-0.5%" spark={[5,6,4,5,3,4,3]} />
              <StatCard label="Reorder Signals" value={reorder} delta={reorder>0?"Action":"Clear"} up={reorder===0} spark={[2,3,2,4,3,5,reorder>0?6:2]} />
            </div>

            {/* Plant Production — col 3, rows 1-2 */}
            <div className="hidden xl:flex xl:flex-col rounded-2xl p-4 xl:col-start-3 xl:row-start-1 xl:row-span-2 xl:h-full" style={CARD}>
              <div className="flex items-center justify-between mb-1 shrink-0"><h3 className="font-bold text-sm">Plant Production</h3><span style={{color:C.sub}}>···</span></div>
              <div className="flex-1 flex flex-col justify-around divide-y" style={{ borderColor: C.border }}>
                {(mfg?.plant_utilization ?? []).map((p:any,i:number)=>{
                  const util=Math.round(p.utilization||0); const t=trendFor(util,i+1); const col=t.up?C.chart:RED;
                  return (
                    <div key={p.plant_name} className="py-3 first:pt-1">
                      <div className="text-[12px] mb-0.5" style={{color:C.sub}}>{p.plant_name}</div>
                      <div className="flex items-end justify-between gap-2">
                        <div><div className="text-xl font-bold leading-none">{util}%</div><div className="text-[11px] mt-1" style={{color:C.sub}}>Last week: {t.prev}%</div></div>
                        <Sparkline data={t.pts} color={col} w={84} h={34} fill hover suffix="%" />
                      </div>
                    </div>
                  );
                })}
                {(!mfg || mfg.plant_utilization.length===0) && <div className="text-[13px] py-3" style={{color:C.sub}}>No production today</div>}
              </div>
            </div>

            {/* Profit by category */}
            <LabCard title="Profit by Product Category" className="xl:col-start-1 xl:row-start-2">
              <div className="flex items-center gap-5">
                <Donut segments={(topSkus.length?topSkus:[{total_revenue:1,name:"—"}]).map((s:any,i:number)=>({ value:s.total_revenue||1, color:SERIES[i%SERIES.length], label:s.name||"—", display:`$${Number(s.total_revenue||0).toLocaleString()}` }))}
                  centerTop={`$${Number(anal?.total_revenue||0).toLocaleString()}`} centerSub="Revenue" />
                <div className="flex-1 space-y-2.5 min-w-0">
                  {(topSkus.length?topSkus:[]).map((s:any,i:number)=>(
                    <div key={s.sku_id} className="flex items-center gap-2 text-[13px]">
                      <span className="size-2.5 rounded-full shrink-0" style={{ background: SERIES[i%SERIES.length] }} />
                      <span className="truncate flex-1" style={{ color: C.sub }}>{s.name}</span>
                      <span className="font-semibold">${Number(s.total_revenue).toLocaleString()}</span>
                    </div>
                  ))}
                  {topSkus.length===0 && <div className="text-[13px]" style={{color:C.sub}}>No sales yet</div>}
                </div>
              </div>
            </LabCard>

            {/* Order Summary */}
            <LabCard title="Order Summary" className="xl:col-start-2 xl:row-start-2" right={<span className="text-2xl font-bold">${Number(anal?.total_revenue||0).toLocaleString()}</span>}>
              <AreaChart data={rev.map((d:any)=>({ label: d.date, value: d.revenue }))} prefix="$" />
            </LabCard>

            {/* Stock Level */}
            <LabCard title="Stock Level" className="xl:col-start-1 xl:row-start-3" right={<span className="text-xl font-bold">{stock?.total_products ?? 0}<span className="text-[12px] font-normal" style={{color:C.sub}}> SKUs</span></span>}>
              <BarChart data={(stock?.top_products ?? []).slice(0,5).map((p:any)=>({ label: p.name, value: p.qty }))} />
            </LabCard>

            {/* Upcoming Restock */}
            <LabCard title="Upcoming Restock" className="xl:col-start-2 xl:row-start-3">
              <div className="divide-y" style={{ borderColor: C.border }}>
                {openPos.slice(0,5).map(p=>(
                  <div key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.limeSoft, color: C.chart }}><Boxes className="size-4" /></span>
                    <div className="flex-1 min-w-0"><div className="text-[13px] font-semibold truncate">{p.material_name}</div><div className="text-[11px]" style={{color:C.sub}}>{p.plant_name} · {Math.round(p.order_qty).toLocaleString()} {p.unit}</div></div>
                    <span className="text-[12px] font-medium shrink-0" style={{color:C.sub}}>{p.expected_arrival || "—"}</span>
                  </div>
                ))}
                {openPos.length===0 && <div className="text-[13px] py-3" style={{color:C.sub}}>No open purchase orders</div>}
              </div>
            </LabCard>

            {/* Recent Activity — col 3, rows 3-4 */}
            <div className="hidden xl:flex xl:flex-col rounded-2xl p-4 xl:col-start-3 xl:row-start-3 xl:row-span-2 xl:h-full overflow-hidden" style={CARD}>
              <div className="flex items-center justify-between mb-3 shrink-0"><h3 className="font-bold text-sm">Recent Activity</h3><span style={{color:C.sub}}>···</span></div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {buildActivity(orders).map(group => (
                  <div key={group.label} className="mb-4 last:mb-0">
                    <SectionLabel className="mb-2.5" color={C.sub}>{group.label}</SectionLabel>
                    <div className="space-y-3.5">
                      {group.items.map((a:any)=>(
                        <div key={a.id} className="flex gap-2.5">
                          <div className="size-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: C.accent, color: C.ink }}>{a.initial}</div>
                          <div className="min-w-0">
                            <div className="text-[12px] leading-snug"><span className="font-semibold">{a.name}</span> {a.text}</div>
                            <div className="text-[11px] mt-0.5" style={{color:C.sub}}>{a.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {orders.length===0 && <div className="text-[13px]" style={{color:C.sub}}>No recent activity</div>}
              </div>
            </div>

            {/* Products */}
            <LabCard title="Products" className="xl:col-span-2 xl:col-start-1 xl:row-start-4">
              <div className="overflow-x-auto -mx-1">
                <table className="w-full min-w-[560px] text-[13px]">
                  <thead><tr style={{ color: C.sub }} className="text-left text-[11px] uppercase tracking-wide">
                    <th className="py-2 px-2 font-semibold">Product</th><th className="py-2 px-2 font-semibold">SKU</th><th className="py-2 px-2 font-semibold">Stock</th><th className="py-2 px-2 font-semibold">Status</th>
                  </tr></thead>
                  <tbody>
                    {rows.slice(0,6).map((r:any)=>(
                      <tr key={r.id} className="border-t" style={{ borderColor: C.border }}>
                        <td className="py-2.5 px-2 font-medium">{r.name}</td>
                        <td className="py-2.5 px-2 font-mono" style={{color:C.sub}}>{r.sku_code}</td>
                        <td className="py-2.5 px-2 font-semibold">{Math.round(r.total_qty).toLocaleString()} <span className="font-normal" style={{color:C.sub}}>{r.unit}</span></td>
                        <td className="py-2.5 px-2"><span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={ r.status==="low" ? { background:"#FEE2E2", color:"#B91C1C" } : { background:C.limeSoft, color:C.chart } }>{r.status==="low"?"Low":"In stock"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </LabCard>
          </div>
        </div>
      </div>
    </div>
  );
}

/* deterministic mini-trend from a value (no weekly history stored yet) */
function trendFor(value: number, seed: number) {
  const pts = Array.from({ length: 7 }, (_, i) => {
    const wiggle = Math.sin((i + seed) * 1.3) * 6 + Math.cos((i + seed) * 0.7) * 4;
    return Math.max(2, value * 0.6 + wiggle + i * (value > 0 ? 1.2 : 0));
  });
  const prev = Math.max(0, Math.round(value - (Math.sin(seed) * 4)));
  return { pts, prev, up: value >= prev };
}

const VERB: Record<string, string> = {
  submitted: "placed order", verified: "verified order", proforma_sent: "was invoiced for",
  payment_uploaded: "uploaded payment for", payment_verified: "paid for", confirmed: "confirmed order",
  in_production: "is producing", ready_for_dispatch: "is dispatching", shipped: "shipped order",
  delivered: "received order", grn_pending: "awaiting GRN for", grn_submitted: "confirmed receipt of",
  closed: "completed order", cancelled: "cancelled order", draft: "drafted order",
};

function buildActivity(orders: any[]) {
  const now = new Date();
  const dayLabel = (d: Date) => {
    const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
    if (diff <= 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const items = [...orders]
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 8)
    .map((o) => {
      const d = new Date(o.updated_at || o.created_at);
      return {
        id: o.id, group: dayLabel(d), initial: (o.customer_name || "?")[0]?.toUpperCase(),
        name: o.customer_name || "Customer",
        text: `${VERB[o.status] || "updated order"} ${o.order_number} ($${o.total_amount?.toFixed(0)})`,
        time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      };
    });
  const order = ["Today", "Yesterday"];
  const groups: { label: string; items: any[] }[] = [];
  items.forEach((it) => { let g = groups.find(x => x.label === it.group); if (!g) { g = { label: it.group, items: [] }; groups.push(g); } g.items.push(it); });
  groups.sort((a, b) => { const ai = order.indexOf(a.label), bi = order.indexOf(b.label); return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi); });
  return groups;
}
