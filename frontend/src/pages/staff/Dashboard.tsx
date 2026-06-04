import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { staffApi } from "../../api";
import { getStaffUser } from "../../hooks/useAuth";

export default function StaffDashboard() {
  const user = getStaffUser();

  const { data: orders = [] } = useQuery({
    queryKey: ["staff-orders"],
    queryFn: () => staffApi.get("/staff/orders").then(r => r.data),
    refetchInterval: 20_000,
  });

  const { data: pending = [] } = useQuery({
    queryKey: ["pending-customers"],
    queryFn: () => staffApi.get("/customers/pending").then(r => r.data),
    refetchInterval: 30_000,
    enabled: ["admin", "central_team"].includes(user?.role || ""),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["pending-payments"],
    queryFn: () => staffApi.get("/finance/payments").then(r => r.data),
    refetchInterval: 20_000,
    enabled: ["admin", "finance"].includes(user?.role || ""),
  });

  const kpis = {
    totalOrders:    orders.length,
    active:         orders.filter((o: any) => !["closed", "cancelled"].includes(o.status)).length,
    pendingCustomers: pending.length,
    pendingPayments:  payments.length,
    shipped:        orders.filter((o: any) => o.status === "shipped").length,
  };

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.name} · <span style={{ textTransform: "capitalize" }}>{user?.role?.replace("_", " ")}</span></p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Orders</div>
          <div className="kpi-value">{kpis.totalOrders}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active Orders</div>
          <div className="kpi-value">{kpis.active}</div>
        </div>
        {["admin", "central_team"].includes(user?.role || "") && (
          <div className={`kpi-card ${kpis.pendingCustomers > 0 ? "amber" : ""}`}>
            <div className="kpi-label">Pending Approval</div>
            <div className="kpi-value">{kpis.pendingCustomers}</div>
          </div>
        )}
        {["admin", "finance"].includes(user?.role || "") && (
          <div className={`kpi-card ${kpis.pendingPayments > 0 ? "amber" : ""}`}>
            <div className="kpi-label">Payments to Verify</div>
            <div className="kpi-value">{kpis.pendingPayments}</div>
          </div>
        )}
        <div className="kpi-card purple">
          <div className="kpi-label">In Transit</div>
          <div className="kpi-value">{kpis.shipped}</div>
        </div>
      </div>

      {/* Alerts */}
      {kpis.pendingCustomers > 0 && (
        <div className="alert alert-warn" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⏳ {kpis.pendingCustomers} customer{kpis.pendingCustomers > 1 ? "s" : ""} awaiting approval</span>
          <Link to="/staff/customers" className="btn btn-sm btn-secondary">Review →</Link>
        </div>
      )}
      {kpis.pendingPayments > 0 && (
        <div className="alert alert-warn" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>💳 {kpis.pendingPayments} payment{kpis.pendingPayments > 1 ? "s" : ""} awaiting verification</span>
          <Link to="/staff/payments" className="btn btn-sm btn-secondary">Review →</Link>
        </div>
      )}

      {/* Recent orders */}
      <div className="card">
        <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Recent Orders</h3>
          <Link to="/staff/orders" style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600 }}>View all →</Link>
        </div>
        {orders.slice(0, 8).map((order: any) => (
          <Link to={`/staff/orders/${order.id}`} key={order.id} className="list-item" style={{ display: "flex" }}>
            <div className="list-item-icon">📋</div>
            <div className="list-item-body">
              <div className="list-item-title">{order.order_number}</div>
              <div className="list-item-sub">{order.customer_name} · {order.status.replace(/_/g, " ")}</div>
            </div>
            <div className="list-item-right">
              <div className="list-item-amount">${order.total_amount?.toFixed(2)}</div>
            </div>
          </Link>
        ))}
        {orders.length === 0 && (
          <div className="empty-state"><div className="empty-icon">📋</div><p>No orders yet</p></div>
        )}
      </div>
    </>
  );
}
