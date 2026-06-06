import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { staffApi } from "../../api";
import { getStaffUser } from "../../hooks/useAuth";
import { StatusPill } from "@/components/StatusPill";
import { SkeletonList } from "@/components/Skeleton";
import {
  Activity, UserPlus, CreditCard, Truck, ClipboardList, ChevronRight,
} from "lucide-react";

export default function StaffDashboard() {
  const user = getStaffUser();
  const isCentral = ["admin", "central_team"].includes(user?.role || "");
  const isFinance = ["admin", "finance", "central_team"].includes(user?.role || "");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["staff-orders"],
    queryFn: () => staffApi.get("/staff/orders").then((r) => r.data),
    refetchInterval: 20_000,
  });
  const { data: pending = [] } = useQuery({
    queryKey: ["pending-customers"],
    queryFn: () => staffApi.get("/customers/pending").then((r) => r.data),
    refetchInterval: 30_000,
    enabled: isCentral,
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["pending-payments"],
    queryFn: () => staffApi.get("/finance/payments").then((r) => r.data),
    refetchInterval: 20_000,
    enabled: isFinance,
  });

  const active   = orders.filter((o: any) => !["closed", "cancelled"].includes(o.status));
  const awaiting  = orders.filter((o: any) => ["proforma_sent", "payment_uploaded"].includes(o.status));
  const closed   = orders.filter((o: any) => o.status === "closed");
  const shipped  = orders.filter((o: any) => o.status === "shipped");
  const total    = orders.length || 1;
  const activePct  = Math.round((active.length / total) * 100);
  const awaitPct   = Math.round((awaiting.length / total) * 100);

  // donut conic stops
  const a = (active.length / total) * 100;
  const b = a + (awaiting.length / total) * 100;
  const donut = `conic-gradient(#0d9488 0% ${a}%, #bef264 ${a}% ${b}%, #cbd5e1 ${b}% 100%)`;

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-3">
          Welcome back, {user?.name} · <span className="capitalize">{user?.role?.replace("_", " ")}</span>
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Kpi featured label="Active Orders" value={active.length} icon={<Activity className="size-4" />} />
        {isCentral && (
          <Kpi label="Pending Approval" value={pending.length} warn={pending.length > 0} icon={<UserPlus className="size-4" />} />
        )}
        {isFinance && (
          <Kpi label="Payments to Verify" value={payments.length} warn={payments.length > 0} icon={<CreditCard className="size-4" />} />
        )}
        <Kpi label="In Transit" value={shipped.length} icon={<Truck className="size-4" />} />
      </div>

      {/* Middle: breakdown + attention */}
      <div className="grid lg:grid-cols-[2fr_minmax(0,1fr)] gap-5 mb-5">
        {/* Order status breakdown */}
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
                <span className="text-2xl font-bold">{activePct}%</span>
                <span className="text-[11px] text-ink-3">active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Needs attention */}
        <div className="bg-surface rounded-2xl p-6 shadow-[var(--shadow-sm)]">
          <h3 className="font-bold mb-4">Needs Attention</h3>
          <div className="space-y-2.5">
            {isCentral && pending.length > 0 && (
              <AlertRow to="/staff/customers" tone="amber" icon={<UserPlus className="size-4" />}
                text={`${pending.length} customer${pending.length > 1 ? "s" : ""} awaiting approval`} />
            )}
            {isFinance && payments.length > 0 && (
              <AlertRow to="/staff/payments" tone="amber" icon={<CreditCard className="size-4" />}
                text={`${payments.length} payment${payments.length > 1 ? "s" : ""} to verify`} />
            )}
            {awaiting.length > 0 && (
              <AlertRow to="/staff/orders" tone="teal" icon={<ClipboardList className="size-4" />}
                text={`${awaiting.length} order${awaiting.length > 1 ? "s" : ""} awaiting payment`} />
            )}
            {(!pending.length && !payments.length && !awaiting.length) && (
              <div className="text-sm text-ink-4 py-6 text-center">All caught up — nothing needs attention.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h3 className="font-bold">Recent Orders</h3>
          <Link to="/staff/orders" className="text-xs text-primary font-semibold flex items-center gap-0.5">
            View all <ChevronRight className="size-3.5" />
          </Link>
        </div>
        {isLoading ? (
          <div className="p-5 pt-0"><SkeletonList rows={5} /></div>
        ) : orders.length === 0 ? (
          <div className="px-5 py-10 text-center text-ink-4">No orders yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink-4 border-b border-border">
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 8).map((o: any) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3.5">
                      <Link to={`/staff/orders/${o.id}`} className="font-mono font-semibold text-sm hover:text-primary">{o.order_number}</Link>
                    </td>
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

function Kpi({ featured, warn, label, value, icon }: { featured?: boolean; warn?: boolean; label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className={`rounded-2xl p-5 ${featured ? "bg-sidebar text-white" : "bg-surface shadow-[var(--shadow-sm)]"}`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[13px] font-medium ${featured ? "text-white/60" : "text-ink-3"}`}>{label}</span>
        <span className={`flex size-7 items-center justify-center rounded-lg ${featured ? "bg-white/10 text-accent" : warn ? "bg-amber-100 text-amber-600" : "bg-teal-50 text-primary"}`}>
          {icon}
        </span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
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
