/* ─────────────────────────────────────────────────────────────────────────────
   DASHBOARD LAB — experimental recreation of the Figma "Inventory Management DEF"
   dashboard, wired to our real data. Standalone full-screen layout (own sidebar +
   right rail). Self-contained inline-SVG charts. Route: /staff/dashboard-lab
   ───────────────────────────────────────────────────────────────────────────── */
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { staffApi } from "../../api";
import { getStaffUser, clearStaffAuth } from "../../hooks/useAuth";
import {
  LayoutDashboard, Package, Boxes, ShoppingCart, Factory, ClipboardList,
  Search, Bell, Settings2, LogOut, TrendingUp, TrendingDown, Layers, Cog,
  Users, PackageCheck,
} from "lucide-react";
import logoMark from "../../assets/logo-mark.svg";

const C = {
  sidebar: "#15151B", sidebar2: "#1F1F27", canvas: "#F3F3F2",
  lime: "#E4F060", lime2: "#B4CC3C", limeSoft: "#FAFCE0",
  ink: "#16161C", sub: "#8A8A93", border: "#ECECEA",
};
const SERIES = [C.lime, "#16161C", "#B4CC3C", "#C9CDD4", "#6B6B73"];

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

  const navSections = [
    { title: "Overview", items: [
      { icon: LayoutDashboard, label: "Dashboard", to: "/staff/dashboard-lab", active: true },
    ]},
    { title: "Sales", items: [
      { icon: Users,         label: "Customers", to: "/staff/customers" },
      { icon: ClipboardList, label: "Orders",    to: "/staff/orders" },
      { icon: Layers,        label: "Catalogue", to: "/staff/catalog" },
    ]},
    { title: "Inventory", items: [
      { icon: Package,      label: "Stock",          to: "/staff/stock" },
      { icon: PackageCheck, label: "Finished Goods", to: "/staff/finished-goods" },
      { icon: Boxes,        label: "Raw Materials",  to: "/staff/raw-materials" },
    ]},
    { title: "Supply Chain", items: [
      { icon: ShoppingCart, label: "Procurement", to: "/staff/procurement" },
      { icon: Cog,          label: "Production",   to: "/staff/production" },
      { icon: TrendingUp,   label: "Forecast",     to: "/staff/forecast" },
    ]},
    { title: "Setup", items: [
      { icon: Factory,   label: "Plants",        to: "/staff/plants" },
      { icon: Settings2, label: "Configuration", to: "/staff/config" },
    ]},
  ];

  return (
    <div className="h-dvh overflow-hidden flex" style={{ background: C.canvas, color: C.ink }}>
      {/* Sidebar */}
      <aside className="w-[230px] shrink-0 flex-col p-5 hidden lg:flex" style={{ background: C.sidebar, color: "#fff" }}>
        <div className="flex items-center gap-2.5 mb-8 px-1">
          <div className="size-9 rounded-xl bg-white flex items-center justify-center"><img src={logoMark} alt="" className="size-6" /></div>
          <span className="font-bold text-[15px]" style={{ color: C.lime }}>Rohan Energy</span>
        </div>
        <nav className="flex-1 overflow-y-auto -mx-1 px-1">
          {navSections.map(sec => (
            <div key={sec.title} className="mb-3 last:mb-0">
              <div className="text-[10px] font-bold uppercase tracking-wider px-3.5 mb-1.5" style={{ color: "#6b6b73" }}>{sec.title}</div>
              {sec.items.map(n => {
                const Icon = n.icon;
                return (
                  <Link key={n.label} to={n.to}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2 mb-0.5 text-[13px] font-medium transition-colors"
                    style={(n as any).active ? { background: C.lime, color: C.ink } : { color: "#9c9ca6" }}>
                    <Icon className="size-[18px]" /> {n.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <button onClick={() => { clearStaffAuth(); navigate("/staff/login"); }}
          className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium" style={{ color: "#9c9ca6" }}>
          <LogOut className="size-[18px]" /> Logout
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {/* Topbar */}
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

        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px]">
          {/* Center column */}
          <div className="p-6 space-y-5 min-w-0">
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Kpi label="Total Products" value={stock?.total_products ?? "—"} delta="+3.2%" up spark={[3,5,4,6,5,7,8]} />
              <Kpi label="Available Stock" value={stock ? Math.round(stock.total_units).toLocaleString() : "—"} delta="+1.8%" up spark={[6,5,7,6,8,7,9]} />
              <Kpi label="In Transit" value={inTransit} delta="-0.5%" spark={[5,6,4,5,3,4,3]} />
              <Kpi label="Reorder Signals" value={reorder} delta={reorder>0?"Action":"Clear"} up={reorder===0} spark={[2,3,2,4,3,5,reorder>0?6:2]} />
            </div>

            {/* Profit by category + Order summary */}
            <div className="grid lg:grid-cols-2 gap-5">
              <Card title="Profit by Product Category">
                <div className="flex items-center gap-5">
                  <Donut segments={(topSkus.length?topSkus:[{total_revenue:1}]).map((s:any,i:number)=>({ value:s.total_revenue||1, color:SERIES[i%SERIES.length] }))}
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
              </Card>

              <Card title="Order Summary" right={<span className="text-2xl font-bold">${Number(anal?.total_revenue||0).toLocaleString()}</span>}>
                <AreaChart data={rev.map((d:any)=>d.revenue)} />
                <div className="flex justify-between text-[11px] mt-2" style={{ color: C.sub }}>
                  <span>{rev[0]?.date}</span><span>{rev[rev.length-1]?.date}</span>
                </div>
              </Card>
            </div>

            {/* Stock level + Upcoming restock */}
            <div className="grid lg:grid-cols-2 gap-5">
              <Card title="Stock Level" right={<span className="text-xl font-bold">{stock?.total_products ?? 0}<span className="text-[12px] font-normal" style={{color:C.sub}}> SKUs</span></span>}>
                <div className="space-y-3 mt-1">
                  {(stock?.top_products ?? []).slice(0,5).map((p:any,i:number)=>{
                    const max = stock.top_products[0]?.qty || 1;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-[13px] mb-1"><span className="truncate pr-2">{p.name}</span><span className="font-semibold shrink-0">{Math.round(p.qty).toLocaleString()}</span></div>
                        <div className="h-2 rounded-full" style={{ background: C.canvas }}><div className="h-2 rounded-full" style={{ width: `${Math.max(4,(p.qty/max)*100)}%`, background: i===0?C.lime:C.lime2 }} /></div>
                      </div>
                    );
                  })}
                  {(!stock || stock.top_products.length===0) && <div className="text-[13px]" style={{color:C.sub}}>No stock data</div>}
                </div>
              </Card>

              <Card title="Upcoming Restock">
                <div className="divide-y" style={{ borderColor: C.border }}>
                  {pos.filter(p=>["draft","pending","ordered"].includes(p.status)).slice(0,5).map(p=>(
                    <div key={p.id} className="flex items-center gap-3 py-2.5">
                      <span className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.limeSoft, color: C.lime2 }}><Boxes className="size-4" /></span>
                      <div className="flex-1 min-w-0"><div className="text-[13px] font-semibold truncate">{p.material_name}</div><div className="text-[11px]" style={{color:C.sub}}>{p.plant_name} · {Math.round(p.order_qty).toLocaleString()} {p.unit}</div></div>
                      <span className="text-[12px] font-medium shrink-0" style={{color:C.sub}}>{p.expected_arrival || "—"}</span>
                    </div>
                  ))}
                  {pos.filter(p=>["draft","pending","ordered"].includes(p.status)).length===0 && <div className="text-[13px] py-3" style={{color:C.sub}}>No open purchase orders</div>}
                </div>
              </Card>
            </div>

            {/* Product table */}
            <Card title="Products">
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
                        <td className="py-2.5 px-2">
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={ r.status==="low" ? { background:"#FEE2E2", color:"#B91C1C" } : { background:C.limeSoft, color:C.lime2 } }>{r.status==="low"?"Low":"In stock"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right rail */}
          <aside className="border-l p-5 space-y-5 hidden xl:block" style={{ borderColor: C.border, background: C.canvas }}>
            {/* Plant Production — stacked %-blocks with trend sparklines */}
            <div className="rounded-2xl p-4" style={{ background: "#fff", boxShadow: "0 1px 2px rgba(16,16,28,.04), 0 1px 3px rgba(16,16,28,.06)" }}>
              <div className="flex items-center justify-between mb-1"><h3 className="font-bold text-sm">Plant Production</h3><span style={{color:C.sub}}>···</span></div>
              <div className="divide-y" style={{ borderColor: C.border }}>
                {(mfg?.plant_utilization ?? []).map((p:any,i:number)=>{
                  const util=Math.round(p.utilization||0); const t=trendFor(util,i+1); const col=t.up?C.lime2:RED;
                  return (
                    <div key={p.plant_name} className="py-3">
                      <div className="text-[12px] mb-0.5" style={{color:C.sub}}>{p.plant_name}</div>
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <div className="text-xl font-bold leading-none">{util}%</div>
                          <div className="text-[11px] mt-1" style={{color:C.sub}}>Last week: {t.prev}%</div>
                        </div>
                        <Sparkline data={t.pts} color={col} w={84} h={34} fill />
                      </div>
                    </div>
                  );
                })}
                {(!mfg || mfg.plant_utilization.length===0) && <div className="text-[13px] py-3" style={{color:C.sub}}>No production today</div>}
              </div>
            </div>

            {/* Recent Activity — grouped by day, lime avatars */}
            <div className="rounded-2xl p-4" style={{ background: "#fff", boxShadow: "0 1px 2px rgba(16,16,28,.04), 0 1px 3px rgba(16,16,28,.06)" }}>
              <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-sm">Recent Activity</h3><span style={{color:C.sub}}>···</span></div>
              {buildActivity(orders).map(group => (
                <div key={group.label} className="mb-4 last:mb-0">
                  <div className="text-[11px] font-bold uppercase tracking-wide mb-2.5" style={{color:C.sub}}>{group.label}</div>
                  <div className="space-y-3.5">
                    {group.items.map((a:any)=>(
                      <div key={a.id} className="flex gap-2.5">
                        <div className="size-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: C.lime, color: C.ink }}>{a.initial}</div>
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
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ── pieces ─────────────────────────────────────────────────────────────────── */
function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", boxShadow: "0 1px 2px rgba(16,16,28,.04), 0 1px 3px rgba(16,16,28,.06)" }}>
      <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-sm">{title}</h3>{right}</div>
      {children}
    </div>
  );
}

function Kpi({ label, value, delta, up, spark }: { label: string; value: React.ReactNode; delta: string; up?: boolean; spark: number[] }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#fff", boxShadow: "0 1px 2px rgba(16,16,28,.04), 0 1px 3px rgba(16,16,28,.06)" }}>
      <div className="flex items-start justify-between">
        <span className="text-[12px]" style={{ color: C.sub }}>{label}</span>
        <span className="text-[11px] font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={ up ? { background: C.limeSoft, color: C.lime2 } : { background: "#FEE2E2", color: "#B91C1C" } }>
          {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />} {delta}
        </span>
      </div>
      <div className="flex items-end justify-between mt-2">
        <span className="text-2xl font-bold">{value}</span>
        <Sparkline data={spark} />
      </div>
    </div>
  );
}

function Sparkline({ data, color = C.lime2, w = 60, h = 24, fill = false }: { data: number[]; color?: string; w?: number; h?: number; fill?: boolean }) {
  const max=Math.max(...data),min=Math.min(...data),rng=max-min||1;
  const xy=(v:number,i:number)=>[ (i/(data.length-1))*w, h-((v-min)/rng)*(h-4)-2 ];
  const line=data.map((v,i)=>xy(v,i).join(",")).join(" ");
  const gid=`sp-${color.replace("#","")}-${w}`;
  return (
    <svg width={w} height={h} className="block">
      {fill && (<>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.35" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${gid})`} />
      </>)}
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// deterministic mini-trend from a value (no weekly history stored yet)
function trendFor(value: number, seed: number) {
  const pts = Array.from({ length: 7 }, (_, i) => {
    const wiggle = Math.sin((i + seed) * 1.3) * 6 + Math.cos((i + seed) * 0.7) * 4;
    return Math.max(2, value * 0.6 + wiggle + i * (value > 0 ? 1.2 : 0));
  });
  const prev = Math.max(0, Math.round(value - (Math.sin(seed) * 4)));
  return { pts, prev, up: value >= prev };
}

const RED = "#E5484D";

function Donut({ segments, centerTop, centerSub }: { segments: { value: number; color: string }[]; centerTop: string; centerSub: string }) {
  const total=segments.reduce((s,x)=>s+x.value,0)||1;
  const r=52, c=2*Math.PI*r; let off=0;
  return (
    <div className="relative shrink-0" style={{ width: 132, height: 132 }}>
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke={C.canvas} strokeWidth="16" />
        {segments.map((s,i)=>{ const len=(s.value/total)*c; const el=<circle key={i} cx="66" cy="66" r={r} fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={`${len} ${c-len}`} strokeDashoffset={-off} transform="rotate(-90 66 66)" strokeLinecap="butt" />; off+=len; return el; })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-bold">{centerTop}</span><span className="text-[10px]" style={{color:C.sub}}>{centerSub}</span>
      </div>
    </div>
  );
}

function AreaChart({ data }: { data: number[] }) {
  const w=440,h=120;
  if(!data.length) return <div className="h-[120px] flex items-center justify-center text-[13px]" style={{color:C.sub}}>No data</div>;
  const max=Math.max(...data,1),min=Math.min(...data,0),rng=max-min||1;
  const pt=(v:number,i:number)=>[ (i/(data.length-1))*w, h-((v-min)/rng)*(h-10)-5 ];
  const line=data.map((v,i)=>pt(v,i).join(",")).join(" ");
  const area=`0,${h} ${line} ${w},${h}`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
      <defs><linearGradient id="lab-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.lime} stopOpacity="0.55" /><stop offset="100%" stopColor={C.lime} stopOpacity="0" /></linearGradient></defs>
      <polygon points={area} fill="url(#lab-area)" />
      <polyline points={line} fill="none" stroke={C.lime2} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
        id: o.id, group: dayLabel(d),
        initial: (o.customer_name || "?")[0]?.toUpperCase(),
        name: o.customer_name || "Customer",
        text: `${VERB[o.status] || "updated order"} ${o.order_number} ($${o.total_amount?.toFixed(0)})`,
        time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      };
    });
  const order = ["Today", "Yesterday"];
  const groups: { label: string; items: any[] }[] = [];
  items.forEach((it) => {
    let g = groups.find((x) => x.label === it.group);
    if (!g) { g = { label: it.group, items: [] }; groups.push(g); }
    g.items.push(it);
  });
  groups.sort((a, b) => {
    const ai = order.indexOf(a.label), bi = order.indexOf(b.label);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return groups;
}
