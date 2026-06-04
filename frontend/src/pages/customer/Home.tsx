import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { getCustomerUser } from "../../hooks/useAuth";

const STATUS_BADGE: Record<string, string> = {
  submitted:        "badge-blue",
  verified:         "badge-blue",
  proforma_sent:    "badge-amber",
  payment_uploaded: "badge-amber",
  payment_verified: "badge-green",
  confirmed:        "badge-green",
  in_production:    "badge-purple",
  ready_for_dispatch:"badge-purple",
  shipped:          "badge-purple",
  delivered:        "badge-green",
  grn_pending:      "badge-amber",
  grn_submitted:    "badge-green",
  closed:           "badge-gray",
  cancelled:        "badge-gray",
};

const STATUS_LABEL: Record<string, string> = {
  submitted:        "Submitted",
  verified:         "Verified",
  proforma_sent:    "Invoice Sent",
  payment_uploaded: "Payment Uploaded",
  payment_verified: "Payment Verified",
  confirmed:        "Confirmed",
  in_production:    "In Production",
  ready_for_dispatch:"Ready to Ship",
  shipped:          "Shipped",
  delivered:        "Delivered",
  grn_pending:      "Confirm Receipt",
  grn_submitted:    "GRN Submitted",
  closed:           "Closed",
  cancelled:        "Cancelled",
};

export default function CustomerHome() {
  const customer = getCustomerUser();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.get("/orders").then(r => r.data),
    refetchInterval: 30_000,
  });

  const active = orders.filter((o: any) => !["closed", "cancelled"].includes(o.status));

  return (
    <>
      <div className="page-header">
        <h1>👋 Hi, {customer?.name?.split(" ")[0]}!</h1>
        <p>{customer?.company_name || "Welcome to DEF Platform"}</p>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Orders</div>
          <div className="kpi-value">{orders.length}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{active.length}</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Spent</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>
            ${orders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Credit Account</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{customer?.is_credit_account ? "✓ Yes" : "No"}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <Link to="/catalog" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
          🛒 Place Order
        </Link>
        <Link to="/orders" className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }}>
          📦 My Orders
        </Link>
      </div>

      {/* Recent orders */}
      <div className="card">
        <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Recent Orders</h3>
          <Link to="/orders" style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600 }}>View all →</Link>
        </div>

        {isLoading ? (
          <div className="loading-screen"><span className="spinner spinner-dark" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No orders yet</h3>
            <p>Browse our catalogue and place your first order.</p>
            <Link to="/catalog" className="btn btn-primary">Browse catalogue →</Link>
          </div>
        ) : (
          orders.slice(0, 5).map((order: any) => (
            <Link to={`/orders/${order.id}`} key={order.id} className="list-item" style={{ display: "flex" }}>
              <div className="list-item-icon">📋</div>
              <div className="list-item-body">
                <div className="list-item-title">{order.order_number}</div>
                <div className="list-item-sub">
                  <span className={`badge ${STATUS_BADGE[order.status] || "badge-gray"}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                  {" · "}{new Date(order.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </div>
              </div>
              <div className="list-item-right">
                <div className="list-item-amount">${order.total_amount?.toFixed(2)}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
