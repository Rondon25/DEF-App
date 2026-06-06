import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { SkeletonList } from "@/components/Skeleton";
import ErrorScreen from "@/components/ErrorScreen";
import { StatusPill } from "@/components/StatusPill";
import { Package, ClipboardList, ChevronRight, ArrowRight } from "lucide-react";

export default function Orders() {
  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.get("/orders").then((r) => r.data),
    refetchInterval: 30_000,
  });

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-ink">My Orders</h1>
        <p className="text-sm text-ink-3">{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
      </div>

      {isLoading ? (
        <SkeletonList rows={5} />
      ) : isError ? (
        <ErrorScreen message="Could not load orders." retry={refetch} />
      ) : orders.length === 0 ? (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] px-4 py-12 text-center">
          <div className="size-14 rounded-full bg-canvas flex items-center justify-center mx-auto mb-3">
            <Package className="size-7 text-ink-4" />
          </div>
          <h3 className="font-bold mb-1">No orders yet</h3>
          <p className="text-sm text-ink-3 mb-4">Browse our catalogue to place your first order.</p>
          <Link to="/catalog">
            <span className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-primary text-white text-sm font-semibold">
              Browse catalogue <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl shadow-[var(--shadow-sm)] overflow-hidden">
          {orders.map((order: any) => (
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
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <StatusPill status={order.status} />
                  <span className="text-xs text-ink-4">
                    {new Date(order.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-sm">₹{order.total_amount?.toFixed(2)}</div>
                <div className="text-[11px] text-ink-4 mt-0.5">{order.items?.length} item{order.items?.length !== 1 ? "s" : ""}</div>
              </div>
              <ChevronRight className="size-4 text-ink-4 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
