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
  Search, Bell, Settings2, LogOut, TrendingUp, TrendingDown, Dot, Layers, Cog,
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

  const nav = [
    { icon: LayoutDashboard, label: "Dashboard", active: true, to: "/staff/dashboard-lab" },
    { icon: ClipboardList, label: "Orders", to: "/staff/orders" },
    { icon: Layers, label: "Catalogue", to: "/staff/catalog" },
    { icon: Package, label: "Stock", to: "/staff/stock" },
    { icon: Boxes, label: "Raw Materials", to: "/staff/raw-materials" },
    { icon: ShoppingCart, label: "Procurement", to: "/staff/procurement" },
    { icon: Cog, label: "Production", to: "/staff/production" },
    { icon: Factory, label: "Plants", to: "/staff/plants" },
    { icon: Settings2, label: "Configuration", to: "/staff/config" },
  ];

  return (
    <div className="min-h-dvh flex" style={{ background: C.canvas, color: C.ink }}>
      {/* Sidebar */}
      <aside className="w-[230px] shrink-0 flex-col p-5 hidden lg:flex" style={{ background: C.sidebar, color: "#fff" }}>
        <div className="flex items-center gap-2.5 mb-8 px-1">
          <div className="size-9 rounded-xl bg-white flex items-center justify-center"><img src={logoMark} alt="" className="size-6" /></div>
          <span className="font-bold text-[15px]" style={{ color: C.lime }}>Rohan Energy</span>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(n => {
            const Icon = n.icon;
            return (
              <Link key={n.label} to={n.to}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-colors"
                style={n.active ? { background: C.lime, color: C.ink } : { color: "#9c9ca6" }}>
                <Icon className="size-[18px]" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={() => { clearStaffAuth(); navigate("/staff/login"); }}
          className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-medium" style={{ color: "#9c9ca6" }}>
          <LogOut className="size-[18px]" /> Logout
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
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

        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px]">
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
          <aside className="border-l p-5 space-y-5 hidden xl:block" style={{ borderColor: C.border, background: "#fff" }}>
            <div className="text-right">
              <div className="size-12 rounded-full ml-auto flex items-center justify-center text-base font-bold mb-2" style={{ background: C.lime, color: C.ink }}>{user?.name?.[0]?.toUpperCase()}</div>
              <div className="font-bold text-sm">{user?.name}</div>
              <div className="text-[12px] capitalize" style={{color:C.sub}}>{user?.role?.replace("_"," ")}</div>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-3">Plant Production</h3>
              <div className="space-y-3">
                {(mfg?.plant_utilization ?? []).map((p:any)=>(
                  <div key={p.plant_name} className="flex items-center gap-3">
                    <Ring value={Math.min(100, Math.round(p.utilization))} />
                    <div className="min-w-0"><div className="text-[13px] font-semibold truncate">{p.plant_name}</div><div className="text-[11px]" style={{color:C.sub}}>{p.used_hours}/{p.capacity_hours}h · {p.shifts_needed} shifts</div></div>
                  </div>
                ))}
                {(!mfg || mfg.plant_utilization.length===0) && <div className="text-[13px]" style={{color:C.sub}}>No production today</div>}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-sm mb-3">Recent Activity</h3>
              <div className="space-y-3">
                {orders.slice(0,6).map((o:any)=>(
                  <div key={o.id} className="flex gap-2.5">
                    <Dot className="size-4 shrink-0 mt-0.5" style={{ color: C.lime2 }} />
                    <div className="min-w-0">
                      <div className="text-[12px]"><span className="font-semibold font-mono">{o.order_number}</span> · {o.customer_name}</div>
                      <div className="text-[11px]" style={{color:C.sub}}>{o.status?.replace(/_/g," ")} · ${o.total_amount?.toFixed(0)}</div>
                    </div>
                  </div>
                ))}
              </div>
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

function Sparkline({ data }: { data: number[] }) {
  const w=60,h=24, max=Math.max(...data),min=Math.min(...data),rng=max-min||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/rng)*h}`).join(" ");
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={C.lime2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

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

function Ring({ value }: { value: number }) {
  const r=18,c=2*Math.PI*r,len=(value/100)*c;
  return (
    <div className="relative shrink-0" style={{width:46,height:46}}>
      <svg width="46" height="46"><circle cx="23" cy="23" r={r} fill="none" stroke={C.canvas} strokeWidth="5" /><circle cx="23" cy="23" r={r} fill="none" stroke={C.lime2} strokeWidth="5" strokeDasharray={`${len} ${c-len}`} strokeLinecap="round" transform="rotate(-90 23 23)" /></svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">{value}%</span>
    </div>
  );
}
