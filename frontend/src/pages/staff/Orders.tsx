import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { staffApi } from "../../api";
import { SkeletonList } from "../../components/Skeleton";
import ErrorScreen from "../../components/ErrorScreen";

const STATUS_BADGE: Record<string, string> = {
  submitted:         "badge-blue",
  verified:          "badge-blue",
  proforma_sent:     "badge-amber",
  payment_uploaded:  "badge-amber",
  payment_verified:  "badge-green",
  confirmed:         "badge-green",
  in_production:     "badge-purple",
  ready_for_dispatch:"badge-purple",
  shipped:           "badge-purple",
  delivered:         "badge-green",
  grn_pending:       "badge-amber",
  grn_submitted:     "badge-green",
  closed:            "badge-gray",
  cancelled:         "badge-gray",
};

const STATUS_LABEL: Record<string, string> = {
  submitted:         "Submitted",
  verified:          "Verified",
  proforma_sent:     "Invoice Sent",
  payment_uploaded:  "Payment Uploaded",
  payment_verified:  "Payment Verified",
  confirmed:         "Confirmed",
  in_production:     "In Production",
  ready_for_dispatch:"Ready to Ship",
  shipped:           "Shipped",
  delivered:         "Delivered",
  grn_pending:       "GRN Pending",
  grn_submitted:     "GRN Submitted",
  closed:            "Closed",
  cancelled:         "Cancelled",
};

const FILTERS = [
  { label: "All",      value: "" },
  { label: "New",      value: "submitted" },
  { label: "Payment",  value: "payment_uploaded" },
  { label: "Active",   value: "confirmed" },
  { label: "Shipped",  value: "shipped" },
  { label: "Closed",   value: "closed" },
];

export default function StaffOrders() {
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["staff-orders-all"],
    queryFn: () => staffApi.get("/staff/orders").then(r => r.data),
    refetchInterval: 20_000,
  });

  const filtered = useMemo(() => {
    let list = orders;
    if (filter) list = list.filter((o: any) => o.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o: any) =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.company_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q)
      );
    }
    return list;
  }, [orders, filter, search]);

  return (
    <>
      <div className="page-header">
        <h1>Orders</h1>
        <p>{filtered.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          className="input"
          placeholder="🔍  Search by order #, customer name, phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: "6px 14px", borderRadius: 99, whiteSpace: "nowrap",
              border: `2px solid ${filter === f.value ? "var(--blue)" : "var(--border)"}`,
              background: filter === f.value ? "var(--blue)" : "var(--surface)",
              color: filter === f.value ? "#fff" : "var(--ink-2)",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonList rows={6} />
      ) : isError ? (
        <ErrorScreen message="Could not load orders." retry={refetch} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No orders found</h3>
          <p>{search ? "Try a different search." : filter ? "No orders with this status." : "Orders will appear here."}</p>
          {search && (
            <button className="btn btn-secondary" onClick={() => setSearch("")}>Clear search</button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {filtered.map((order: any) => (
            <Link
              key={order.id}
              to={`/staff/orders/${order.id}`}
              className="list-item"
              style={{ display: "flex", textDecoration: "none" }}
            >
              <div className="list-item-icon">📋</div>
              <div className="list-item-body">
                <div className="list-item-title">{order.order_number}</div>
                <div className="list-item-sub" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span className={`badge ${STATUS_BADGE[order.status] || "badge-gray"}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                  <span>·</span>
                  <span>{order.customer_name}</span>
                  {order.company_name && <><span>·</span><span style={{ color: "var(--ink-4)" }}>{order.company_name}</span></>}
                </div>
              </div>
              <div className="list-item-right">
                <div className="list-item-amount">${order.total_amount?.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>
                  {new Date(order.created_at).toLocaleDateString("en-US", { dateStyle: "short" })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
