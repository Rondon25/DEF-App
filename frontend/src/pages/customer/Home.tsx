import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { getCustomerUser } from "../../hooks/useAuth";
import { StatusPill } from "@/components/StatusPill";
import { SkeletonList } from "@/components/Skeleton";
import {
  ShoppingCart, Package, Activity, Wallet, CreditCard,
  ChevronRight, ArrowRight, ClipboardList,
} from "lucide-react";

export default function CustomerHome() {
  const customer = getCustomerUser();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.get("/orders").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const active = orders.filter((o: any) => !["closed", "cancelled"].includes(o.status));
  const totalSpent = orders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const firstName = customer?.name?.split(" ")[0] || "there";

  return (
    <>
      {/* Greeting */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-ink">Hi, {firstName}!</h1>
        <p className="text-sm text-ink-3">{customer?.company_name || "Welcome to Rohan Energy"}</p>
      </div>

      {/* Primary CTA */}
      <Link to="/catalog" className="block mb-5">
        <div className="rounded-2xl bg-sidebar text-white p-5 flex items-center justify-between shadow-[var(--shadow-sm)] active:scale-[0.99] transition-transform">
          <div>
            <div className="font-bold text-[17px]">Place an order</div>
            <div className="text-[13px] text-white/55 mt-0.5">Browse DEF products · order in minutes</div>
          </div>
          <div className="size-12 rounded-full bg-accent flex items-center justify-center text-sidebar shrink-0">
            <ShoppingCart className="size-5" />
          </div>
        </div>
      </Link>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <KpiTile icon={<Package className="size-4" />} label="Total Orders" value={orders.length} />
        <KpiTile icon={<Activity className="size-4" />} label="Active" value={active.length} accent />
        <KpiTile icon={<Wallet className="size-4" />} label="Total Spent" value={`$${totalSpent.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
        <KpiTile icon={<CreditCard className="size-4" />} label="Credit Account" value={customer?.is_credit_account ? "Yes" : "No"} />
      </div>

      {/* Recent orders */}
      <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="font-bold text-[15px]">Recent Orders</h3>
          <Link to="/orders" className="text-xs text-primary font-semibold flex items-center gap-0.5">
            View all <ChevronRight className="size-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-4 pt-0"><SkeletonList rows={3} /></div>
        ) : orders.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="size-14 rounded-full bg-canvas flex items-center justify-center mx-auto mb-3">
              <Package className="size-7 text-ink-4" />
            </div>
            <h3 className="font-bold mb-1">No orders yet</h3>
            <p className="text-sm text-ink-3 mb-4">Browse our catalogue and place your first order.</p>
            <Link to="/catalog">
              <span className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-primary text-white text-sm font-semibold">
                Browse catalogue <ArrowRight className="size-4" />
              </span>
            </Link>
          </div>
        ) : (
          orders.slice(0, 5).map((order: any) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-t-0 hover:bg-canvas transition-colors"
            >
              <div className="size-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                <ClipboardList className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm font-mono">{order.order_number}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusPill status={order.status} />
                  <span className="text-xs text-ink-4">
                    {new Date(order.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-sm">${order.total_amount?.toFixed(2)}</div>
              </div>
              <ChevronRight className="size-4 text-ink-4 shrink-0" />
            </Link>
          ))
        )}
      </div>
    </>
  );
}

function KpiTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-ink-3 font-medium">{label}</span>
        <span className={`flex size-7 items-center justify-center rounded-lg ${accent ? "bg-accent text-sidebar" : "bg-teal-50 text-primary"}`}>
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold text-ink">{value}</div>
    </div>
  );
}
