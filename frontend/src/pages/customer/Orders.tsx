import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api";

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
  grn_pending:       "Confirm Receipt",
  grn_submitted:     "GRN Submitted",
  closed:            "Closed",
  cancelled:         "Cancelled",
};

export default function Orders() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.get("/orders").then(r => r.data),
    refetchInterval: 30_000,
  });

  return (
    <>
      <div className="page-header">
        <h1>My Orders</h1>
        <p>{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
      </div>

      {isLoading ? (
        <div className="loading-screen"><span className="spinner spinner-dark" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No orders yet</h3>
          <p>Browse our catalogue to place your first order.</p>
          <Link to="/catalog" className="btn btn-primary">Browse catalogue →</Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {orders.map((order: any) => (
            <Link
              to={`/orders/${order.id}`}
              key={order.id}
              className="list-item"
              style={{ display: "flex", textDecoration: "none" }}
            >
              <div className="list-item-icon">📋</div>
              <div className="list-item-body">
                <div className="list-item-title">{order.order_number}</div>
                <div className="list-item-sub" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span className={`badge ${STATUS_BADGE[order.status] || "badge-gray"}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                  <span>·</span>
                  <span>{new Date(order.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
                </div>
              </div>
              <div className="list-item-right">
                <div className="list-item-amount">${order.total_amount?.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>{order.items?.length} item{order.items?.length !== 1 ? "s" : ""}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
